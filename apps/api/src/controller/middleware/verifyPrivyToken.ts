import { RequestHandler } from 'express'
import { UnauthorizedError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  try {
    const { privyClient } = res.locals
    const idTokenOptions = req.headers.cookie?.split(/\s*;\s*/).filter(
      c => c.split(/=/)?.[0] === 'privy-id-token'
    ).map(
      c => c.split(/=/)?.[1]
    ) as Array<string>
    let privyUser
    for (const idToken of idTokenOptions) {
      try {
        privyUser = await privyClient.getUser({ idToken })
        break
      } catch {
        continue
      }
    }
    if (!privyUser) {
      throw new Error('Unable to recognize Privy user')
    }
    res.locals.privyUser = privyUser!
    next()
  } catch (error) {
    next(new UnauthorizedError(error as Error))
  }
}

export default handler
