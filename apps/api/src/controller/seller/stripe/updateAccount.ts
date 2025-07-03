import { RequestHandler } from 'express'
import { InternalServerError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  try {
    const { stripeClient, user } = res.locals
    const account = await stripeClient.accounts.update(user.stripe_id!, res.locals.parsed.body)
    res.json(account)
  } catch (e) {
    const { message } = e as Error
    next(
      new InternalServerError(message)
    )
  }
}

export default handler
