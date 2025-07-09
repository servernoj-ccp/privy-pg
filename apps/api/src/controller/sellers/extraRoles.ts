import { User } from '@/db/models'
import { RequestHandler } from 'express'

const handler: RequestHandler = async (req, res, next) => {
  const roles = res.locals.parsed.body.roles as Array<string>
  const { privyUser, privyClient } = res.locals
  const customMetadata = roles.reduce(
    (acc, role) => {
      switch (role) {
        case 'buyer': acc.isBuyer = true
      }
      return acc
    },
    {
      isSeller: true
    } as Record<string, boolean>
  )
  await privyClient.setCustomMetadata(privyUser.id, customMetadata)
  await User.update(
    {
      roles: [...roles, 'seller']
    },
    {
      where: {
        privy_id: privyUser.id
      }
    }
  )
  res.sendStatus(200)
}

export default handler
