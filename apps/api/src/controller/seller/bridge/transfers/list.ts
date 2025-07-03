import { RequestHandler } from 'express'
import type { ListResponse, BridgeTransfer } from '@/@types/bridge'

const handler: RequestHandler = async (req, res) => {
  const { user, bridgeClient } = res.locals
  const { state } = res.locals.parsed.query
  const transfers = await bridgeClient
    .get<ListResponse<BridgeTransfer>>(`/customers/${user.bridge_id!}/transfers`)
    .then(
      ({ data }) => data
    )
  const filteredTransfers = state
    ? transfers.filter(
      t => t.state === state
    )
    : transfers
  res.json(filteredTransfers)
}

export default handler
