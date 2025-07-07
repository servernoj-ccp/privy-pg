import express from 'express'
import { validator, basicAuth } from '@/controller/middleware'
import { z } from 'zod'
import createUser from './create'
import listUsers from './list'
import deleteUser from './delete'

const protectedRouter = express.Router()

protectedRouter.use(basicAuth)
protectedRouter.post(
  '/',
  validator({
    body: z.object({
      email: z.string().email()
    }),
    query: z.object({
      individual: z.boolean().default(false)
    })
  }),
  createUser
)
protectedRouter.delete(
  '/',
  validator({
    body: z.object({
      email: z.string().email()
    })
  }),
  deleteUser
)
protectedRouter.get('/', listUsers)
protectedRouter.delete(
  '/:user_id',
  validator({
    params: z.object({
      user_id: z.string().uuid()
    })
  }),
  deleteUser
)

const router = express.Router()
router.use('/', protectedRouter)

export default router
