import { User } from '@/db/models'
import { RequestHandler } from 'express'

const handler: RequestHandler = async (req, res, next) => {
  try {
    const users = await User.scope('onboarded').findAll({
      attributes: [
        'id',
        'email'
      ]
    })
    res.json(users)
  } catch (error) {
    next(error)
  }
}

export default handler
