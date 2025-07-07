import { privyClient } from '@/clients'
import { RequestHandler } from 'express'

const handler: RequestHandler = (req, res, next) => {
  res.locals.privyClient = privyClient
  next()
}

export default handler
