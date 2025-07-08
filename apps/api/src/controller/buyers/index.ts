import express from 'express'
import { verifyPrivyToken, authorizer } from '@/controller/middleware'
import create from './create'
import retrieve from './retrieve'

const router = express.Router()
router.use(verifyPrivyToken)

router.post('/', create)
router.get('/', authorizer(['buyer']), retrieve)

export default router
