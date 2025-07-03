import { Job } from 'bullmq'
import { QueueName } from '.'


type JobPayloadTSC =
| {
  name: 'pledge',
  data: {
    user_id: string
    receipt_id: string
    buyer_wallet_address: string
    amount: number
  }
} | {
  name: 'confirm',
  data: {
    installment_id: string
  }
} | {
  name: 'withdraw',
  data: {
    receipt_id: string
  }
} | {
  name: 'refund',
  data: {
    installment_id: string
  }
}

type JobPayloadDisputes =
| {
  name: 'processDisputeCreated'
  data: {
    dispute_id: string
  }
}
| {
  name: 'processDisputeUpdated'
  data: {
    dispute_id: string
  }
}
| {
  name: 'processDisputeClosed'
  data: {
    dispute_id: string
  }
}
| {
  name: 'processDisputeFundsReinstated'
  data: {
    dispute_id: string
  }
}
| {
  name: 'processDisputeFundsWithdrawn'
  data: {
    dispute_id: string
  }
}
| {
  name: 'processSucceededPaymentIntent'
  data: {
    dispute_id: string
    payment_intent_id: string
    receipt_id: string
  }
}


type JobPayloadRefunds =
| {
  name: 'processSucceededPaymentIntent'
  data: {
    payment_intent_id: string
  }
}
| {
  name: 'processAvailableRecoupment'
  data: {
    receipt_id: string
  }
}
| {
  name: 'processChargeRefunded'
  data: {
    charge_id: string
  }
}

type JobPayloadInstallments =
| {
  name: 'createPaymentIntent'
  data: {
    installment_id: string
  }
}
| {
  name: 'confirmPaymentIntent'
  data: {
    installment_id: string
  }
}
| {
  name: 'processPaidOutPaymentIntent'
  data: {
    installment_id: string
    payout_id: string
  }
}
| {
  name: 'processSucceededPaymentIntent'
  data: {
    installment_id: string
  }
}

type JobPayloads<T extends QueueName> = T extends 'installments'
  ? JobPayloadInstallments
  : T extends 'TSC'
    ? JobPayloadTSC
    : T extends 'refunds'
      ? JobPayloadRefunds
      : T extends 'disputes'
        ? JobPayloadDisputes
        : never
type JobName<T extends QueueName> = JobPayloads<T>['name']
type JobDataMap<T extends QueueName> = {
  [P in JobName<T>]: Extract<JobPayloads<T>, { name: P }>['data'];
}
type NamedJob<T extends QueueName> = {
  [K in JobName<T>]: Job<JobDataMap<T>[K], any, K>
}[JobName<T>]

export type {
  NamedJob
}
