import { Dispute, DisputeEvidence, Evidence, Installment, Receipt } from '@/db/models'
import { RequestHandler } from 'express'
import { BadRequestError, FailedDependencyError } from 'http-errors-enhanced'
import Stripe from 'stripe'

const handler: RequestHandler = async (req, res) => {
  const { receipt_id } = res.locals.parsed.params
  const { action } = res.locals.parsed.query
  const { stripeClient } = res.locals
  const receipt = await Receipt.findByPk(receipt_id, {
    include: [
      {
        model: Installment,
        as: 'installments'
      }
    ]
  }) as Receipt & {installments: Array<Installment>}
  if (receipt.dispute_status !== 'open') {
    throw new BadRequestError('Invalid receipt')
  }
  const disputes = await Dispute.findAll({
    where: {
      installment_id: receipt.installments.map(({ id }) => id)
    }
  })
  const evidenceIds = await DisputeEvidence.findAll({
    where: {
      dispute_id: disputes.map(({ id }) => id)
    }
  })
  const evidences = await Evidence.findAll({
    where: {
      id: evidenceIds.map(({ evidence_id }) => evidence_id)
    }
  })
  const evidenceSubmission = evidences.reduce(
    (acc, e) => {
      if ((e as any).isProvided) {
        acc[e.evidence_type] = (e.kind === 'file' ? e.file_id : e.text)!
      }
      return acc
    },
    {
      ...(
        action === 'accept'
          ? {
            uncategorized_text: 'losing_evidence'

          }
          : {}
      )
    } as Stripe.DisputeUpdateParams.Evidence
  )
  try {
    await Promise.all(
      disputes.map(
        ({ stripe_dispute_id }) => stripeClient.disputes.update(stripe_dispute_id, {
          evidence: evidenceSubmission,
          submit: true
        })
      )
    )
  } catch (e) {
    throw new FailedDependencyError(e as Error)
  }
  console.log(evidenceSubmission)
  res.sendStatus(200)
}

export default handler
