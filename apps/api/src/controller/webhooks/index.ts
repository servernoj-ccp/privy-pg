import express from 'express'
import platform from './platform'
import connect from './connect'
import bridge from './bridge'

const router = express.Router()
router.use(express.raw({ type: 'application/json' }))
router.post('/platform', platform)
router.post('/connect', connect)
router.post('/bridge', bridge)

export default router
