import express from 'express'
import { authorizer, basicAuth, verifyPrivyToken, validator } from '@/controller/middleware'
import create from './create'
import retrieve from './retrieve'
import { z } from 'zod'

const router = express.Router()

router.post(
  '/',
  basicAuth,
  validator({
    body: z.object({
      email: z.string().email()
    })
  }),
  create
)

router.use(verifyPrivyToken, authorizer(['seller']))
router.get('/', retrieve)

export default router
