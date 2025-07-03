import { RequestHandler } from 'express'
import { Receipt } from '@/db/models'
import { NotFoundError } from 'http-errors-enhanced'

const handler: RequestHandler = async (req, res) => {
  const { receipt_id } = res.locals.parsed.params
  const receipt = await Receipt.findByPk(
    receipt_id
  ) as Receipt
  if (!receipt) {
    throw new NotFoundError(`Receipt '${receipt_id}' not found`)
  }
  await receipt.update({
    refund_status: 'denied'
  })
  res.sendStatus(200)
}

export default handler
