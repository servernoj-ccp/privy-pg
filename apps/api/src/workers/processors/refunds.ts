import { Processor } from 'bullmq'
import { getQueueByName, JobError, NamedJob, printJobStatus } from '@/workers'
import { stripeClient } from '@/clients'
import { catcher, catcherWithContext, sleep } from '@/utils'
import Stripe from 'stripe'
import { Installment, Receipt, Refund, User } from '@/db/models'

const handler = async (job: NamedJob<'refunds'>) => {
  printJobStatus(job, 'started')
  try {
    switch (job.name) {
      case 'processSucceededPaymentIntent': {
        const { payment_intent_id } = job.data
        const paymentIntent = await stripeClient.paymentIntents.retrieve(payment_intent_id).catch(catcher)
        if (!paymentIntent) {
          throw new JobError(`invalid payment_intent_id ${payment_intent_id}`, true)
        }
        let available_on
        for (let delay = 200, combinedDelay = 0; combinedDelay < 10_000; delay *= 2) {
          const { balance_transaction } = await stripeClient.charges
            .retrieve(paymentIntent.latest_charge as string, { expand: ['balance_transaction'] }) as Stripe.Charge
          available_on = (balance_transaction as Stripe.BalanceTransaction)?.available_on ?? null
          if (available_on) {
            break
          }
          await sleep(delay)
          combinedDelay += delay
          console.log('Waiting for data...')
        }
        if (available_on) {
          const safeAvailableOn = (available_on + 24 * 3600) * 1000
          const delay = Math.max(0,  safeAvailableOn - Date.now())
          await getQueueByName('refunds').add('processAvailableRecoupment', {
            receipt_id: paymentIntent.metadata.receipt_id
          }, {
            delay
          })
        } else {
          throw new JobError('Unable to identify recoupment funds availability', true)
        }
        break
      }
      case 'processAvailableRecoupment': {
        const { receipt_id } = job.data
        const receipt = await Receipt.findByPk(receipt_id, {
          include: [
            {
              model: User,
              as: 'seller'
            },
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
        }) as Receipt & {
          seller: User,
          installments: Array<Installment & {
            refund: Refund | null
          }>
        }
        if (!receipt) {
          throw new JobError(`Invalid receipt_id ${receipt_id}`, true)
        }
        for (const installment of receipt.installments) {
          if (installment.payment_intent_id) {
            // -- taxes reversal
            if (installment.tax_transfer_id) {
              try {
                const transfer = await stripeClient.transfers.retrieve(
                  installment.tax_transfer_id, { }, {
                    stripeAccount: receipt.seller.stripe_id!
                  }
                )
                if (!transfer.reversed) {
                  await stripeClient.transfers.createReversal(installment.tax_transfer_id, {}, {
                    stripeAccount: receipt.seller.stripe_id!
                  })
                }
              } catch (e) {
                throw new JobError(e as Error, true)
              }
            }
            if (installment.tax_transaction_id) {
              try {
                await stripeClient.tax.transactions.createReversal({
                  original_transaction: installment.tax_transaction_id,
                  mode: 'full',
                  reference: `receipt(${receipt_id}),installment(${installment.id},tax_transaction(${installment.tax_transaction_id}))`
                })
              } catch (e) {
                throw new JobError(e as Error, true)
              }
            }

            // -- refund request
            const refund = await stripeClient.refunds.create({
              payment_intent: installment.payment_intent_id!,
              metadata: {
                installment_id: installment.id
              }
            })
            if (installment.refund) {
              await installment.refund.update({
                status: 'funded',
                stripe_refund_id: refund.id
              })
            }
          }
        }
        break
      }
      case 'processChargeRefunded': {
        const { charge_id } = job.data
        const charge = await stripeClient.charges
          .retrieve(charge_id, { expand: ['refunds'] })
          .catch(
            catcherWithContext('retrieve charge by id', { charge_id })
          )
        if (!charge || !charge.refunded || !charge.refunds) {
          throw new JobError(`Invalid charge_id ${charge_id}`, true)
        }
        const [stripeRefund] = charge.refunds.data
        if (!stripeRefund || !stripeRefund.balance_transaction) {
          throw new JobError('Unable to retrieve a valid refund object from charge', true)
        }
        const balanceTransaction = await stripeClient.balanceTransactions
          .retrieve(stripeRefund.balance_transaction as string)
          .catch(
            catcherWithContext('retrieve balance transaction', { stripeRefund })
          )
        if (!balanceTransaction) {
          throw new JobError(`Invalid balance_transaction ${stripeRefund.balance_transaction}`)
        }
        const creditCartProcessingInSeconds = 3 * 24 * 3600
        const available_on = new Date((balanceTransaction.created + creditCartProcessingInSeconds) * 1000)
        const installment = await Installment.findOne({
          where: {
            payment_intent_id: charge.payment_intent as string
          },
          include: [
            {
              model: Refund,
              as: 'refund'
            }
          ]
        }) as Installment & {refund: Refund}
        if (!installment?.refund || installment?.refund.stripe_refund_id !== stripeRefund.id) {
          throw new JobError(`Invalid payment_intent (unable to locate matching installment) ${charge.payment_intent}`)
        }
        await installment.refund.update({
          available_on,
          status: 'done'
        })
        await getQueueByName('TSC').add('refund', {
          installment_id: installment.id
        })
        break
      }
    }
    printJobStatus(job, 'succeeded')
  } catch (e) {
    const error = e as JobError
    if (error?.isCritical) {
      printJobStatus(job, 'failed', error.message)
      throw error
    } else {
      printJobStatus(job, 'errored', error.message)
    }
  }
}

export default handler as Processor
