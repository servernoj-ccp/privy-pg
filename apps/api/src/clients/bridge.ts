import axios, { type AxiosError } from 'axios'
import { FailedDependencyError } from 'http-errors-enhanced'
import { v4 as uuid } from 'uuid'

const idempotencyKeyURLExceptions = [
  /plaid_exchange_public_token/
]

const bridgeClient = axios.create({
  baseURL: process.env.BRIDGE_BASE_URL
})
bridgeClient.interceptors.response.use(
  r => r.data,
  (error: AxiosError) => {
    const { data, status, headers } = error.response ?? {}
    const wrappedError = new FailedDependencyError(
      'bridge API error',
      { status, data, headers }
    )
    return Promise.reject(wrappedError)
  }
)
bridgeClient.interceptors.request.use(
  r => {
    r.headers['api-key'] = process.env.BRIDGE_API_KEY
    if (
      /^post$/i.test(r.method!) &&
      !r.headers['idempotency-key'] &&
      !idempotencyKeyURLExceptions.every(
        re => re.test(r.url!)
      )
    ) {
      r.headers['idempotency-key'] = uuid()
    }
    return r
  }
)

export default bridgeClient
