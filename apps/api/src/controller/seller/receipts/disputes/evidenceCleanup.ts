import { Evidence } from '@/db/models'
import type { RequestHandler } from 'express'


const handler: RequestHandler = async (req, res) => {
  const { evidence_id } = res.locals.parsed.params
  const evidence = await Evidence.findByPk(evidence_id)
  await (evidence!).update({
    text: null,
    file_id: null,
    file_url: null
  })
  res.json(evidence)
}

export default handler
