import { RequestHandler } from 'express'

const handler: RequestHandler = async (req, res) => {
  const { bridgeClient } = res.locals
  const { public_token, link_token } = res.locals.parsed.body
  await bridgeClient.post(
    `/plaid_exchange_public_token/${link_token}`,
    {
      public_token
    }
  )
  res.sendStatus(200)
}

export default handler
