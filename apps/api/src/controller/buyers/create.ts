import { User } from '@/db/models'
import { RequestHandler } from 'express'

const handler: RequestHandler = async (req, res, next) => {
  const { privyUser, privyClient } = res.locals
  await privyClient.setCustomMetadata(privyUser.id, {
    ...privyUser.customMetadata,
    isBuyer: true
  })
  const [user, created] = await User.findOrCreate({
    where: {
      email: privyUser.email?.address ?? null
    },
    defaults: {
      privy_id: privyUser.id,
      roles: ['buyer']
    }
  })
  if (!created && privyUser.customMetadata?.isSeller) {
    await user.update({
      roles: ['buyer', 'seller']
    })
  }
  res.sendStatus(201)
}

export default handler
