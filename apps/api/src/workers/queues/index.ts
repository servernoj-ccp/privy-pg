import { Queue } from 'bullmq'
import Redis from 'ioredis'

const getQueues = (connection: Redis) => [
  new Queue('installments', {
    connection,
    defaultJobOptions: {
      attempts: 10,
      backoff: {
        type: 'fixed',
        delay: 24 * 3600 * 1000
      }
    }
  }),
  new Queue('refunds', {
    connection,
    defaultJobOptions: {
      attempts: 10,
      backoff: {
        type: 'fixed',
        delay: 24 * 3600 * 1000
      }
    }
  }),
  new Queue('disputes', {
    connection,
    defaultJobOptions: {
      attempts: 10,
      backoff: {
        type: 'fixed',
        delay: 24 * 3600 * 1000
      }
    }
  }),
  new Queue('TSC', {
    connection,
    defaultJobOptions: {
      attempts: 10,
      backoff: {
        type: 'fixed',
        delay: 24 * 3600 * 1000
      }
    }
  })
]

export {
  getQueues
}

