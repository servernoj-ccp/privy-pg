import { Dispute, Installment } from '@/db/models'
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
  res.json(disputes)
}

export default handler
