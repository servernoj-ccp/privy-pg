import type {
  LiquidationAddress,
  LiquidationAddressCreateInput,
  ListResponse
} from '@/@types/bridge'
import { RequestHandler } from 'express'
import { FailedDependencyError } from 'http-errors-enhanced'
import { bridge } from '@/config'

const handler: RequestHandler = async (req, res, next) => {
  const { bridgeClient, user } = res.locals
  try {
    const { payment_rail, currency, external_account_id } = res.locals.parsed.body
    // -- Liquidation addresses (Bridge)
    let [liquidationAddress] = await bridgeClient.get<ListResponse<LiquidationAddress>>(`customers/${user.bridge_id!}/liquidation_addresses`).then(
      ({ data }) => data.filter(
        la => (
          la.state === 'active' &&
          la.external_account_id === external_account_id &&
          la.destination_currency === currency &&
          la.destination_payment_rail === payment_rail
        )
      )
    )
    if (!liquidationAddress) {
      liquidationAddress = await bridgeClient.post<LiquidationAddress, LiquidationAddressCreateInput>(`customers/${user.bridge_id!}/liquidation_addresses`, {
        chain: bridge.payment_rail,
        currency: bridge.currency,
        external_account_id,
        destination_currency: currency,
        destination_payment_rail: payment_rail
      })
    }
    // -- Store liquidation details on the user record
    await user.update({
      liquidation: {
        payment_rail: liquidationAddress.chain,
        currency: liquidationAddress.currency,
        to_address: liquidationAddress.address
      },
      bridge_external_account_id: external_account_id
    })
    res.json(user)
  } catch (e) {
    const { message } = e as Error
    next(new FailedDependencyError(message, e as Error))
  }
}

export default handler
