import { injectClients } from './middleware'
import express from 'express'
import sellers from './sellers'
import buyers from './buyers'

const router = express.Router()
router.use(injectClients)
// --
router.use(express.json())
router.get('/health', (req, res) => {
  res.status(200).send('OK')
})
router.use('/sellers', sellers)
router.use('/buyers', buyers)
// --
export default router
