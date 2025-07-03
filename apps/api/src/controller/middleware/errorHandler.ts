import { ErrorRequestHandler } from 'express'
import { isHttpError } from 'http-errors-enhanced'

const handler: ErrorRequestHandler = (err, req, res, next) => {
  if (isHttpError(err)) {
    console.error(err.serialize(true, true))
    res.status(err.status).json(
      err.serialize(
        true,
        true
      )
    )
  } else {
    console.error(err.message)
    res.status(500).type('text/plain').send('Unknown server error')
  }
}

export default handler
