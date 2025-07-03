import { Dispute, DisputeEvidence, Evidence, Installment } from '@/db/models'
import { RequestHandler } from 'express'

const handler: RequestHandler = async (req, res) => {
  const { receipt_id } = res.locals.parsed.params
  const installments = await Installment.findAll({
    where: {
      receipt_id
    },
    attributes: ['id']
  })
  const disputes = await Dispute.findAll({
    where: {
      installment_id: installments.map(({ id }) => id)
    }
  })
  const disputesEvidences = await DisputeEvidence.findAll({
    where: {
      dispute_id: disputes.map(({ id }) => id)
    }
  })
  await Evidence.update({
    text: null,
    file_id: null,
    file_url: null
  }, {
    where: {
      id: disputesEvidences.map(({ evidence_id }) => evidence_id)
    }
  })
  res.sendStatus(200)
}

export default handler
