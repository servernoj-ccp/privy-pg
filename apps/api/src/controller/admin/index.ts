import { basicAuth } from '@/controller/middleware'
import { Router } from 'express'
import bullmq from './bullmq'
import records from './records'


const router = Router()
router.use(basicAuth)
router.use('/bullmq', bullmq)
router.use('/records', records)

export default router
