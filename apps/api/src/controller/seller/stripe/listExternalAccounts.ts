import { RequestHandler } from 'express'
import { FailedDependencyError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  try {
    const { stripeClient, user } = res.locals
    const externalAccounts = await stripeClient.accounts
      .listExternalAccounts(user.stripe_id!, { object: 'bank_account' })
      .autoPagingToArray({ limit: 100 })
    res.json(externalAccounts)
  } catch (e) {
    const { message } = e as Error
    next(
      new FailedDependencyError(message)
    )
  }
}

export default handler
