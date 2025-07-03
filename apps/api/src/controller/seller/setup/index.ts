import express from 'express'
import offRamp from './offRamp'
import onRamp from './onRamp'
import resetOffRamp from './resetOffRamp'
import { validator } from '@/controller/middleware'
import { z } from 'zod'
import createIntent from './createIntent'

const router = express.Router()

router.post(
  '/on-ramp',
  onRamp
)
router.post(
  '/off-ramp',
  validator({
    body: z.object({
      payment_rail: z.literal('ach'),
      currency: z.literal('usd'),
      external_account_id: z.string()
    })
  }),
  offRamp
)
router.delete(
  '/off-ramp',
  resetOffRamp
)
router.post('/create-intent', createIntent)

export default router
