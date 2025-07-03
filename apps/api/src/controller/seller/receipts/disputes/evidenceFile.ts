import { Evidence } from '@/db/models'
import type { RequestHandler } from 'express'
import { BadRequestError, NotFoundError } from 'http-errors-enhanced'
import multer from 'multer'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('file') as RequestHandler

const handler: RequestHandler = async (req, res) => {
  const { stripeClient } = res.locals
  const { evidence_id } = res.locals.parsed.params
  const evidence = await Evidence.findByPk(evidence_id)
  if (!evidence || evidence.kind !== 'file') {
    throw new NotFoundError('Evidence is not of type \'file\'')
  }
  try {
    await new Promise<void>(
      (resolve, reject) => {
        upload(req, res, err => {
          if (err) {
            reject(err)
          }
          if (!req.file) {
            reject(new BadRequestError('No file content in the request body'))
          }
          resolve()
        })
      }
    )
  } catch (e) {
    throw new BadRequestError(e as Error)
  }
  const uploadedFile = req.file as Express.Multer.File
  try {
    const stripeFile = await stripeClient.files.create({
      purpose: 'dispute_evidence',
      file: {
        data: uploadedFile.buffer,
        name: uploadedFile.originalname,
        type: uploadedFile.mimetype
      },
      file_link_data: {
        create: true
      }
    })
    await evidence.update({
      text: null,
      file_id: stripeFile.id,
      file_url: stripeFile.links?.data?.[0]?.url ?? null
    })
    res.json(evidence)
  } catch (e) {
    throw new BadRequestError(e as Error)
  }
}

export default handler
