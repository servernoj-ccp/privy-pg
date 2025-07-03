import { RequestHandler } from 'express'
import { FailedDependencyError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  try {
    const { stripeClient } = res.locals
    const { id } = res.locals.parsed.params
    const paymentMethod = await stripeClient.paymentMethods.retrieve(id)
    res.json(paymentMethod)
  } catch (e) {
    const { message } = e as Error
    next(
      new FailedDependencyError(message)
    )
  }
}

export default handler
