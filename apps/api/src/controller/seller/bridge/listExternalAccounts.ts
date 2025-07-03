import { ExternalAccount, ListResponse } from '@/@types/bridge'
import { RequestHandler } from 'express'

const handler: RequestHandler = async (req, res) => {
  const { user, bridgeClient } = res.locals
  const externalAccounts = await bridgeClient
    .get<ListResponse<ExternalAccount>>(`/customers/${user.bridge_id!}/external_accounts`)
    .then(
      ({ data }) => data
    )
  res.json(externalAccounts)
}

export default handler
