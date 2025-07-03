import { InternalServerError, isHttpError } from 'http-errors-enhanced'
import { RequestHandler } from 'express'
import Stripe from 'stripe'
import { Installment, User } from '@/db/models'
import { Op } from 'sequelize'
import { catcher } from '@/utils'
import { getQueueByName } from '@/workers'

const supportedEvents = [
  'account.updated',
  'payout.paid'
] as Array<string>


const handler: RequestHandler = async (req, res, next) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
    const signature = req.headers['stripe-signature'] as string
    const secret = process.env.STRIPE_WEBHOOK_SECRET_C as string
    const event = stripe.webhooks.constructEvent(req.body, signature, secret)
    if (
      supportedEvents.includes(event.type)
    ) {
      console.log('C------------', event.type, event.account, event.id, (event.data?.object as any).id)
      switch (event.type) {
        case 'account.updated': {
          const account = event.data.object
          const user = await User.findOne({
            where: {
              stripe_id: account.id
            }
          })
          if (user) {
            await user.update({
              stripe_onboarded: !account.requirements?.currently_due?.length
            })
            const newState = user.stripe_onboarded
              ? 'now'
              : 'not (no longer)'
            console.log(`User ${user.email} is ${newState} Stripe onboarded`)
          }
          break
        }
        case 'payout.paid': {
          const balanceTransactions = await stripe.balanceTransactions.list({
            payout: event.data.object.id
          }, { stripeAccount: event.account }).autoPagingToArray({ limit: 200 })
          const paymentIntentIDs = await Promise.all(
            balanceTransactions.map(
              async ({ source, reporting_category }) => {
                if (!source) {
                  return null
                }
                if (reporting_category !== 'charge') {
                  return null
                }
                const connectCharge = await stripe.charges.retrieve(source as string, { stripeAccount: event.account }).catch(catcher)
                if (!connectCharge) {
                  return null
                }

                const transfer = await stripe.transfers.retrieve(connectCharge.source_transfer as string).catch(catcher)
                if (!transfer) {
                  return null
                }
                const platformCharge = await stripe.charges.retrieve(transfer.source_transaction as string).catch(catcher)
                if (!platformCharge) {
                  return null
                }
                return platformCharge.payment_intent as string
              }
            )
          ).then(
            records => records.filter(Boolean)
          )
          const installments = await Installment.findAll({
            where: {
              status: 'paid-in',
              payment_intent_id: {
                [Op.in]: paymentIntentIDs
              }
            },
            attributes: ['id'],
            raw: true
          })
          for (const { id: installment_id } of installments) {
            await getQueueByName('installments').add('processPaidOutPaymentIntent', {
              installment_id,
              payout_id: event.data.object.id
            })
          }
          break
        }
        default:
          console.log(`Unhandled event type ${event.type}`)
      }
    }
    res.sendStatus(200)
  } catch (error) {
    if (isHttpError(error)) {
      next(error)
    } else {
      next(new InternalServerError(error as Error))
    }
  }
}

export default handler
