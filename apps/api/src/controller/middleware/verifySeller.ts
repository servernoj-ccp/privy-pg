import { User } from '@/db/models'
import { RequestHandler } from 'express'
import { UnauthorizedError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  try {
    const { privySellerClient } = res.locals
    const idTokenOptions = req.headers.cookie?.split(/\s*;\s*/).filter(
      c => c.split(/=/)?.[0] === 'privy-id-token'
    ).map(
      c => c.split(/=/)?.[1]
    ) as Array<string>
    let seller
    for (const idToken of idTokenOptions) {
      try {
        seller = await privySellerClient.getUser({ idToken })
        break
      } catch {
        continue
      }
    }
    if (!seller) {
      throw new Error('Unable to retrieve user object')
    }
    const user = await User.findOne({
      where: {
        privy_id: seller.id
      }
    })
    if (!user) {
      throw new Error('User not found')
    }
    res.locals.user = user!
    res.locals.seller = seller!
    next()
  } catch (error) {
    next(new UnauthorizedError(error as Error))
  }
}

export default handler
