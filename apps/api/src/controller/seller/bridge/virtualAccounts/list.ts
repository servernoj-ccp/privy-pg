import { ListResponse, VirtualAccount } from '@/@types/bridge'
import { RequestHandler } from 'express'

const handler: RequestHandler = async (req, res) => {
  const { user, bridgeClient } = res.locals
  const { include_deactivated } = res.locals.parsed.query
  const virtualAccounts = await bridgeClient
    .get<ListResponse<VirtualAccount>>(`/customers/${user.bridge_id!}/virtual_accounts`)
    .then(
      ({ data }) => data.filter(
        va => include_deactivated || va.status === 'activated'
      )
    )
  res.json(virtualAccounts)
}

export default handler
