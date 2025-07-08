import { RequestHandler } from 'express'
import { UnauthorizedError, ForbiddenError } from 'http-errors-enhanced'

type HandlerFactory<T = any> = (args: T) => RequestHandler

const handlerFactory: HandlerFactory<Array<'seller' | 'buyer'>> = (roles) => async (req, res, next) => {
  try {
    const { privyUser } = res.locals
    if (!privyUser) {
      throw new UnauthorizedError('User not authenticated')
    }
    const isAuthorized = roles.every(
      role => {
        switch (role) {
          case 'buyer': return privyUser.customMetadata?.isBuyer
          case 'seller': return privyUser.customMetadata?.isSeller
        }
      }
    )
    if (!isAuthorized) {
      throw new ForbiddenError('User not authorized')
    }
    next()
  } catch (error) {
    next(new UnauthorizedError(error as Error))
  }
}

export default handlerFactory
