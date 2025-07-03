import { privySellerClient, privyBuyerClient, bridgeClient, stripeClient } from '@/clients'
import { RequestHandler } from 'express'

const handler: RequestHandler = (req, res, next) => {
  res.locals.privySellerClient = privySellerClient
  res.locals.privyBuyerClient = privyBuyerClient
  res.locals.bridgeClient = bridgeClient
  res.locals.stripeClient = stripeClient
  next()
}

export default handler
