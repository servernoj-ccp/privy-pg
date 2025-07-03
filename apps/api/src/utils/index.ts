const throttler = <In = any, Out = any>(
  {
    array,
    handler,
    bulkHandler,
    bulkSize = 10
  }: {
    array: In[],
    bulkSize?: number
    } & (
      {
        handler: (item: In) => Promise<Out>,
        bulkHandler?: never
      } | {
        handler?: never,
        bulkHandler: (item: In[]) => Promise<Out[]>
      }
    )
): Promise<Out[]> => {
  const numGroups = Math.ceil(array.length / bulkSize)
  const groups = Array(numGroups).fill([]).map((_, index) => {
    const start = index * bulkSize
    const end = start + bulkSize
    return array.slice(start, end)
  })
  const bulkHandlerMultiplexed = bulkHandler || ((g: In[]) => Promise.all(g.map(handler)))
  return groups.reduce(
    (p, g) => p.then(
      prev => bulkHandlerMultiplexed(g).then(current => [...prev, ...current])
    ),
    Promise.resolve([] as Out[])
  )
}

const catcher = (error: Error) => {
  console.error(error.message)
  return null
}

const catcherWithContext = (action: string, context: any = {}) => (error: Error) => {
  console.error(`Action '${action}' failed: ${error.message}`, context)
  return null
}

const bigIntToString = (obj: any): any => {
  if (typeof obj === 'bigint') {
    return obj.toString()
  } else if (Array.isArray(obj)) {
    return obj.map(bigIntToString)
  } else if (typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, bigIntToString(v)]))
  }
  return obj
}

const sleep = (delayInMs: number) => new Promise<void>(
  resolve => {
    const timer = setTimeout(
      () => {
        clearTimeout(timer)
        resolve()
      },
      delayInMs
    )
  }
)

const toCents = (amount:number) => Math.round(amount * 100)
const fromCents = (amount:number) => amount / 100

const roundToCents = (amount:number) => Math.round(amount * 100) / 100


export { throttler, catcher, catcherWithContext, bigIntToString, toCents, fromCents, roundToCents, sleep }
