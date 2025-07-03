import { RequestHandler } from 'express'
import { Installment, Receipt, Refund } from '@/db/models'
import { FailedDependencyError, InternalServerError } from 'http-errors-enhanced'
import { catcherWithContext } from '@/utils'
import { reverseStripeFee } from '@/config'
import { Op } from 'sequelize'

const handler: RequestHandler = async (req, res) => {
  const { user, stripeClient } = res.locals
  const { receipt_id } = res.locals.parsed.params
  const receipt = await Receipt.findByPk(receipt_id, {
    include: [
      {
        model: Installment,
        as: 'installments'
      }
    ]
  }) as Receipt & {installments: Array<Installment>}
  if (
    !receipt ||
    !['not-requested', 'requested'].includes(receipt.refund_status)
  ) {
    throw new InternalServerError(`Missing or invalid receipt ${receipt_id}`)
  }
  const paymentMethod = await stripeClient.paymentMethods
    .retrieve(user.payment_method_id)
    .catch(
      catcherWithContext('retrieve payment method', { user })
    )
  if (
    !paymentMethod ||
    !paymentMethod?.customer
  ) {
    throw new InternalServerError(`Missing or invalid payment method ${user.payment_method_id}`)
  }
  /**
   * We only need to refund installments that have been paid-in or paid-out but we cannot solely rely on
   * the `status` attribute in the `installments` table as it may experience race condition with Stripe's
   * process of controlling the `status` of the paymentIntents associated with those installments. Since some installments
   * may not contain associated payment intent (they eventually will, but not at the moment) -- those are safe to be excluded
   * from the refund. Among installments that have payment intent, we need to identify those with `succeeded`
   * status and use them to calculate refund amount. All others must be preemptively canceled to avoid their processing by Stripe
  */
  let paidAmount = 0
  const idsToCancel = []
  for (const installment of receipt.installments) {
    if (installment.payment_intent_id) {
      let paymentIntent = await stripeClient.paymentIntents
        .retrieve(installment.payment_intent_id)
        .catch(
          catcherWithContext('retrieve payment intent', { installment })
        )
      if (paymentIntent?.status !== 'succeeded') {
        paymentIntent = await stripeClient.paymentIntents
          .cancel(installment.payment_intent_id, {
            cancellation_reason: 'requested_by_customer'
          })
          .catch(
            catcherWithContext('cancel payment intent', { installment })
          )
      }
      if (!paymentIntent || paymentIntent?.status === 'succeeded') {
        paidAmount += installment.amount
        await Refund.create({
          installment_id: installment.id
        })
      } else {
        idsToCancel.push(installment.id)
      }
    } else {
      idsToCancel.push(installment.id)
    }
  }
  // -- Cancel unpaid installments
  await Installment.update({
    status: 'canceled'
  }, {
    where: {
      id: {
        [Op.in]: idsToCancel
      }
    }
  })
  if (paidAmount > 0) {
    const extraPercent = paymentMethod.type === 'card' && !/^US$/i.test(paymentMethod.card?.country ?? 'US')
      ? 0.015
      : 0
    const recoupmentAmount = Math.floor(reverseStripeFee(paidAmount, extraPercent) * 100)
    // -- Charge payment method
    try {
      await stripeClient.paymentIntents.create({
        amount: recoupmentAmount,
        description: `Recoupment charge for refund of the receipt ${receipt_id}`,
        currency: 'USD',
        customer: paymentMethod.customer as string,
        payment_method: paymentMethod.id,
        off_session: true,
        confirm: true,
        metadata: {
          source: 'refund',
          receipt_id: receipt.id
        }
      })
    } catch (e) {
      console.error(e)
      throw new FailedDependencyError((e as Error).message)
    }
    await receipt.update({
      refund_status: 'in-progress'
    })
  } else {
    throw new InternalServerError('Nothing to refund')
  }
  res.sendStatus(200)
}

export default handler
