import { z } from 'zod/v4'
import { BadRequestError } from 'http-errors-enhanced'
import { Request, RequestHandler } from 'express'
import { isEmpty, toPairs } from 'lodash-es'

type SchemaKey = 'query' | 'params' | 'headers' | 'body' | 'cookies'

type CombinedSchema = Partial<{
  [key in SchemaKey]: z.ZodSchema
}>

const getDataExtractor = (req: Request) => (key: SchemaKey) => {
  // non-trivial logic introduced for future complex scenarios
  switch (key) {
    case 'query':
      return req.parsedQuery ?? req.query
    case 'params':
      return req.params
    case 'body':
      return req.body
    case 'headers':
      return req.headers
    case 'cookies':
      return req.cookies
  }
}

const handler = (schema: CombinedSchema): RequestHandler => {
  return (req, res, next) => {
    const dataExtractor = getDataExtractor(req)
    const result = toPairs(schema).reduce(
      (a, [k, v]) => {
        const key = k as SchemaKey
        if (!isEmpty(schema[key])) {
          const result = v.safeParse(dataExtractor(key))
          if (result.success) {
            a.data[key] = result.data
          } else {
            a.errors[key] = result.error.issues
          }
        }
        return a
      },
      {
        data: {} as Record<SchemaKey, unknown>,
        errors: {} as Record<SchemaKey, Array<z.ZodIssue>>
      }
    )
    if (isEmpty(result.errors)) {
      if (!res.locals.parsed) {
        res.locals.parsed = {}
      }
      Object.entries(result.data).forEach(
        ([key, value]) => {
          const storedForKey = res.locals.parsed?.[key] ?? {}
          Object.assign(res.locals.parsed, {
            [key as SchemaKey]: {
              ...storedForKey,
              ...(
                value
                  ? value
                  : {}
              )
            }
          })
        }
      )
      next()
    } else {
      next(new BadRequestError('Invalid request', result.errors))
    }
  }
}

export default handler
