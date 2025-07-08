import { User } from '@/db/models'
import type { RequestHandler } from 'express'
import { FailedDependencyError, InternalServerError, isHttpError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  try {
    const { email } = res.locals.parsed.body
    const { privyClient } = res.locals
    try {
      // -- Privy
      let privyUser = await privyClient.getUserByEmail(email)
      if (!privyUser) {
        console.log('Creating Privy user')
        privyUser = await privyClient.importUser({
          createEthereumWallet: false,
          linkedAccounts: [{
            address: email,
            type: 'email'
          }]
        })
      }
      await privyClient.setCustomMetadata(privyUser.id, {
        ...(
          privyUser.customMetadata ?? {}
        ),
        isSeller: true
      })
      const [user, created] = await User.findOrCreate({
        where: {
          email
        },
        defaults: {
          email,
          privy_id: privyUser.id,
          roles: ['seller']
        }
      })
      if (!created && privyUser.customMetadata.isBuyer) {
        await user.update({
          roles: ['buyer', 'seller']
        })
      }
      res.json(user)
    } catch (e) {
      console.log(e)
      throw new FailedDependencyError('Unable to create sub-account(s)', e as Error)
    }
  } catch (error) {
    if (isHttpError(error)) {
      next(error)
    } else {
      next(new InternalServerError(error as Error))
    }
  }
}

export default handler
