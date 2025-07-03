import Redis from 'ioredis'
import { Worker, Processor, Queue, Job } from 'bullmq'
import { getQueues } from './queues'
import * as processors from './processors'
import chalk from 'chalk'

type QueueName = keyof typeof processors
type JobDataExtractor<T> =  T extends Processor<infer U> ? U : never
type JobData = JobDataExtractor<typeof processors[QueueName]>

const queues = {} as Record<string, Queue>
const getQueueByName = (name: string) => queues?.[name] ?? null

class JobError extends Error {
  public readonly isCritical: boolean
  public readonly cause?: Error
  constructor (
    messageOrError: string | Error,
    isCritical: boolean = false,
    cause?: Error
  ) {
    const message = typeof messageOrError === 'string' ? messageOrError : messageOrError.message
    super(message)

    this.name = new.target.name
    this.isCritical = isCritical
    this.cause = cause ?? (messageOrError instanceof Error ? messageOrError : undefined)

    Object.setPrototypeOf(this, new.target.prototype)

    if (messageOrError instanceof Error) {
      if (messageOrError.stack) {
        this.stack = messageOrError.stack
      }
      for (const key of Object.keys(messageOrError)) {
        if (!(key in this)) {
          (this as any)[key] = (messageOrError as any)[key]
        }
      }
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target)
    }
  }
}

const printJobStatus = (job: Job, status: 'started' | 'failed' | 'errored' | 'canceled' | 'succeeded', ...args: any[]) => {
  switch (status) {
    case 'started':
      console.log(chalk.cyan(`>>> ${job.queueName}: job '${job.name}' ${status}`))
      break
    case 'succeeded':
      console.log(chalk.green(`>>> ${job.queueName}: job '${job.name}' ${status}`))
      break
    case 'canceled':
    case 'failed':
    case 'errored':
      console.error(chalk.red(`>>> ${job.queueName}: job '${job.name}' ${status}`))
      console.error(chalk.red(JSON.stringify(args, null, 2)))
      break
  }
}

const testRedis = () => new Promise(
  (resolve, reject) => {
    const redis = new Redis(process.env.REDIS_URL as string)
    const handlers = {
      error: reject,
      ready: resolve
    }
    Object.entries(handlers).forEach(
      ([eventName, innerHandler]) => {
        const handler = async (arg: unknown) => {
          redis.off(eventName, handler)
          await redis.quit()
          innerHandler(arg)
        }
        redis.on(eventName, handler)
      }
    )
  }
)

const initQueues = () => {
  const connection = new Redis(process.env.REDIS_URL as string, { maxRetriesPerRequest: null })
  getQueues(connection).forEach(
    q => {
      queues[q.name] = q
    }
  )
}

const initWorkers = () => {
  const connection = new Redis(process.env.REDIS_URL as string, { maxRetriesPerRequest: null })
  const workers = Object.keys(queues)
    .map(
      queueName => {
        const processor = processors?.[queueName as QueueName]
        return processor
          ? new Worker<JobData>(queueName, processor as Processor<JobData>, {
            connection
          })
          : null
      }
    )
    .filter(w => w?.name)
  console.log(`Started workers for queues: ${workers.map(w => `'${w?.name}'`).join(', ')}`
  )
  return async () => {
    await Promise.all(
      workers.map(
        async w => {
          console.warn(`Quitting worker for queue '${w?.name}'...`)
          await w?.close(true)
        }
      )
    )
  }
}

const init = async (withWorkers = false) => {
  await testRedis()
  initQueues()
  return withWorkers
    ? initWorkers()
    : () => {}
}


export {
  getQueueByName,
  init,
  printJobStatus,
  JobError
}
export type {
  QueueName
}
export type { NamedJob } from './types'
