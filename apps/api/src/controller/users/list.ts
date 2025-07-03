import { User } from '@/db/models'
import { RequestHandler } from 'express'

const handler: RequestHandler = async (req, res, next) => {
  try {
    const users = await User.findAll()
    res.json(users)
  } catch (error) {
    next(error)
  }
}

export default handler
