import express, { RequestHandler } from 'express'
import { verifyBuyer, validator } from '@/controller/middleware'
import { z } from 'zod'
import createIntent from './createIntent'
import updateCustomer from './updateCustomer'
import listReceipts from './listReceipts'
import requestRefund from './requestRefund'
import createPortalSession from './createPortalSession'

type BuyerMetadata = {
  customer_id?: string
  intent_id?: string
}

const DEFAULT_INSTALLMENT_INTERVAL = 1 * 60 * 1000

const router = express.Router()

const getProfile: RequestHandler = async (req, res) => {
  const { buyer } = res.locals
  res.json({ buyer })
}

const initBuyer: RequestHandler = async (req, res) => {
  const { stripeClient, privyBuyerClient, buyer } = res.locals
  const { customer_id } = buyer.customMetadata as BuyerMetadata ?? {}
  if (!customer_id) {
    const customer = await stripeClient.customers.create({
      metadata: {
        buyer_id: buyer.id
      }
    })
    await privyBuyerClient.setCustomMetadata<BuyerMetadata>(buyer.id, {
      customer_id: customer.id
    })
  }
  res.sendStatus(200)
}

const resetBuyerMetadata: RequestHandler = async (req, res) => {
  const { privyBuyerClient, buyer } = res.locals
  await privyBuyerClient.setCustomMetadata<BuyerMetadata>(buyer.id, {})
  res.sendStatus(200)
}

router.use(verifyBuyer)

router.get('/', getProfile)

router.post('/', initBuyer)

router.delete('/', resetBuyerMetadata)

router.get('/receipts', listReceipts)

router.post(
  '/create-portal-session',
  createPortalSession
)

router.patch(
  '/customer',
  validator({
    body: z.object({
      name: z.string(),
      address: z.object({
        line1: z.string(),
        line2: z.string().nullable(),
        city: z.string(),
        state: z.string(),
        postal_code: z.string(),
        country: z.string()
      }).partial()
    }).partial()
  }),
  updateCustomer
)

router.post(
  '/create-intent',
  validator({
    body: z.object({
      installments: z.number().int().min(1).max(10).default(1).describe('number of installments, defaults to 1'),
      interval: z.number().int().min(60 * 1000).default(DEFAULT_INSTALLMENT_INTERVAL).describe('installment interval in ms'),
      email: z.string().email().describe('seller\'s email'),
      amount: z.number().positive().describe('overall amount in USD')
    })
  }),
  createIntent
)

router.post(
  '/request-refund',
  validator({
    body: z.object({
      receipt_id: z.string().uuid()
    })
  }),
  requestRefund
)


export default router

export type {
  BuyerMetadata
}
