import { Evidence } from '@/db/models'
import type { RequestHandler } from 'express'
import { NotFoundError } from 'http-errors-enhanced'


const handler: RequestHandler = async (req, res) => {
  const { text } = res.locals.parsed.body
  const { evidence_id } = res.locals.parsed.params
  const evidence = await Evidence.findByPk(evidence_id)
  if (!evidence || evidence.kind !== 'text') {
    throw new NotFoundError('Evidence is not of type \'text\'')
  }
  await evidence.update({
    text,
    file_id: null,
    file_url: null
  })
  res.json(evidence)
}

export default handler
