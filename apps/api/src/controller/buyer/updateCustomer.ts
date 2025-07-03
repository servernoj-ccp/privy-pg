import { RequestHandler } from 'express'
import { BuyerMetadata } from './'
import { FailedDependencyError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  const { stripeClient, buyer } = res.locals
  const { customer_id } = buyer.customMetadata as BuyerMetadata ?? {}
  const { name, address } = res.locals.parsed.body
  try {
    const customer = await stripeClient.customers.update(customer_id!, {
      shipping: {
        address,
        name
      }
    })
    res.json(customer)
  } catch (e) {
    throw new FailedDependencyError(e as Error)
  }
}

export default handler
