import { Router } from 'express'
import bpc from './bpc'
import pmc from './pmc'

const router = Router()

router.use('/bpc', bpc)
router.use('/pmc', pmc)

export default router
