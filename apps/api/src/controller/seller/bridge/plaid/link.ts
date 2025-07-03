import { RequestHandler } from 'express'

const handler: RequestHandler = async (req, res) => {
  const { user, bridgeClient } = res.locals
  const link = await bridgeClient.post(`/customers/${user.bridge_id!}/plaid_link_requests`)
  res.json(link)
}

export default handler
