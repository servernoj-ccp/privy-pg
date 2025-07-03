import express from 'express'
import list from './list'
import activity from './activity'
import { validator } from '@/controller/middleware'
import { z } from 'zod'

const router = express.Router()

router.get(
  '/',
  validator({
    query: z.object({
      include_deactivated: z.boolean().default(false)
    })
  }),
  list
)
router.get(
  '/:id/activity',
  validator({
    params: z.object({
      id: z.string()
    }),
    query: z.object({
      type: z.enum([
        'funds_received',
        'payment_submitted',
        'payment_processed',
        'in_review',
        'refund',
        'microdeposit',
        'account_update',
        'deactivation',
        'activation'
      ]).optional()
    })
  }),
  activity
)

export default router
