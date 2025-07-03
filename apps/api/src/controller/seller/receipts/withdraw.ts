import { RequestHandler } from 'express'
import { Receipt } from '@/db/models'
import { NotFoundError } from 'http-errors-enhanced'
import { getQueueByName } from '@/workers'

const handler: RequestHandler = async (req, res) => {
  const { user } = res.locals
  const { receipt_id } = res.locals.parsed.params
  const receipt = await Receipt.findByPk(receipt_id)
  if (!receipt || receipt.withdraw_status !== 'available' || receipt.user_id !== user.id) {
    throw new NotFoundError(`Receipt '${receipt_id}' not found or invalid`)
  }
  await getQueueByName('TSC').add('withdraw', {
    receipt_id
  })
  await receipt.update({
    withdraw_status: 'in-progress'
  })
  res.sendStatus(200)
}

export default handler
