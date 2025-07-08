import { User } from '@/db/models'
import { RequestHandler } from 'express'

const handler: RequestHandler = async (req, res, next) => {
  const { privyUser } = res.locals
  const user = await User.findOne({
    where: {
      privy_id: privyUser.id
    }
  })
  res.json({ user, privyUser })
}
export default handler
