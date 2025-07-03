import { RequestHandler, Router } from 'express'
import { validator } from '@/controller/middleware'
import { z } from 'zod'
import { StripeRecord } from '@/db/models'
import { omit } from 'lodash-es'
import Stripe from 'stripe'
import factory from './factory'

const create: RequestHandler = async (req, res, next) => {
  const { stripeClient } = res.locals
  const stripeRecordData = omit(res.locals.parsed.body, ['description']) as Stripe.BillingPortal.ConfigurationCreateParams
  const record = await stripeClient.billingPortal.configurations.create(stripeRecordData)
  const stripeRecord = await StripeRecord.create({
    description: res.locals.parsed.body.description ?? null,
    stripe_record_id: record.id,
    kind: 'bpc'
  })
  res.json(stripeRecord)
}

const router = Router()

router.use(factory('bpc'))

router.post('/',
  validator({
    body: z.object({
      description: z.string().optional(),
      features: z.object({
        customer_update: z.object({
          enabled: z.boolean(),
          allowed_updates: z.array(z.enum(['address', 'email', 'name', 'phone'])).optional()
        }),
        payment_method_update: z.object({
          enabled: z.boolean()
        })
      }).partial(),
      default_return_url: z.string().optional(),
      metadata: z.object({}).passthrough().optional()
    })
  }),
  create
)

export default router
