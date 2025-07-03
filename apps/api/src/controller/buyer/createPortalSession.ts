import { RequestHandler } from 'express'
import { BuyerMetadata } from './'
import { InternalServerError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  const { stripeClient, buyer } = res.locals
  const { customer_id } = buyer.customMetadata as BuyerMetadata ?? {}
  if (!customer_id) {
    throw new InternalServerError('Misconfigured account')
  }
  const { url } = await stripeClient.billingPortal.sessions.create({
    customer: customer_id!,
    configuration: process.env.STRIPE_BILLING_PORTAL_CONFIG
  })
  res.json({ url })
}

export default handler
