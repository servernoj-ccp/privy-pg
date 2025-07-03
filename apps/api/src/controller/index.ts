import express from 'express'
import webhooks from './webhooks'
import users from './users'
import seller from './seller'
import buyer from './buyer'
import admin from './admin'
import { injectClients, queryTypes } from './middleware'

const router = express.Router()
// --
router.use(injectClients)
router.use('/webhooks', webhooks)
// --
router.use(express.json(), queryTypes)
router.get('/health', (req, res) => {
  res.status(200).send('OK')
})
router.use('/admin', admin)
router.use('/users', users)
router.use('/seller', seller)
router.use('/buyer', buyer)
// --
export default router
