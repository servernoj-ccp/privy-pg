import { RequestHandler } from 'express'
import { FailedDependencyError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  try {
    const { stripeClient, user } = res.locals
    const stripeAccount = await stripeClient.accounts.retrieve(user.stripe_id!)
    res.json(stripeAccount)
  } catch (e) {
    const { message } = e as Error
    next(
      new FailedDependencyError(message)
    )
  }
}

export default handler
