import express from 'express'
import { authorizer, basicAuth, verifyPrivyToken, validator } from '@/controller/middleware'
import create from './create'
import retrieve from './retrieve'
import extraRoles from './extraRoles'

import { z } from 'zod/v4'

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
router.post(
  ['/extra-roles', 'roles'],
  validator({
    body: z.object({
      roles: z.enum(['buyer']).array().min(0)
    })
  }),
  extraRoles
)

export default router
