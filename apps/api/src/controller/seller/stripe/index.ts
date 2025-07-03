import express from 'express'
import { validator } from '@/controller/middleware'
import { z } from 'zod'
import retrieveAccount from './retrieveAccount'
import accountRequirements from './requirements'
import payToPlatform from './payToPlatform'
import updateAccount from './updateAccount'
import sessions from './sessions'
import listExternalAccounts from './listExternalAccounts'
import retrievePaymentMethod from './retrievePaymentMethod'

const router = express.Router()

// -- Retrieve account
router.get(
  '/',
  validator({
    query: z.object({
      complete: z.boolean()
    }).partial()
  }),
  retrieveAccount
)
// -- Request re-pay from the connected account to the platform
router.post(
  '/pay-to-platform',
  validator({
    body: z.object({
      amount: z.number().positive()
    })
  }),
  payToPlatform
)
// -- Update limited props on the account
router.patch(
  '/',
  validator({
    body: z.object({
      payouts_enabled: z.boolean(),
      settings: z.object({
        payments: z.object({
          statement_descriptor: z.string()
        }).partial(),
        payouts: z.object({
          debit_negative_balances: z.boolean(),
          statement_descriptor: z.string(),
          schedule: z.object({
            delay_days: z.union([
              z.number().int().nonnegative(),
              z.enum(['minimum'])
            ]),
            interval: z.enum(['manual', 'daily', 'weekly', 'monthly '])
          }).partial()
        }).partial()
      }).partial()
    }).partial()
  }),
  updateAccount
)
// -- Identify the list of "dues" that prevent account to be recognized as "onboarded"
router.get(['/dues', '/requirements', '/reqs'], accountRequirements)
// -- List external accounts
router.get(['/ea', '/eas', '/external-accounts'], listExternalAccounts)
// -- Retrieve payment method by ID
router.get(
  ['/payment-method/:id', '/pm/:id'],
  validator({
    params: z.object({
      id: z.string()
    })
  }),
  retrievePaymentMethod
)
// -- Sessions based on Stripe UI
router.use('/sessions', sessions)

export default router
