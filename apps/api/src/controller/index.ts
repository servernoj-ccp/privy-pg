import { injectClients } from './middleware'
import express from 'express'
import users from './users'

const router = express.Router()
router.use(injectClients)
// --
router.use(express.json())
router.get('/health', (req, res) => {
  res.status(200).send('OK')
})
router.use('/users', users)
// --
export default router
