import { Receipt } from '@/db/models'
import { RequestHandler } from 'express'
import { BadRequestError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res) => {
  const { buyer } = res.locals
  const { receipt_id } = res.locals.parsed.body
  const receipt = await Receipt.findOne({
    where: {
      id: receipt_id,
      buyer_id: buyer.id
    }
  })
  if (!receipt) {
    throw new BadRequestError('receipt_id invalid')
  }
  await receipt.update({
    refund_status: 'requested'
  })
  res.sendStatus(200)
}

export default handler
