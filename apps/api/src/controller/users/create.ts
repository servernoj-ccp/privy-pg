import { User } from '@/db/models'
import type { RequestHandler } from 'express'
import type { BridgeKYC } from '@/@types/bridge'
import { FailedDependencyError, InternalServerError, isHttpError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res, next) => {
  try {
    const { email } = res.locals.parsed.body
    const { individual } = res.locals.parsed.query
    let user = await User.findOne({
      where: {
        email
      }
    })
    if (
      user?.bridge_id &&
      user?.privy_id &&
      user?.stripe_id
    ) {
      console.log('User with all sub-accounts found')
      res.json(user)
      return
    }
    if (user) {
      await user.destroy()
    }
    try {
      // -- Privy
      let privyUser = await res.locals.privySellerClient.getUserByEmail(email)
      if (!privyUser) {
        console.log('Creating Privy user')
        privyUser = await res.locals.privySellerClient.importUser({
          createEthereumWallet: false,
          linkedAccounts: [{
            address: email,
            type: 'email'
          }]
        })
      }
      // -- Bridge via "KYC Link" API
      let [bridgeCustomerLink] = await res.locals.bridgeClient.get<{data: Array<BridgeKYC>}>(`/kyc_links?email=${email}`).then(
        ({ data }) => data
      )
      if (!bridgeCustomerLink) {
        console.log('Creating Bridge customer KYC Link')
        bridgeCustomerLink = await res.locals.bridgeClient.post<BridgeKYC>('/kyc_links', {
          email,
          type: individual ? 'individual' : 'business'
        })
      }
      // -- Stripe
      let [stripeAccount] = await res.locals.stripeClient.accounts.list().autoPagingToArray({ limit: 1000 }).then(
        accs => accs.filter(
          acc => acc.email === email
        )
      )
      if (!stripeAccount) {
        console.log('Creating Stripe account')
        stripeAccount = await res.locals.stripeClient.accounts.create({
          country: 'US',
          capabilities: {
            tax_reporting_us_1099_k: {
              requested: true
            },
            transfers: {
              requested: true
            },
            card_payments: {
              requested: true
            }
          },
          settings: {
            payouts: {
              debit_negative_balances: false
            }
          },
          email,
          type: 'custom'
        })
      }
      user = await User.create({
        email,
        stripe_id: stripeAccount.id,
        privy_id: privyUser.id,
        bridge_id: bridgeCustomerLink.customer_id
      })
      res.json(user)
    } catch (e) {
      console.log(e)
      throw new FailedDependencyError('Unable to create sub-account(s)', e as Error)
    }
  } catch (error) {
    if (isHttpError(error)) {
      next(error)
    } else {
      next(new InternalServerError(error as Error))
    }
  }
}

export default handler
