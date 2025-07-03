import { RequestHandler } from 'express'


const handler: RequestHandler = async (req, res, next) => {
  const { user } = res.locals
  await user.update({
    liquidation: null
  })
  res.json(user)
}

export default handler
