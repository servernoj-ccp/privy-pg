import { RequestHandler } from 'express'
import { UnauthorizedError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  try {
    const { privyBuyerClient } = res.locals
    const idTokenOptions = req.headers.cookie?.split(/\s*;\s*/).filter(
      c => c.split(/=/)?.[0] === 'privy-id-token'
    ).map(
      c => c.split(/=/)?.[1]
    ) as Array<string>
    let buyer
    for (const idToken of idTokenOptions) {
      try {
        buyer = await privyBuyerClient.getUser({ idToken })
        break
      } catch {
        continue
      }
    }
    if (!buyer) {
      throw new Error('Unable to retrieve user object')
    }
    res.locals.buyer = buyer!
    next()
  } catch (error) {
    next(new UnauthorizedError(error as Error))
  }
}

export default handler
