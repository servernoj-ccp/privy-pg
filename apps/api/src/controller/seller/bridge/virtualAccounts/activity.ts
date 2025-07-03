import { RequestHandler } from 'express'
import type { ListResponse, BridgeVirtualAccountActivity } from '@/@types/bridge'

const handler: RequestHandler = async (req, res) => {
  const { user, bridgeClient } = res.locals
  const { id } = res.locals.parsed.params
  const { type } = res.locals.parsed.query
  const activity = await bridgeClient
    .get<ListResponse<BridgeVirtualAccountActivity>>(`/customers/${user.bridge_id!}/virtual_accounts/${id}/history`)
    .then(
      ({ data }) => data
    )
  const filteredActivity = type
    ? activity.filter(
      a => a.type === type
    )
    : activity
  res.json(filteredActivity)
}

export default handler
