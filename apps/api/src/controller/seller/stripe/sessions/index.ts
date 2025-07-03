import express from 'express'
import onboarding from './onboarding'

const router = express.Router()

router.get('/onboarding', onboarding)

export default router
