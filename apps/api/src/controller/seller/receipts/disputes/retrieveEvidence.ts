import { Evidence } from '@/db/models'
import { RequestHandler } from 'express'

const handler: RequestHandler = async (req, res) => {
  const { evidence_id } = res.locals.parsed.params
  const evidence = await Evidence.findByPk(evidence_id)
  res.json(evidence)
}

export default handler
