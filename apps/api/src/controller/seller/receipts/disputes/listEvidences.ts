import { Dispute, Evidence, Installment } from '@/db/models'
import { evidenceMappingByType } from '@/workers/misc'
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
    },
    include: [
      {
        model: Evidence,
        as: 'evidences',
        through: {
          attributes: []
        }
      }
    ]
  }) as Array<Dispute & {evidences: Array<Evidence>}>
  const evidences = disputes
    .reduce(
      (acc, { evidences }) => [...acc, ...evidences],
      [] as Array<Evidence>
    )
    .map(
      evidence => Object.assign(evidence.toJSON(), {
        description: evidenceMappingByType[evidence.evidence_type].description
      })
    ) as Array<Evidence>
  const sortedEvidences = evidences.slice().sort(
    (a, b) => b.kind === a.kind
      ? a.evidence_type > b.evidence_type
        ? +1
        : -1
      : b.kind > a.kind
        ? +1
        : -1
  )
  res.json(sortedEvidences)
}

export default handler
