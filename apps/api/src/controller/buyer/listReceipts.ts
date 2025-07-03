import { Installment, InstallmentAttr, Receipt, ReceiptAttr, Refund, RefundAttr, User } from '@/db/models'
import { RequestHandler } from 'express'
import { getAbi, tscAddresses } from '@/smart-contracts'
import { createPublicClient, getContract, http } from 'viem'
import { supportedChains } from '@/config'


type EnchancedReceipt = ReceiptAttr & {
  installments: Array<InstallmentAttr & {
    refund: RefundAttr | null
  }>
}

type ExternalURI = {
  href: string,
  text: string
} | null

const getExplorerLink = (baseUrl: string, type: 'tx' | 'address' | 'block', value: string) => `${baseUrl}/${type}/${value}`
const explorerUrlByChainId = Object.fromEntries(
  supportedChains.map(
    chain => [
      chain.id,
      (value: string) => ({
        text: value,
        href: getExplorerLink(chain.blockExplorers.default.url, 'tx', value)
      })
    ]
  )
)

const nftConfigByChainId = Object.fromEntries(
  await Promise.all(
    supportedChains.map(
      async chain => {
        const publicClient = createPublicClient({
          chain,
          transport: http()
        })
        const tsc = await getContract({
          address: tscAddresses[chain.id],
          abi: await getAbi('tsc'),
          client: publicClient
        })
        return [
          chain.id,
          {
            address: await tsc.read.nftContract(),
            name: chain.name.toLowerCase()
          }
        ]
      }
    )
  )
)

const receiptProcessor = async (r: EnchancedReceipt) => {
  const URIs = {} as Record<string, ExternalURI>
  if (r.nft_id && (r.chain_id in nftConfigByChainId)) {
    const { address, name } = nftConfigByChainId[r.chain_id]
    URIs.nft = {
      text: `${r.nft_id}`,
      href: `https://rarible.com/token/${name}/${address}:${r.nft_id}?tab=properties`
    }
  } else {
    URIs.nft = null
  }
  if (r.chain_id in explorerUrlByChainId) {
    URIs.pledge = r.pledge_tx_hash ? explorerUrlByChainId[r.chain_id](r.pledge_tx_hash) : null
    URIs.refund = r.refund_tx_hash ? explorerUrlByChainId[r.chain_id](r.refund_tx_hash) : null
    r.installments.forEach(
      (i) => {
        const URIs = {} as Record<string, ExternalURI>
        URIs.confirm = i.confirm_tx_hash ? explorerUrlByChainId[r.chain_id](i.confirm_tx_hash) : null
        Object.assign(i, { URIs })
      }
    )
  }
  Object.assign(r, { URIs })
  return r
}

const handler: RequestHandler = async (req, res) => {
  const { buyer } = res.locals
  const receipts = await Receipt.findAll({
    where: {
      buyer_id: buyer.id
    },
    include: [
      {
        model: User,
        as: 'seller',
        attributes: ['email']
      },
      {
        model: Installment,
        as: 'installments',
        include: [
          {
            model: Refund,
            as: 'refund'
          }
        ]
      }
    ]
  })

  const enhancedReceipts = await Promise.all(
    receipts.map(
      r => receiptProcessor(r.toJSON())
    )
  )
  res.json(enhancedReceipts)
}

export default handler
