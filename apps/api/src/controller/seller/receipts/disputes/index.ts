import { RequestHandler, Router } from 'express'
import listDisputes from './listDisputes'
import listEvidences from './listEvidences'
import { validator } from '@/controller/middleware'
import retrieveDispute from './retrieveDispute'
import { z } from 'zod'
import { Dispute, Evidence, Installment } from '@/db/models'
import { NotFoundError } from 'http-errors-enhanced'
import resetEvidences from './resetEvidences'
import evidenceCleanup from './evidenceCleanup'
import evidenceFile from './evidenceFile'
import evidenceText from './evidenceText'
import retrieveEvidence from './retrieveEvidence'
import submitAllEvidences from './submitAllEvidences'

export const disputeValidator:RequestHandler = async (req, res, next) => {
  const mw = validator({
    params: z.object({
      dispute_id: z.string().uuid()
    })
  })
  mw(req, res, async err => {
    try {
      if (err) {
        throw err
      }
      const { receipt_id, dispute_id } = res.locals.parsed.params

      const dispute = await Dispute.findByPk(dispute_id, {
        include: [
          {
            model: Installment,
            as: 'installment',
            required: true
          }
        ]
      }) as Dispute & {installment: Installment}
      if (!dispute || dispute.installment.receipt_id !== receipt_id) {
        throw new NotFoundError('Dispute not found')
      }
      next()
    } catch (e) {
      next(e)
    }
  })
}

export const evidenceValidator:RequestHandler = async (req, res, next) => {
  const mw = validator({
    params: z.object({
      evidence_id: z.string().uuid()
    })
  })
  mw(req, res, async err => {
    try {
      if (err) {
        throw err
      }
      const { receipt_id, evidence_id } = res.locals.parsed.params
      const dispute = await Dispute.findOne({
        include: [
          {
            model: Evidence,
            as: 'evidences',
            required: true,
            through: {
              attributes: [],
              where: {
                evidence_id
              }
            }
          }
        ]
      })
      if (!dispute) {
        throw new NotFoundError('Evidence not found')
      }
      const installment = await Installment.findOne({
        where: {
          id: dispute.installment_id,
          receipt_id
        }
      })
      if (!installment) {
        throw new NotFoundError('Evidence for receipt not found')
      }
      next()
    } catch (e) {
      next(e)
    }
  })
}

const router = Router()
const evidenceRouter = Router()

router.get('/', listDisputes)
router.post(
  '/submit',
  validator({
    query: z.object({
      action: z.enum(['accept']).optional()
    })
  }),
  submitAllEvidences
)

router.get('/evidences', listEvidences)
router.delete('/evidences', resetEvidences)
router.use('/evidences/:evidence_id', evidenceValidator, evidenceRouter)
evidenceRouter.delete('/', evidenceCleanup)
evidenceRouter.get('/', retrieveEvidence)
evidenceRouter.post('/file', evidenceFile)
evidenceRouter.post(
  '/text',
  validator({
    body: z.object({
      text: z.string().nullable()
    })
  }),
  evidenceText
)

router.get('/:dispute_id', disputeValidator, retrieveDispute)

export default router
