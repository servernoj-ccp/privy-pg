import express, { RequestHandler } from 'express'
import { verifySeller } from '@/controller/middleware'
import privy from './privy'
import bridge from './bridge'
import stripe from './stripe'
import setup from './setup'
import receipts from './receipts'

const getProfile: RequestHandler = async (req, res) => {
  const { user } = res.locals
  res.json(user)
}

const router = express.Router()

router.use(verifySeller)

router.get('/', getProfile)
router.use('/privy', privy)
router.use('/bridge', bridge)
router.use('/stripe', stripe)
router.use('/setup', setup)
router.use('/receipts', receipts)

export default router
