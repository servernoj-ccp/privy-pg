import { User } from '@/db/models'
import { RequestHandler } from 'express'

const handler: RequestHandler = async (req, res, next) => {
  const { privyUser, privyClient } = res.locals
  await privyClient.setCustomMetadata(privyUser.id, {
    isBuyer: true
  })
  await User.create({
    email: privyUser.email?.address ?? null,
    privy_id: privyUser.id,
    roles: ['buyer']
  })
  res.sendStatus(201)
}

export default handler
