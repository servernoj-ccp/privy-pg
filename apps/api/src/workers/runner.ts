import { init } from '@/workers'

const runner = async () => {
  try {
    const cleanUpWorkers = await init(true)
    const getShutdownHandler = (signal: string) => {
      const handler = async () => {
        process.off(signal, handler)
        console.warn(`Acting upon '${signal}' signal...`)
        await cleanUpWorkers()
        process.kill(process.pid, signal)
      }
      return handler
    }
    process.on('SIGINT', getShutdownHandler('SIGINT'))
    process.on('SIGTERM', getShutdownHandler('SIGTERM'))
  } catch (err) {
    const { message } = err as Error
    console.error(`Initialization failed: ${message}`)
    process.exit(1)
  }
}

runner()
