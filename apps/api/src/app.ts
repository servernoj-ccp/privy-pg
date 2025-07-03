import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import controller from '@/controller'
import { errorHandler } from '@/controller/middleware'
import cookieParser from 'cookie-parser'

const ignoreLoggingOn = [
  '/admin/bullmq/static',
  '/admin/bullmq'
]
const app = express()
app.use(
  cors({
    origin: (origin, cb) => {
      const allowedOrigins = process.env.CLIENT_ORIGIN?.split(/\s*[|]\s*/) ?? []
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true)
      } else {
        cb(new Error('Not allowed origin'))
      }
    },
    credentials: true
  })
)
app.use(morgan('dev', {
  skip: req => ignoreLoggingOn.includes(req.baseUrl)
}))
app.use(cookieParser())
app.use('/', controller)
app.use(errorHandler)
app.use(/(.*)/, (req, res) => {
  res.status(404).contentType('text/plain').send('Not found')
})

export { app }
