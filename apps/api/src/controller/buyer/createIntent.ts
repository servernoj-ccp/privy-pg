import { catcher } from '@/utils'
import { User } from '@/db/models'
import { BadRequestError, FailedDependencyError, InternalServerError, isHttpError } from 'http-errors-enhanced'
import { RequestHandler } from 'express'
import { BuyerMetadata } from './'
import Stripe from 'stripe'
import { processTaxes } from '@/config'

type RequestBody = {
  email: string
  amount: number
  installments: number
  interval: number
}


const handler: RequestHandler = async (req, res, next) => {
  const { stripeClient, privyBuyerClient, buyer } = res.locals
  let { customer_id, intent_id } = buyer.customMetadata as BuyerMetadata ?? {}
  const { email, amount, installments, interval } = res.locals.parsed.body as RequestBody
  try {
    // -- User / Creator
    const user = await User.findOne({ where: { email } })
    if (!user) {
      throw new BadRequestError('User not found')
    }
    let buyer_email: string | null = null
    const emailSources = {
      email: 'address',
      google_oauth: 'email'
    }
    for (const [accType, field] of Object.entries(emailSources)) {
      const account = buyer.linkedAccounts.find(
        ({ type }) => type === accType
      ) as Record<string, string> | undefined
      if (account) {
        buyer_email = account[field]
        break
      }
    }
    // -- Customer
    let customer = customer_id
      ? await stripeClient.customers.retrieve(customer_id).catch(catcher)
      : null
    if (!customer) {
      customer = await stripeClient.customers.create({
        metadata: {
          buyer_id: buyer.id
        }
      })
      customer_id = customer.id
    }
    if (buyer_email) {
      await stripeClient.customers.update(customer.id, {
        email: buyer_email
      })
    }
    // -- Intent
    let intent = intent_id
      ? await stripeClient.setupIntents.retrieve(intent_id).catch(catcher)
      : null
    if (!intent || intent.status !== 'requires_payment_method') {
      intent = await stripeClient.setupIntents.create({
        customer: customer.id,
        usage: 'off_session',
        payment_method_configuration: process.env.STRIPE_PAYMENT_METHOD_CONFIG ?? undefined,
        metadata: {
          user_id: user.id,
          amount,
          buyer_id: buyer.id,
          buyer_wallet_address: buyer.wallet?.address as string,
          installments,
          interval,
          owner: 'buyer',
          processTaxes: `${processTaxes}`
        }
      })
      intent_id = intent.id
    } else {
      await stripeClient.setupIntents.update(intent.id, {
        metadata: {
          ...intent.metadata,
          user_id: user.id,
          installments,
          interval,
          amount
        }
      })
    }
    // create customer session (to offer saving payment methods)
    const customerSession = await stripeClient.customerSessions.create({
      customer: customer.id,
      components: {
        payment_element: {
          enabled: true,
          features: {
            payment_method_redisplay: 'enabled',
            payment_method_save: 'enabled',
            payment_method_save_usage: 'on_session',
            payment_method_remove: 'enabled'
          }
        }
      }
    })
    // update customMetadata on Buyer object
    try {
      await privyBuyerClient.setCustomMetadata<BuyerMetadata>(buyer.id, {
        intent_id,
        customer_id
      })
    } catch (e) {
      const error = e as Error
      throw new FailedDependencyError('Unable to set metadata', {
        error,
        buyer_id: buyer.id,
        intent_id,
        customer_id
      })
    }
    res.json({
      clientSecret: intent?.client_secret,
      customerSessionClientSecret: customerSession.client_secret,
      customerShipping: (customer as Stripe.Customer).shipping,
      processTaxes
    })
  } catch (error) {
    if (isHttpError(error)) {
      next(error)
    } else {
      const { message } = error as Error
      next(new InternalServerError(message))
    }
  }
}

export default handler
