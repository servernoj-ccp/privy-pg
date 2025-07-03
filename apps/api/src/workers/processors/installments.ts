import { Processor, UnrecoverableError } from 'bullmq'
import { stripeClient } from '@/clients'
import { Installment, Receipt, User } from '@/db/models'
import { JobError, printJobStatus, NamedJob, getQueueByName } from '@/workers'
import Stripe from 'stripe'
import { catcher, catcherWithContext, sleep, toCents } from '@/utils'
import { updateReceiptStatus } from '@/workers/misc'

const getTransferGroup = (r: Receipt) => `receipt_tx_${r.id}`

const handler = async (job: NamedJob<'installments'>) => {
  printJobStatus(job, 'started')
  try {
    switch (job.name) {
      case 'createPaymentIntent': {
        const { installment_id } = job.data
        const installment = await Installment.findByPk(installment_id)
        if (!installment) {
          throw new JobError(`invalid installment_id ${installment_id}`, true)
        }
        if (installment.status === 'canceled') {
          const message = 'Installment cancelled due to refund request'
          throw new UnrecoverableError(message)
        }
        const receipt = await Receipt.findByPk(installment.receipt_id)
        if (!receipt) {
          throw new JobError(`invalid receipt_id '${installment.receipt_id}'`, true)
        }
        const user = await User.findByPk(receipt.user_id)
        if (!user) {
          throw new JobError(`invalid user_id '${receipt.user_id}'`, true)
        }
        const description = receipt.total_installments === 1
          ? `Payment for receipt ${receipt.id}`
          : `Installment ${installment.idx + 1} of ${receipt.total_installments} for receipt ${receipt.id}`

        const paymentIntent = await stripeClient.paymentIntents.create({
          transfer_group: getTransferGroup(receipt),
          customer: receipt.customer_id,
          amount: toCents(installment.amount),
          application_fee_amount: toCents(installment.fee),
          currency: 'USD',
          on_behalf_of: user.stripe_id!,
          description,
          transfer_data: {
            destination: user.stripe_id!
          },
          metadata: {
            source: 'installment',
            installment_id
          }
        })
        await installment.update({
          payment_intent_id: paymentIntent.id,
          status: 'payment_scheduled'
        })
        await job.log(paymentIntent.id)
        await getQueueByName('installments').add('confirmPaymentIntent', {
          installment_id
        })
        break
      }
      case 'confirmPaymentIntent': {
        const { installment_id } = job.data
        const installment = await Installment.findByPk(installment_id)
        if (!installment) {
          throw new JobError(`invalid installment_id ${installment_id}`, true)
        }
        if (installment.status === 'canceled') {
          const message = 'Installment cancelled due to refund request'
          throw new UnrecoverableError(message)
        }
        if (!installment.payment_intent_id) {
          throw new JobError('invalid installment, missing payment_intent_id', true)
        }
        const receipt = await Receipt.findByPk(installment.receipt_id)
        if (!receipt) {
          throw new JobError(`invalid receipt_id '${installment.receipt_id}'`, true)
        }
        const customer = await stripeClient.customers.retrieve(receipt.customer_id) as Stripe.Customer
        const payment_method_id = customer.invoice_settings?.default_payment_method as string
        const paymentMethod = await stripeClient.paymentMethods
          .retrieve(payment_method_id)
          .catch(
            catcherWithContext('retrieving payment method', {
              customer_id: receipt.customer_id,
              payment_method_id
            })
          )
        if (!paymentMethod) {
          throw new JobError('unable to retrieve payment method', true)
        }
        await stripeClient.paymentIntents.update(installment.payment_intent_id, {
          payment_method: paymentMethod.id
        })
        try {
          await stripeClient.paymentIntents.confirm(installment.payment_intent_id, { off_session: true })
        } catch (e) {
          await installment.update({
            status: 'failed',
            last_failure_ts: new Date(),
            last_failure_reason: (e as Error).message
          })
          await installment.increment('failed_times')
          await updateReceiptStatus(installment.receipt_id)
          throw new JobError(e as Error, true)
        }
        break
      }
      case 'processSucceededPaymentIntent': {
        const { installment_id } = job.data
        const installment = await Installment.findByPk(installment_id, {
          include: [
            {
              model: Receipt,
              as: 'receipt',
              include: [
                {
                  model: User,
                  as: 'seller'
                }
              ]
            }
          ]
        }) as Installment & {receipt: Receipt & {seller: User}}
        if (!installment) {
          throw new JobError(`invalid installment_id ${installment_id}`)
        }
        // taxes
        if (installment.receipt.tax_amount) {
          const taxCalculation = await stripeClient.tax.calculations.create({
            customer: installment.receipt.customer_id,
            currency: 'usd',
            line_items: [{
              reference: installment.id,
              amount: toCents(installment.amount),
              tax_behavior: 'inclusive'
            }]
          })
          const taxJurisdictions = taxCalculation.tax_breakdown.reduce(
            (acc, tax) => {
              const state = tax?.tax_rate_details?.state
              if (state) {
                acc.add(state)
              }
              return acc
            },
            new Set()
          )
          const taxTransaction = await stripeClient.tax.transactions.createFromCalculation({
            calculation: taxCalculation.id!,
            reference: `installment(${installment.id})`,
            metadata: {
              tax_calculation_id: taxCalculation.id,
              installment_id: installment.id,
              receipt_id: installment.receipt_id,
              tax_source: 'marketplace',
              tax_jurisdictions: Array.from(taxJurisdictions).join('|')
            }
          })
          const taxTransfer = await stripeClient.transfers.create({
            amount: taxCalculation.tax_amount_inclusive,
            currency: taxCalculation.currency,
            destination: process.env.STRIPE_PLATFORM_ACCOUNT!,
            transfer_group: getTransferGroup(installment.receipt),
            description: `Sales tax transfer for installment ${installment.id} of receipt ${installment.receipt_id}`,
            metadata: {
              tax_transaction_id: taxTransaction.id,
              ...taxTransaction.metadata
            }
          }, {
            stripeAccount: installment.receipt.seller.stripe_id!
          })
          await installment.update({
            tax_transaction_id: taxTransaction.id,
            tax_transfer_id: taxTransfer.id
          })
        }
        await installment.update({
          status: 'paid-in'
        })
        await updateReceiptStatus(installment.receipt_id)
        // -- get receipt_url for this installment
        let receipt_url
        for (let delay = 200, combinedDelay = 0; combinedDelay < 10_000; delay *= 2) {
          const paymentIntent = await stripeClient.paymentIntents.retrieve(
            installment.payment_intent_id!,
            { expand: ['latest_charge'] }
          ).catch(catcher)
          if (paymentIntent?.latest_charge) {
            receipt_url = (paymentIntent.latest_charge as Stripe.Charge).receipt_url
            break
          }
          await sleep(delay)
          combinedDelay += delay
          console.log('Waiting for data...')
        }
        if (receipt_url) {
          await installment.update({
            stripe_receipt_url: receipt_url
          })
        }
        break
      }
      case 'processPaidOutPaymentIntent': {
        const { installment_id, payout_id } = job.data
        const installment = await Installment.findByPk(installment_id)
        if (!installment) {
          throw new JobError(`invalid installment_id ${installment_id}`, true)
        }
        await installment.update({
          status: 'paid-out',
          payout_id
        })
        await getQueueByName('TSC').add('confirm', {
          installment_id
        })
      }
    }
    printJobStatus(job, 'succeeded')
  } catch (e) {
    if (e instanceof UnrecoverableError) {
      printJobStatus(job, 'canceled', e.message)
      throw e
    }
    const error = e as JobError
    if (error?.isCritical) {
      printJobStatus(job, 'failed', error.message)
      throw error
    } else {
      printJobStatus(job, 'errored', error.message)
    }
  }
}

export default handler as Processor
