import { Processor } from 'bullmq'
import { JobError, printJobStatus, NamedJob } from '@/workers'
import { Installment, Receipt, Refund, User } from '@/db/models'
import { bridge, chain } from '@/config'
import { createPublicClient, decodeErrorResult, decodeEventLog, getContract, http, parseUnits } from 'viem'
import { getAbi, getEventSignatures, getSmartAccountClient, getTransactionReceipt, tscAddresses } from '@/smart-contracts'
import { Op } from 'sequelize'


const handler = async (job: NamedJob<'TSC'>) => {
  printJobStatus(job, 'started')
  const publicClient = createPublicClient({
    chain,
    transport: http()
  })
  const bundlerClient = await getSmartAccountClient({ chain })
  const tsc = await getContract({
    address: tscAddresses[chain.id],
    abi: await getAbi('tsc'),
    client: {
      public: publicClient,
      wallet: bundlerClient
    }
  })
  const nftAddress = await tsc.read.nftContract() as `0x${string}`
  const eventSignatures = {
    [tsc.address.toLowerCase()]: await getEventSignatures('tsc'),
    [nftAddress.toLowerCase()]: await getEventSignatures('nft')
  }
  try {
    switch (job.name) {
      case 'pledge': {
        const { user_id, receipt_id, buyer_wallet_address, amount } = job.data
        const user = await User.findByPk(user_id)
        if (!user) {
          throw new JobError(`invalid user_id ${user_id}`, true)
        }
        const receipt = await Receipt.findByPk(receipt_id)
        if (!receipt) {
          throw new JobError(`invalid receipt_id ${receipt_id}`, true)
        }
        let payeeAddress
        if (
          user?.liquidation?.payment_rail === bridge.payment_rail &&
          user?.liquidation?.to_address
        ) {
          payeeAddress = user.liquidation.to_address
        }
        if (!payeeAddress) {
          throw new JobError(`invalid liquidation config for user ${user_id}`, true)
        }
        const parsedAmount = parseUnits(
          `${amount}`,
          await tsc.read.decimals() as number
        )
        let hash
        try {
          hash = await tsc.write.pledge([
            payeeAddress,
            buyer_wallet_address,
            receipt_id,
            parsedAmount
          ])
        } catch (e) {
          throw new JobError(e as Error, true)
        }
        const transactionReceipt = await getTransactionReceipt({ publicClient, hash })
        if (!transactionReceipt) {
          throw new JobError(`Unable to fetch transaction receipt for hash '${hash}'`)
        }
        await receipt.update({
          pledge_tx_hash: hash
        })
        await job.log(hash)
        break
      }
      case 'confirm': {
        const { installment_id } = job.data
        const installment = await Installment.findByPk(installment_id, {
          include: [
            {
              model: Receipt,
              as: 'receipt',
              include: [
                {
                  model: Installment,
                  as: 'installments',
                  where: {
                    status: {
                      [Op.ne]: 'canceled'
                    }
                  }
                }
              ]
            }
          ]
        }) as Installment & {
          receipt: Receipt & {
            installments: Array<Installment>
          }
        }
        if (!installment) {
          throw new JobError(`invalid installment_id ${installment_id}`, true)
        }

        const parsedAmount = parseUnits(
          `${installment.net}`,
          await tsc.read.decimals() as number
        )
        let hash
        try {
          hash = await tsc.write.confirm([
            installment.receipt_id,
            parsedAmount
          ])
        } catch (e) {
          throw new JobError(e as Error, true)
        }
        const transactionReceipt = await getTransactionReceipt({ publicClient, hash })
        if (!transactionReceipt) {
          throw new JobError(`Unable to fetch transaction receipt for hash '${hash}'`)
        }
        await installment.update({
          confirm_tx_hash: hash
        })
        let tokenId
        transactionReceipt.logs.forEach(
          (log, idx) => {
            const eventABI = eventSignatures?.[log.address]?.[log.topics[0] as string]
            if (eventABI?.name === 'Minted') {
              try {
                const decoded = decodeEventLog({
                  abi: [eventABI],
                  data: log.data,
                  topics: log.topics
                })
                if (eventABI.name === 'Minted') {
                  tokenId = (decoded.args as any)?.tokenId ?? null
                }
              } catch (e) {
                console.error({ idx, log, e })
              }
            }
          }
        )
        const allPaid = installment.receipt.installments.every(
          ({ status }) => status === 'paid-out'
        )
        if (allPaid) {
          installment.receipt.set({
            withdraw_status: 'available'
          })
        }
        if (tokenId) {
          installment.receipt.set({
            nft_id: tokenId
          })
        }
        if (installment.receipt.changed()) {
          await installment.receipt.save()
        }
        await job.log(hash)
        break
      }
      case 'withdraw': {
        const { receipt_id } = job.data
        const receipt = await Receipt.findByPk(receipt_id)
        if (!receipt) {
          throw new JobError(`invalid receipt_id ${receipt_id}`, true)
        }
        let hash
        try {
          hash = await tsc.write.withdraw([
            receipt_id
          ])
        } catch (e) {
          await receipt.update({
            withdraw_status: 'failed'
          })
          throw new JobError(e as Error, true)
        }
        const transactionReceipt = await getTransactionReceipt({ publicClient, hash })
        if (!transactionReceipt) {
          throw new JobError(`Unable to fetch transaction receipt for hash '${hash}'`)
        }
        await receipt.update({
          withdraw_tx_hash: hash,
          withdraw_status: 'done'
        })
        await job.log(hash)
        break
      }
      case 'refund': {
        const { installment_id } = job.data
        const installment = await Installment.findByPk(installment_id, {
          include: [
            {
              model: Receipt,
              as: 'receipt',
              include: [
                {
                  model: Installment,
                  as: 'installments',
                  include: [
                    {
                      model: Refund,
                      as: 'refund',
                      required: true
                    }
                  ]
                }
              ]
            }
          ]
        }) as Installment & {
          receipt: Receipt & {
            installments: Array<Installment & {
              refund: Refund
            }>
          }
        }
        const allRefunded = installment.receipt.installments.every(
          ({ refund }) => refund.status === 'done'
        )
        if (allRefunded) {
          let hash
          try {
            hash = await tsc.write.refund([
              installment.receipt_id
            ])
          } catch (e) {
            await installment.receipt.update({
              refund_status: 'failed'
            })
            throw new JobError(e as Error, true)
          }
          const transactionReceipt = await getTransactionReceipt({ publicClient, hash })
          if (!transactionReceipt) {
            throw new JobError(`Unable to fetch transaction receipt for hash '${hash}'`)
          }
          const available_on  = Math.max(
            ...installment.receipt.installments.map(
              ({ refund }) => refund.available_on.valueOf()
            )
          )
          await installment.receipt.update({
            refund_status: 'done',
            refund_available_on: new Date(available_on),
            nft_id: null
          })
          await installment.receipt.update({
            refund_tx_hash: hash
          })
          await job.log(hash)
        } else {
          await job.log('Not all refunds are processed')
        }

        break
      }
    }
    printJobStatus(job, 'succeeded')
  } catch (e) {
    const errorData = (e as {details: string})?.details?.match(/(?<code>0x08c379a0[0-9a-f]+)$/i)?.groups?.code
    let error = e as JobError
    if (errorData) {
      const decoded = decodeErrorResult({
        abi: [
          {
            name: 'Error',
            type: 'error',
            inputs: [{ name: 'message', type: 'string' }]
          }
        ],
        data: errorData as `0x${string}`
      })
      const message = decoded.args.toString()
      error = new JobError(message, error.isCritical, error)
    }
    printJobStatus(job, 'failed', error.message)
    if (error?.isCritical) {
      throw error
    }
  }
}

export default handler as Processor
