import { RequestHandler, Router } from 'express'
import list from './list'
import denyRefund from './denyRefund'
import startRefund from './startRefund'
import disputes from './disputes'
import withdraw from './withdraw'
import { validator } from '@/controller/middleware'
import { z } from 'zod'
import { NotFoundError } from 'http-errors-enhanced'
import { Receipt } from '@/db/models'

export const receiptValidator:RequestHandler = async (req, res, next) => {
  const mw = validator({
    params: z.object({
      receipt_id: z.string().uuid()
    })
  })
  mw(req, res, async err => {
    try {
      if (err) {
        throw err
      }
      const { receipt_id } = res.locals.parsed.params
      const receipt = await Receipt.findByPk(receipt_id)
      if (!receipt) {
        throw new NotFoundError('Receipt not found')
      }
      next()
    } catch (e) {
      next(e)
    }
  })
}

const router = Router()
const subRouter = Router()

router.get('/', list)
router.use('/:receipt_id', receiptValidator, subRouter)

subRouter.post(
  '/deny-refund',
  denyRefund
)
subRouter.post(
  '/start-refund',
  startRefund
)
subRouter.post(
  '/withdraw',
  withdraw
)
subRouter.use(
  '/disputes',
  disputes
)

export default router
