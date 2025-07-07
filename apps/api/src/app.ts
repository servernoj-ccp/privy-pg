import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import controller from '@/controller'
import { errorHandler } from '@/controller/middleware'
import cookieParser from 'cookie-parser'

const app = express()
app.use(cors())
app.use(morgan('dev'))
app.use(cookieParser())
app.use('/', controller)
app.use(errorHandler)
app.use(/(.*)/, (req, res) => {
  res.status(404).contentType('text/plain').send('Not found')
})

export { app }
