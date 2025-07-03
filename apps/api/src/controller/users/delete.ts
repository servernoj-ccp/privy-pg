import { User } from '@/db/models'
import type { RequestHandler } from 'express'


const handler: RequestHandler = async (req, res) => {
  const { email } = res.locals?.parsed?.body ?? {}
  const { user_id } = res.locals?.parsed?.params ?? {}
  const { stripeClient, bridgeClient } = res.locals
  const user = user_id
    ? await User.findByPk(user_id)
    : email
      ? await User.findOne({ where: { email } })
      : null

  if (user) {
    if (user.bridge_id) {
      await bridgeClient.delete(`/customers/${user.bridge_id}`)
    }
    if (user.stripe_id) {
      await stripeClient.accounts.del(user.stripe_id)
    }
    await user.destroy()
  }
  res.sendStatus(204)
}

export default handler
