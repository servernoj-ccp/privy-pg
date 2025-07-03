import { Dispute } from '@/db/models'
import { RequestHandler } from 'express'

const handler: RequestHandler = async (req, res) => {
  const { dispute_id } = res.locals.parsed.params
  const dispute = await Dispute.findByPk(dispute_id)
  res.json(dispute)
}

export default handler
