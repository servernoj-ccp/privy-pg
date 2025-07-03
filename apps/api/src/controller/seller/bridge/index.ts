import express, { RequestHandler } from 'express'
import { BridgeCustomer } from '@/@types/bridge'
import virtualAccounts from './virtualAccounts'
import transfers from './transfers'
import plaid from './plaid'
import listExternalAccounts from './listExternalAccounts'

export type URLWrapper = {
  url: string
}

const router = express.Router()

const getAccount: RequestHandler = async (req, res) => {
  const { user, bridgeClient } = res.locals
  const customer = await bridgeClient.get<BridgeCustomer>(`/customers/${user.bridge_id}`)
  const kyc_link = await bridgeClient.get<URLWrapper>(`/customers/${user.bridge_id}/kyc_link`)
  const tos_link = await bridgeClient.get<URLWrapper>(`/customers/${user.bridge_id}/tos_acceptance_link`)
  res.json({
    ...customer,
    kyc_link: kyc_link?.url,
    tos_link: tos_link?.url
  })
}

router.get('/', getAccount)
router.get('/external_accounts', listExternalAccounts)
router.use('/va', virtualAccounts)
router.use('/transfers', transfers)
router.use('/plaid', plaid)


export default router
