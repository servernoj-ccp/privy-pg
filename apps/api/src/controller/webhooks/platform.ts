import { InternalServerError, isHttpError } from 'http-errors-enhanced'
import { RequestHandler } from 'express'
import Stripe from 'stripe'
import { User, Receipt, Installment } from '@/db/models'
import { getQueueByName } from '@/workers'
import { catcher, fromCents, roundToCents, toCents } from '@/utils'
import { chain, getStripeFee } from '@/config'
import chalk from 'chalk'
import { stripeClient } from '@/clients'

const supportedEvents: Array<Stripe.Event.Type> = [
  'payment_intent.succeeded',
  'setup_intent.succeeded',
  'charge.refunded',
  // -- disputes
  'charge.dispute.created',
  'charge.dispute.updated',
  'charge.dispute.closed',
  'charge.dispute.funds_reinstated',
  'charge.dispute.funds_withdrawn',
  // -- radar
  'radar.early_fraud_warning.created'
]

const handler: RequestHandler = async (req, res, next) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
    const signature = req.headers['stripe-signature'] as string
    const secret = process.env.STRIPE_WEBHOOK_SECRET_P as string
    const event = stripe.webhooks.constructEvent(req.body, signature, secret)
    if (
      supportedEvents.includes(event.type)
    ) {
      console.log(chalk.yellow('P------------', event.type, event.id, (event.data?.object as any).id))
      switch (event.type) {
        case 'radar.early_fraud_warning.created': {
          // -- In case dispute related fraud warning we mark receipt as "refund requested"
          const { payment_intent } = event.data.object
          const installment = await Installment.findOne({
            where: {
              payment_intent_id: payment_intent as string
            },
            include: [
              {
                model: Receipt,
                as: 'receipt'
              }
            ]
          }) as Installment & {receipt: Receipt | null}
          await installment?.receipt?.update({
            refund_status: 'requested'
          })
          break
        }
        case 'setup_intent.succeeded': {
          type SetupIntentMetadata = {
            owner: 'buyer'
            user_id: string
            amount: number
            buyer_id: string
            buyer_wallet_address: string
            installments: number
            interval: number,
            processTaxes: string
          } | {
            owner: 'seller'
            user_id: string
          }
          const metadata = event.data.object.metadata as unknown as SetupIntentMetadata
          switch (metadata?.owner) {
            case 'seller': {
              const { payment_method: payment_method_id } = event.data.object
              const user = await User.findByPk(metadata.user_id)
              if (user) {
                const paymentMethod = await stripe.paymentMethods
                  .retrieve(payment_method_id as string)
                  .catch(catcher)
                if (paymentMethod?.type === 'card' && paymentMethod.card) {
                  await user.update({
                    payment_method_id
                  })
                  const { last4, exp_month, exp_year, display_brand } = paymentMethod.card
                  console.log(`Payment method for seller ${user.id} updated to`, {
                    last4, exp_month, exp_year, display_brand
                  })
                }
              }
              break
            }
            case 'buyer': {
              const { user_id, amount, processTaxes, buyer_id, buyer_wallet_address, installments, interval } = metadata
              await stripe.customers.update(event.data.object.customer as string, {
                invoice_settings: {
                  default_payment_method: event.data.object.payment_method as string
                }
              })
              const paymentMethod = await stripe.paymentMethods.retrieve(event.data.object.payment_method as string) as Stripe.PaymentMethod
              const extraPercent = paymentMethod.type === 'card' && !/^US$/i.test(paymentMethod.card?.country ?? 'US')
                ? 0.015
                : 0

              // taxes
              let tax_amount = 0
              if (processTaxes === 'true') {
                const { tax_amount_exclusive } = await stripeClient.tax.calculations.create({
                  currency: 'usd',
                  customer: event.data.object.customer as string,
                  line_items: [{
                    amount: toCents(amount),
                    reference: event.data.object.id
                  }]
                })
                tax_amount = fromCents(tax_amount_exclusive)
              }

              // receipt
              const totalAmount = roundToCents(amount) + tax_amount
              const totalAmountInCents = toCents(totalAmount)
              const receipt = await Receipt.create({
                user_id,
                buyer_id,
                customer_id: event.data.object.customer as string,
                total_amount: totalAmount,
                total_installments: installments,
                chain_id: chain.id,
                tax_amount
              })
              // -- break the purchase into istallments
              let pledgeAmount = 0
              for (let idx = 0; idx < installments; idx++) {
                const delay = idx * interval
                const installmentAmountBaseInCents = Math.floor(totalAmountInCents / installments)
                const installmentAmountExtraInCents = idx ? 0 : totalAmountInCents % installments
                const installmentAmount = fromCents(installmentAmountBaseInCents + installmentAmountExtraInCents)
                const installmentFee = getStripeFee(installmentAmount, extraPercent)
                const installmentNet = installmentAmount - installmentFee
                const installment = await Installment.create({
                  idx,
                  receipt_id: receipt.id,
                  scheduled_on: new Date(Date.now() + delay),
                  amount: installmentAmount,
                  fee: installmentFee,
                  net: installmentNet
                })
                await getQueueByName('installments').add('createPaymentIntent', {
                  installment_id: installment.id
                }, {
                  delay
                })
                pledgeAmount += installmentNet
              }
              await getQueueByName('TSC').add('pledge', {
                amount: roundToCents(pledgeAmount - tax_amount),
                receipt_id: receipt.id,
                user_id,
                buyer_wallet_address
              }, {
                attempts: 10,
                backoff: {
                  type: 'fixed',
                  delay: 24 * 3600 * 1000
                }
              })
              break
            }
          }
          break
        }
        case 'payment_intent.succeeded': {
          type PaymentIntentMetadata = {
            source: 'installment'
            installment_id: string
          } | {
            source: 'refund'
            receipt_id: string
          } | {
            source: 'dispute'
            receipt_id: string
            dispute_id: string
          }
          const metadata = event.data.object.metadata as unknown as PaymentIntentMetadata
          switch (metadata.source) {
            case 'installment': {
              await getQueueByName('installments').add('processSucceededPaymentIntent', {
                installment_id: metadata.installment_id
              })
              break
            }
            case 'refund': {
              await getQueueByName('refunds').add('processSucceededPaymentIntent', {
                payment_intent_id: event.data.object.id
              })
              break
            }
            case 'dispute': {
              await getQueueByName('disputes').add('processSucceededPaymentIntent', {
                dispute_id: metadata.dispute_id,
                receipt_id: metadata.receipt_id,
                payment_intent_id: event.data.object.id
              })
              break
            }
          }
          break
        }
        case 'charge.refunded': {
          const charge = event.data.object
          if (charge.metadata?.source === 'installment') {
            await getQueueByName('refunds').add('processChargeRefunded', {
              charge_id: charge.id
            })
          }
          break
        }
        case 'charge.dispute.created': {
          const dispute = event.data.object
          await getQueueByName('disputes').add('processDisputeCreated', {
            dispute_id: dispute.id
          })
          break
        }
        case 'charge.dispute.updated': {
          const dispute = event.data.object
          await getQueueByName('disputes').add('processDisputeUpdated', {
            dispute_id: dispute.id
          })
          break
        }
        case 'charge.dispute.closed': {
          const dispute = event.data.object
          await getQueueByName('disputes').add('processDisputeClosed', {
            dispute_id: dispute.id
          })
          break
        }
        case 'charge.dispute.funds_reinstated': {
          const dispute = event.data.object
          await getQueueByName('disputes').add('processDisputeFundsReinstated', {
            dispute_id: dispute.id
          })
          break
        }
        case 'charge.dispute.funds_withdrawn': {
          const dispute = event.data.object
          await getQueueByName('disputes').add('processDisputeFundsWithdrawn', {
            dispute_id: dispute.id
          })
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

