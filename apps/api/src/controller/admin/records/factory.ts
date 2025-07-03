import { RequestHandler, Router } from 'express'
import { stripeClient } from '@/clients'
import { validator } from '@/controller/middleware'
import { z } from 'zod'
import { StripeRecord, StripeRecordAttr } from '@/db/models'
import { catcher } from '@/utils'

const retrievers = {
  bpc: stripeClient.billingPortal.configurations.retrieve.bind(stripeClient.billingPortal.configurations),
  pmc: stripeClient.paymentMethodConfigurations.retrieve.bind(stripeClient.paymentMethodConfigurations)
} as Record<StripeRecordAttr['kind'], (id: string) => Promise<any>>

const factory = (kind: StripeRecordAttr['kind']) => {
  const enchancer = async ({ stripe_record_id, description }: StripeRecordAttr) => {
    const record = await retrievers[kind](stripe_record_id).catch(catcher)
    if (record) {
      Object.assign(record, { description })
    }
    return record
  }

  const list: RequestHandler = async (req, res, next) => {
    const stripeRecords = await StripeRecord.findAll({
      where: {
        kind
      }
    })
    const enchanced = await Promise.all(
      stripeRecords.map(enchancer)
    )
    res.json(enchanced.filter(Boolean))
  }

  const get: RequestHandler = async (req, res, next) => {
    const { id } = res.locals.parsed.params
    const stripeRecord = await StripeRecord.findOne({
      where: {
        id,
        kind
      }
    })
    const record = stripeRecord ? await enchancer(stripeRecord!) : null
    res.json(record)
  }

  const router = Router()

  router.get('/', list)

  router.get('/:id',
    validator({
      params: z.object({
        id: z.string()
      })
    }),
    get
  )
  return router
}


export default factory
