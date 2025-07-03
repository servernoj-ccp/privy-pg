import { BadRequestError, InternalServerError, isHttpError } from 'http-errors-enhanced'
import { RequestHandler } from 'express'
import crypto from 'node:crypto'
import { EventPayload } from '@/@types/bridge'
import { User } from '@/db/models'

const PUBLIC_KEY = process.env.BRIDGE_WEBHOOK_PUBLIC_KEY!

const supportedEvents = [
  'kyc_link.created',
  'customer.created',
  'customer.updated',
  'customer.updated.status_transitioned',
  'transfer.updated.status_transitioned',
  'virtual_account.activity.created'
]

const signatureVerifyer = (body: string, signature: string, timestamp: string) => {
  const hash = crypto.createHash('SHA256')
  hash.update(timestamp + '.' + body)
  const verifier = crypto.createVerify('SHA256')
  verifier.update(hash.digest())
  verifier.end()
  return verifier.verify(PUBLIC_KEY, Buffer.from(signature, 'base64'))
}

const handler: RequestHandler = async (req, res, next) => {
  try {
    const signatureHeader = req.headers['x-webhook-signature'] as string
    if (!signatureHeader) {
      throw new BadRequestError('Malformed signature header')
    }
    const [, timestamp, signature] = signatureHeader.match(/^t=(\d+),v0=(.*)$/) || []
    if (!timestamp || !signature) {
      throw new BadRequestError('Malformed signature header')
    }
    if (new Date(parseInt(timestamp, 10)) < new Date(Date.now() - 10 * 60 * 1000)) {
      throw new BadRequestError('Invalid signature')
    }
    if (!signatureVerifyer(req.body, signature, timestamp)) {
      throw new BadRequestError('Invalid signature')
    }
    const parsedBody = JSON.parse(req.body) as EventPayload
    if (supportedEvents.includes(parsedBody.event_type)) {
      const {
        event_id,
        event_object,
        event_type
      } = parsedBody
      console.log('B------------', event_type, event_id, event_object?.id)
      switch (event_type) {
        case 'customer.updated': {
          const user = await User.findOne({
            where: {
              bridge_id: event_object.id
            }
          })
          if (user) {
            await user.update({
              bridge_onboarded: event_object.status === 'active'
            })
            const newState = user.bridge_onboarded
              ? 'now'
              : 'no longer'
            console.log(`User ${user.email} is ${newState} Bridge onboarded`)
          }
          break
        }
        case 'transfer.updated.status_transitioned': {
          if (event_object.state === 'payment_processed') {
            const { source, destination, amount, on_behalf_of: customer } = event_object
            console.log({ source, destination, amount, customer })
          }
          break
        }
        case 'virtual_account.activity.created': {
          if (event_object.type === 'payment_processed') {
            const { customer_id, amount, destination_tx_hash } = event_object
            console.log({
              on_ramp_tx_hash: destination_tx_hash,
              customer_id,
              amount
            })
          }
          break
        }
      }
    }
    res.sendStatus(200)
  } catch (error) {
    if (isHttpError(error)) {
      next(error)
    } else {
      next(new InternalServerError(error as Error))
    }
  }
}

export default handler

