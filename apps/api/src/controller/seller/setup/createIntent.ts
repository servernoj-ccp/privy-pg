import { catcher } from '@/utils'
import { RequestHandler } from 'express'
import { FailedDependencyError } from 'http-errors-enhanced'


const handler: RequestHandler = async (req, res, next) => {
  try {
    const { stripeClient, user } = res.locals
    let setupIntent
    let [customer] = await stripeClient.customers
      .search({
        query: `metadata["seller_id"]:"${user.id}"`
      })
      .autoPagingToArray({ limit: 100 })

    if (!customer) {
      customer = await stripeClient.customers.create({
        email: user.email
      })
    }
    if (customer.metadata.setup_intent_id) {
      setupIntent = await stripeClient.setupIntents.retrieve(customer.metadata.setup_intent_id).catch(catcher)
    }
    if (!setupIntent || setupIntent.status !== 'requires_payment_method') {
      setupIntent = await stripeClient.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: {
          user_id: user.id,
          owner: 'seller'
        }
      })
      await stripeClient.customers.update(customer.id, {
        metadata: {
          setup_intent_id: setupIntent.id
        }
      })
    }
    res.json({
      customer_id: customer.id,
      clientSecret: setupIntent.client_secret
    })
  } catch (error) {
    next(
      new FailedDependencyError((error as Error).message)
    )
  }
}

export default handler
