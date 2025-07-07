import { init as dbInit } from '@/db'

const port = process.env.PORT ?? 3000

const init = async () => {
  try {
    const sequelize = await dbInit()
    const getShutdownHandler = (signal: string) => {
      const handler = async () => {
        process.off(signal, handler)
        console.warn(`Acting upon '${signal}' signal...`)
        await sequelize.close().catch(console.error)
        process.kill(process.pid, signal)
      }
      return handler
    }
    const { app } = await import('@/app')
    app.listen(port, () => {
      console.log(`listening on port ${port}`)
    })
    process.on('SIGINT', getShutdownHandler('SIGINT'))
    process.on('SIGTERM', getShutdownHandler('SIGTERM'))
  } catch (err) {
    const { message } = err as Error
    console.error(err)
    console.error(`Initialization failed: ${message}`)
    process.exit(1)
  }
}

init()
