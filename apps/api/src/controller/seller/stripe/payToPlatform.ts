import { RequestHandler } from 'express'
import { FailedDependencyError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  try {
    const { stripeClient, user } = res.locals
    const { amount } = res.locals.parsed.body
    const charge = await stripeClient.charges.create({
      amount: Math.floor(amount * 100),
      currency: 'usd',
      source: user.stripe_id!
    })
    res.json(charge)
  } catch (e) {
    const { message } = e as Error
    next(
      new FailedDependencyError(message)
    )
  }
}

export default handler
