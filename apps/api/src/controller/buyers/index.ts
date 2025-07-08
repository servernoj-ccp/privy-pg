import express from 'express'
import { verifyPrivyToken } from '@/controller/middleware'
import create from './create'

const router = express.Router()
router.use(verifyPrivyToken)

router.post('/', create)


export default router
