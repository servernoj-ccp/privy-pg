import { User } from '@/db/models'
import type { RequestHandler } from 'express'
import { FailedDependencyError, InternalServerError, isHttpError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  try {
    const { email } = res.locals.parsed.body
    let user = await User.findOne({
      where: {
        email
      }
    })
    if (user) {
      await user.destroy()
    }
    try {
      // -- Privy
      let privyUser = await res.locals.privyClient.getUserByEmail(email)
      if (!privyUser) {
        console.log('Creating Privy user')
        privyUser = await res.locals.privySellerClient.importUser({
          createEthereumWallet: false,
          linkedAccounts: [{
            address: email,
            type: 'email'
          }],
          customMetadata: {
            role: 'seller'
          }
        })
      }
      user = await User.create({
        email,
        privy_id: privyUser.id,
        roles: ['seller']
      })
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
