import express from 'express'
import link from './link'
import exchange from './exchange'
import { validator } from '@/controller/middleware'
import { z } from 'zod'

const router = express.Router()

router.get(
  '/link',
  link
)
router.post(
  '/exchange',
  validator({
    body: z.object({
      public_token: z.string(),
      link_token: z.string()
    })
  }),
  exchange
)

export default router
