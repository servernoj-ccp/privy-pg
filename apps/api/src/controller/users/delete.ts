import { User } from '@/db/models'
import type { RequestHandler } from 'express'


const handler: RequestHandler = async (req, res) => {
  const { email } = res.locals?.parsed?.body ?? {}
  const { user_id } = res.locals?.parsed?.params ?? {}
  const user = user_id
    ? await User.findByPk(user_id)
    : email
      ? await User.findOne({ where: { email } })
      : null

  if (user) {
    await user.destroy()
  }
  res.sendStatus(204)
}

export default handler
