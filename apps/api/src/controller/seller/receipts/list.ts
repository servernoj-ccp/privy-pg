import { stripeClient } from '@/clients'
import { supportedChains } from '@/config'
import { Installment, InstallmentAttr, Receipt, ReceiptAttr, Refund, RefundAttr } from '@/db/models'
import { catcher } from '@/utils'
import { RequestHandler } from 'express'
import Stripe from 'stripe'

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

const receiptProcessor = async (r: EnchancedReceipt) => {
  const URIs = {} as Record<string, ExternalURI>
  if (r.chain_id in explorerUrlByChainId) {
    URIs.pledge = r.pledge_tx_hash ? explorerUrlByChainId[r.chain_id](r.pledge_tx_hash) : null
    URIs.refund = r.refund_tx_hash ? explorerUrlByChainId[r.chain_id](r.refund_tx_hash) : null
    URIs.withdraw = r.withdraw_tx_hash ? explorerUrlByChainId[r.chain_id](r.withdraw_tx_hash) : null
  }
  const customer = await stripeClient.customers.retrieve(r.customer_id).catch(catcher)
  Object.assign(r, {
    buyer_email: (customer as Stripe.Customer)?.email ?? null,
    URIs
  })
  return r
}

const handler: RequestHandler = async (req, res) => {
  const { user } = res.locals
  const receipts = await Receipt.findAll({
    where: {
      user_id: user.id
    },
    include: [
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
