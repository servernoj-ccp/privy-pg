import { Processor } from 'bullmq'
import { JobError, NamedJob, printJobStatus } from '@/workers'
import { stripeClient } from '@/clients'
import { catcherWithContext } from '@/utils'
import { Dispute, Evidence, Installment, Receipt, User } from '@/db/models'
import { reverseStripeFee } from '@/config'
import { updateReceiptDisputeStatus, evidenceMappingByReason, evidenceMappingByType } from '@/workers/misc'

const handler = async (job: NamedJob<'disputes'>) => {
  printJobStatus(job, 'started')
  try {
    const { dispute_id } = job.data
    const stripeDispute  = await stripeClient.disputes
      .retrieve(dispute_id)
      .catch(
        catcherWithContext(
          'retrieving dispute object',
          { dispute_id }
        )
      )
    if (!stripeDispute) {
      throw new JobError(`Invalid dispute_id ${dispute_id}`, true)
    }
    switch (job.name) {
      case 'processDisputeCreated': {
        const {
          id: stripe_dispute_id,
          payment_intent: payment_intent_id,
          reason,
          evidence_details: {
            due_by
          }
        } = stripeDispute
        const installment = await Installment.findOne({
          where: { payment_intent_id },
          include: [
            {
              model: Receipt,
              as: 'receipt',
              required: true
            }
          ]
        }) as Installment & {receipt: Receipt}
        if (!installment) {
          throw new JobError(`Unable to retrive installment by payment_intent_id  ${payment_intent_id}`, true)
        }
        // Check for duplicated dispute
        const existingDispute = await Dispute.findOne({
          where: {
            installment_id: installment.id
          }
        })
        // Existing evidences
        const allInstallments = await Installment.findAll({
          where: {
            receipt_id: installment.receipt_id
          },
          include: [
            {
              model: Dispute,
              as: 'dispute'
            }
          ]
        }) as Array<Installment & { dispute: Dispute }>
        const allDisputes = allInstallments
          .map(
            ({ dispute }) => dispute?.id
          )
          .filter(Boolean)
        const allEvidences = await Evidence.findAll({
          include: [
            {
              model: Dispute,
              as: 'disputes',
              through: {
                where: {
                  dispute_id: allDisputes
                },
                attributes: []
              },
              required: true
            }
          ],
          attributes: ['evidence_type']
        })
        const existingEvidenceTypes = allEvidences.map(
          ({ evidence_type }) => evidence_type
        )
        // Create DB record for dispute
        const dispute = await Dispute.create({
          installment_id: installment.id,
          stripe_dispute_id,
          reason,
          evidences_due_by: new Date(due_by! * 1000),
          duplicate_of: existingDispute?.id ?? null
        })
        // Create DB records for the required evidences
        const evidences = await Evidence.bulkCreate(
          evidenceMappingByReason[reason as Dispute['reason']]
            ?.filter(
              evidence_type => !existingEvidenceTypes.includes(evidence_type)
            )
            ?.map(
              evidence_type => {
                const details = evidenceMappingByType[evidence_type]
                return {
                  kind: details.kind,
                  evidence_type
                }
              }
            ) ?? []
        )
        await dispute.addEvidences(evidences)
        await updateReceiptDisputeStatus(installment.receipt.id)
        break
      }
      case 'processDisputeUpdated': {
        const { status, id: stripe_dispute_id } = stripeDispute
        const isOpen = ['needs_response', 'under_review'].includes(status)
        if (isOpen) {
          const dispute = await Dispute.findOne({
            where: {
              stripe_dispute_id
            },
            include: [
              {
                model: Installment,
                as: 'installment',
                required: true
              }
            ]
          }) as Dispute & {installment: Installment}
          if (!dispute) {
            throw new JobError(`Unable to find valid dispute for ${stripe_dispute_id}`, true)
          }
          await dispute.update({
            status
          })
          await updateReceiptDisputeStatus(dispute.installment.receipt_id)
        }
        break
      }
      case 'processDisputeClosed': {
        const { status, id: stripe_dispute_id } = stripeDispute
        const dispute = await Dispute.findOne({
          where: {
            stripe_dispute_id
          },
          include: [
            {
              model: Installment,
              as: 'installment',
              required: true
            }
          ]
        }) as Dispute & {
          installment: Installment
        }
        if (!dispute) {
          throw new JobError(`Unable to find valid dispute for ${stripe_dispute_id}`, true)
        }
        if (['won', 'lost'].includes(status)) {
          await dispute.update({
            status
          })
        }
        const { installment } = dispute
        await updateReceiptDisputeStatus(installment.receipt_id)
        // -- taxes reversal
        if (status === 'lost') {
          const receipt = await installment.getReceipt({
            include: [
              {
                model: User,
                as: 'seller'
              }
            ]
          }) as Receipt & {
            seller: User
          }
          if (installment.tax_transfer_id) {
            try {
              const transfer = await stripeClient.transfers.retrieve(
                installment.tax_transfer_id, { }, {
                  stripeAccount: receipt.seller.stripe_id!
                }
              )
              if (!transfer.reversed) {
                await stripeClient.transfers.createReversal(installment.tax_transfer_id, {}, {
                  stripeAccount: receipt.seller.stripe_id!
                })
              }
            } catch (e) {
              throw new JobError(e as Error, true)
            }
          }
          if (installment.tax_transaction_id) {
            try {
              await stripeClient.tax.transactions.createReversal({
                original_transaction: installment.tax_transaction_id,
                mode: 'full',
                reference: `receipt(${receipt.id}),installment(${installment.id},tax_transaction(${installment.tax_transaction_id}))`
              })
            } catch (e) {
              throw new JobError(e as Error, true)
            }
          }
        }
        break
      }
      case 'processDisputeFundsReinstated': {
        const { balance_transactions, metadata: { recoupment_payment_intent_id } } = stripeDispute
        if (!recoupment_payment_intent_id) {
          return
        }
        const partialRefundInCents = balance_transactions.reduce(
          (acc, { net }) => {
            return acc + Math.max(net, 0)
          },
          0
        )
        await stripeClient.refunds.create({
          payment_intent: recoupment_payment_intent_id,
          amount: partialRefundInCents
        })
        break
      }
      case 'processDisputeFundsWithdrawn': {
        const { balance_transactions, payment_intent: payment_intent_id } = stripeDispute
        // -- fee should be a negative number expressed in cents
        const recoupmentFeeInCents = balance_transactions.reduce(
          (acc, { net }) => {
            return acc + net
          },
          0
        )
        if (recoupmentFeeInCents >= 0) {
          return
        }
        const { receipt } = await Installment.findOne({
          where: {
            payment_intent_id
          },
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
        if (!receipt) {
          throw new JobError(`Unable to retrive receipt by payment_intent_id ${payment_intent_id}`, true)
        }
        const { payment_method_id } = receipt.seller
        const paymentMethod = await stripeClient.paymentMethods
          .retrieve(payment_method_id)
          .catch(
            catcherWithContext('retrieve payment method', { user: receipt.seller })
          )
        if (
          !paymentMethod ||
          !paymentMethod?.customer
        ) {
          throw new JobError(`Invalid payment_method_id ${payment_method_id}`)
        }
        const extraPercent = paymentMethod.type === 'card' && !/^US$/i.test(paymentMethod.card?.country ?? 'US')
          ? 0.015
          : 0
        const recoupmentAmount = Math.floor(reverseStripeFee(-recoupmentFeeInCents / 100, extraPercent) * 100)
        await stripeClient.paymentIntents.create({
          amount: recoupmentAmount,
          description: `Recoupment charge for dispute ${stripeDispute.id}`,
          currency: 'USD',
          customer: paymentMethod.customer as string,
          payment_method: paymentMethod.id,
          off_session: true,
          confirm: true,
          metadata: {
            source: 'dispute',
            receipt_id: receipt.id,
            dispute_id: stripeDispute.id
          }
        })
        break
      }
      case 'processSucceededPaymentIntent': {
        const { payment_intent_id, dispute_id } = job.data
        await stripeClient.disputes.update(dispute_id, {
          metadata: {
            recoupment_payment_intent_id: payment_intent_id
          }
        })
        await Dispute.update(
          {
            fee_paid: true
          },
          {
            where: {
              stripe_dispute_id: dispute_id
            }
          })
        break
      }
    }
    printJobStatus(job, 'succeeded')
  } catch (e) {
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
