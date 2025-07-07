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

export { throttler, catcher, catcherWithContext, sleep }
