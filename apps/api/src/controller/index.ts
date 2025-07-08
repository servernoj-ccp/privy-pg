import { injectClients } from './middleware'
import express from 'express'
import users from './users'
import buyers from './buyers'

const router = express.Router()
router.use(injectClients)
// --
router.use(express.json())
router.get('/health', (req, res) => {
  res.status(200).send('OK')
})
router.use('/users', users)
router.use('/buyers', buyers)
// --
export default router
