import { RequestHandler } from 'express'
import { FailedDependencyError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  const { stripeClient, user } = res.locals
  try {
    const accountSession = await stripeClient.accountSessions.create({
      account: user.stripe_id!,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: false
          }
        }
      }
    })
    res.json({
      clientSecret: accountSession.client_secret
    })
  } catch (e) {
    next(
      new FailedDependencyError('Unable to initialize onboarding session', e as Error)
    )
  }
}

export default handler
