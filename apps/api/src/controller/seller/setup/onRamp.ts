import type {
  ListResponse,
  VirtualAccount,
  VirtualAccountCreateInput
} from '@/@types/bridge'
import { isAddressEqual } from 'viem'
import { RequestHandler } from 'express'
import { FailedDependencyError, InternalServerError } from 'http-errors-enhanced'
import { bridge, chain, isStripeSandbox } from '@/config'
import { tscAddresses } from '@/smart-contracts'


const handler: RequestHandler = async (req, res, next) => {
  // -- Error in Stripe test environment
  if (isStripeSandbox) {
    throw new InternalServerError('Stripe Sandbox environment detected')
  }
  try {
    const { stripeClient, bridgeClient, user } = res.locals
    // -- Virtual account (Bridge)
    const tscAddress = tscAddresses[chain.id]
    let [virtualAccount] = await bridgeClient.get<ListResponse<VirtualAccount>>(`customers/${user.bridge_id}/virtual_accounts`).then(
      ({ data }) => data.filter(
        va => {
          return (
            va.status === 'activated' &&
            va.destination.payment_rail === bridge.payment_rail &&
            va.destination.currency === bridge.currency &&
            isAddressEqual(va.destination.address as any, tscAddress)
          )
        }
      )
    )
    if (!virtualAccount) {
      virtualAccount = await bridgeClient.post<VirtualAccount, VirtualAccountCreateInput>(`customers/${user.bridge_id}/virtual_accounts`, {
        source: {
          currency: 'usd'
        },
        destination: {
          currency: bridge.currency,
          payment_rail: bridge.payment_rail,
          address: tscAddress
        }
      })
    }

    // -- External account (Stripe)
    let [externalAccount] = await stripeClient.accounts
      .listExternalAccounts(user.stripe_id!, { object: 'bank_account' })
      .autoPagingToArray({ limit: 100 })
      .then(
        external_accounts => external_accounts.filter(
          ea => {
            const found = (
              ea?.metadata?.virtual_account_id === virtualAccount.id &&
              ea.default_for_currency === true
            )
            return found
          }
        )
      )
    if (!externalAccount) {
      externalAccount = await stripeClient.accounts.createExternalAccount(user.stripe_id!, {
        external_account: {
          account_number: virtualAccount.source_deposit_instructions.bank_account_number,
          routing_number: virtualAccount.source_deposit_instructions.bank_routing_number,
          country: 'US',
          object: 'bank_account',
          currency: virtualAccount.source_deposit_instructions.currency
        },
        default_for_currency: true,
        metadata: {
          virtual_account_id: virtualAccount.id
        }
      })
    }
    res.json({
      virtualAccount,
      externalAccount
    })
  } catch (e) {
    const { message } = e as Error
    next(new FailedDependencyError(message, e as Error))
  }
}

export default handler
