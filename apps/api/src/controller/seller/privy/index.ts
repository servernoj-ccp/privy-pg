import express, { RequestHandler } from 'express'

const router = express.Router()

const getProfile: RequestHandler = async (req, res) => {
  const { seller } = res.locals
  res.json(seller)
}

router.get('/', getProfile)

export default router
