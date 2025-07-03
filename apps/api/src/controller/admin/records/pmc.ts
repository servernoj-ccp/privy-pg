import { RequestHandler, Router } from 'express'
import { validator } from '@/controller/middleware'
import { z } from 'zod'
import { StripeRecord } from '@/db/models'
import { omit } from 'lodash-es'
import Stripe from 'stripe'
import factory from './factory'

const pmcSchema = z.object({
  display_preference: z.object({
    preference: z.enum(['on', 'off', 'none']).default('off')
  })
}).optional()

const create: RequestHandler = async (req, res, next) => {
  const { stripeClient } = res.locals
  const stripeRecordData = {
    name: res.locals.parsed.body.description,
    ...omit(res.locals.parsed.body, ['description']) as Stripe.PaymentMethodConfigurationCreateParams
  }
  const record = await stripeClient.paymentMethodConfigurations.create(stripeRecordData)
  const stripeRecord = await StripeRecord.create({
    description: res.locals.parsed.body.description ?? null,
    stripe_record_id: record.id,
    kind: 'pmc'
  })
  res.json(stripeRecord)
}

const router = Router()

router.use(factory('pmc'))

router.post('/',
  validator({
    body: z.object({
      description: z.string().optional(),
      afterpay_clearpay: pmcSchema,
      alipay: pmcSchema,
      alma: pmcSchema,
      amazon_pay: pmcSchema,
      apple_pay: pmcSchema,
      apple_pay_later: pmcSchema,
      au_becs_debit: pmcSchema,
      bacs_debit: pmcSchema,
      bancontact: pmcSchema,
      blik: pmcSchema,
      boleto: pmcSchema,
      card: pmcSchema,
      cartes_bancaires: pmcSchema,
      cashapp: pmcSchema,
      customer_balance: pmcSchema,
      eps: pmcSchema,
      fpx: pmcSchema,
      giropay: pmcSchema,
      google_pay: pmcSchema,
      grabpay: pmcSchema,
      ideal: pmcSchema,
      jcb: pmcSchema,
      klarna: pmcSchema,
      konbini: pmcSchema,
      link: pmcSchema,
      mobilepay: pmcSchema,
      multibanco: pmcSchema,
      nz_bank_account: pmcSchema,
      oxxo: pmcSchema,
      p24: pmcSchema,
      pay_by_bank: pmcSchema,
      paynow: pmcSchema,
      paypal: pmcSchema,
      promptpay: pmcSchema,
      revolut_pay: pmcSchema,
      sepa_debit: pmcSchema,
      sofort: pmcSchema,
      swish: pmcSchema,
      twint: pmcSchema,
      us_bank_account: pmcSchema,
      wechat_pay: pmcSchema,
      zip: pmcSchema
    })
  }),
  create
)

export default router
