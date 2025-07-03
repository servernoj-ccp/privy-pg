import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js'
import { ExpressAdapter } from '@bull-board/express'
import { getQueueByName } from '@/workers'
import { Router } from 'express'

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin/bullmq')
createBullBoard({
  queues: [
    new BullMQAdapter(getQueueByName('installments')),
    new BullMQAdapter(getQueueByName('refunds')),
    new BullMQAdapter(getQueueByName('disputes')),
    new BullMQAdapter(getQueueByName('TSC'))
  ],
  serverAdapter
})

export default serverAdapter.getRouter() as Router
