import express from 'express'
import list from './list'
import { validator } from '@/controller/middleware'
import { z } from 'zod'

const router = express.Router()

router.get(
  '/',
  validator({
    query: z.object({
      state: z.enum([
        'awaiting_funds',
        'in_review',
        'funds_received',
        'payment_submitted',
        'payment_processed',
        'canceled',
        'error',
        'returned',
        'refunded'
      ]).optional()
    })
  }),
  list
)

export default router
