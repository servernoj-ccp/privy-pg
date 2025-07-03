import { Dispute, Evidence, Installment, Receipt } from '@/db/models'
import { Op } from 'sequelize'
import { JobError } from '.'

const evidenceMappingByType: Record<Evidence['evidence_type'], {
  kind: Evidence['kind'],
  description: string
}> = {
  access_activity_log: {
    kind: 'text',
    description: 'Any server or activity logs showing proof that the customer accessed or downloaded the purchased digital product. This information should include IP addresses, corresponding timestamps, and any detailed recorded activity. Has a maximum character count of 20,000.'
  },
  billing_address: {
    kind: 'text',
    description: 'The billing address provided by the customer.'
  },
  cancellation_policy: {
    kind: 'file',
    description: 'Your subscription cancellation policy, as shown to the customer.'
  },
  cancellation_policy_disclosure: {
    kind: 'text',
    description: 'An explanation of how and when the customer was shown your refund policy prior to purchase. Has a maximum character count of 20,000.'
  },
  cancellation_rebuttal: {
    kind: 'text',
    description: 'A justification for why the customer’s subscription was not canceled. Has a maximum character count of 20,000.'
  },
  customer_communication: {
    kind: 'file',
    description: 'Any communication with the customer that you feel is relevant to your case. Examples include emails proving that the customer received the product or service, or demonstrating their use of or satisfaction with the product or service'
  },
  customer_email_address: {
    kind: 'text',
    description: 'The email address of the customer.'
  },
  customer_name: {
    kind: 'text',
    description: 'The name of the customer.'
  },
  customer_purchase_ip: {
    kind: 'text',
    description: 'The IP address that the customer used when making the purchase.'
  },
  customer_signature: {
    kind: 'file',
    description: 'A relevant document or contract showing the customer’s signature.'
  },
  duplicate_charge_documentation: {
    kind: 'file',
    description: 'Documentation for the prior charge that can uniquely identify the charge, such as a receipt, shipping label, work order, etc. This document should be paired with a similar document from the disputed payment that proves the two payments are separate.'
  },
  duplicate_charge_explanation: {
    kind: 'text',
    description: 'An explanation of the difference between the disputed charge versus the prior charge that appears to be a duplicate. Has a maximum character count of 20,000.'
  },
  duplicate_charge_id: {
    kind: 'text',
    description: 'The Stripe ID for the prior charge which appears to be a duplicate of the disputed charge.'
  },
  product_description: {
    kind: 'text',
    description: 'A description of the product or service that was sold. Has a maximum character count of 20,000.'
  },
  receipt: {
    kind: 'file',
    description: 'Any receipt or message sent to the customer notifying them of the charge.'
  },
  refund_policy: {
    kind: 'file',
    description: 'Your refund policy, as shown to the customer.'
  },
  refund_policy_disclosure: {
    kind: 'text',
    description: 'Documentation demonstrating that the customer was shown your refund policy prior to purchase. Has a maximum character count of 20,000.'
  },
  refund_refusal_explanation: {
    kind: 'text',
    description: 'A justification for why the customer is not entitled to a refund. Has a maximum character count of 20,000.'
  },
  service_date: {
    kind: 'text',
    description: 'The date on which the customer received or began receiving the purchased service, in a clear human-readable format.'
  },
  service_documentation: {
    kind: 'file',
    description: 'Documentation showing proof that a service was provided to the customer. This could include a copy of a signed contract, work order, or other form of written agreement'
  },
  shipping_address: {
    kind: 'text',
    description: 'The address to which a physical product was shipped. You should try to include as complete address information as possible.'
  },
  shipping_carrier: {
    kind: 'text',
    description: 'The delivery service that shipped a physical product, such as Fedex, UPS, USPS, etc. If multiple carriers were used for this purchase, please separate them with commas.'
  },
  shipping_date: {
    kind: 'text',
    description: 'The date on which a physical product began its route to the shipping address, in a clear human-readable format.'
  },
  shipping_documentation: {
    kind: 'file',
    description: 'Documentation showing proof that a product was shipped to the customer at the same address the customer provided to you. This could include a copy of the shipment receipt, shipping label, etc. It should show the customer’s full shipping address, if possible.'
  },
  shipping_tracking_number: {
    kind: 'text',
    description: 'The tracking number for a physical product, obtained from the delivery service. If multiple tracking numbers were generated for this purchase, please separate them with commas.'
  },
  uncategorized_file: {
    kind: 'file',
    description: 'Any additional evidence or statements.'
  },
  uncategorized_text: {
    kind: 'text',
    description: 'Any additional evidence or statements. Has a maximum character count of 20,000.'
  }
}

const evidenceMappingByReason: Partial<Record<Dispute['reason'], Array<Evidence['evidence_type']>>> = {
  duplicate: [
    'duplicate_charge_id',
    'duplicate_charge_explanation',
    'duplicate_charge_documentation',
    'shipping_documentation',
    'customer_communication',
    'uncategorized_text',
    'uncategorized_file'
  ],
  credit_not_processed: [
    'refund_policy',
    'refund_policy_disclosure',
    'refund_refusal_explanation',
    'customer_communication',
    'uncategorized_text',
    'uncategorized_file'
  ],
  product_not_received: [
    'uncategorized_text',
    'uncategorized_file',
    'customer_communication',
    'customer_signature',
    'shipping_address',
    'shipping_documentation',
    'shipping_date',
    'shipping_carrier',
    'shipping_tracking_number'
  ],
  product_unacceptable: [
    'product_description',
    'customer_communication',
    'refund_policy',
    'refund_policy_disclosure',
    'uncategorized_file',
    'uncategorized_text'
  ],
  fraudulent: [
    'customer_communication',
    'customer_signature',
    'shipping_address',
    'shipping_documentation',
    'shipping_date',
    'shipping_carrier',
    'shipping_tracking_number',
    'uncategorized_file',
    'uncategorized_text'
  ]
}

const updateReceiptDisputeStatus = async (receipt_id: string) => {
  const receipt = await Receipt.findByPk(receipt_id, {
    include: [
      {
        model: Installment,
        as: 'installments'
      }
    ]
  }) as Receipt & {
    installments: Array<Installment>
  }
  if (!receipt) {
    return
  }
  const disputes = await Dispute.findAll({
    where: {
      installment_id: {
        [Op.in]: receipt.installments.map(({ id }) => id)
      }
    }
  })
  if (disputes.length === 0) {
    await receipt.update({
      dispute_status: 'none'
    })
    return
  }
  const statuses = disputes.map(d => d.status)
  const isOpen =  statuses.every(
    s => s === 'needs_response'
  )
  const isUnderReview = statuses.some(
    s => s === 'under_review'
  )
  const isWon =  statuses.every(
    s => s === 'won'
  )
  const isLost =  statuses.every(
    s => s === 'lost'
  )
  let aggregateStatus: Receipt['dispute_status'] = 'none'
  if (isOpen) {
    aggregateStatus = 'open'
  } else if (isUnderReview) {
    aggregateStatus = 'under_review'
  } else if (isWon) {
    aggregateStatus = 'won'
  } else if (isLost) {
    aggregateStatus = 'lost'
  } else {
    aggregateStatus = 'mixed'
  }
  await receipt.update({ dispute_status: aggregateStatus })
}

const updateReceiptStatus = async (receipt_id: string) => {
  const receipt = await Receipt.findByPk(receipt_id)
  if (!receipt) {
    throw new JobError(`invalid receipt_id '${receipt_id}'`)
  }
  const allInstallments = await Installment.findAll({
    where: {
      receipt_id
    }
  })
  const isFailed = allInstallments.some(
    ({ status }) => status === 'failed'
  )
  const isPaidFull = allInstallments.every(
    ({ status }) => status === 'paid-in'
  )
  const isPaidPartial = allInstallments.some(
    ({ status }) => status === 'paid-in'
  )
  const receiptStatus: Receipt['status'] = isFailed
    ? 'failed'
    : isPaidFull
      ? 'paid'
      : isPaidPartial
        ? 'in-progress'
        : receipt.status
  await receipt.update({
    status: receiptStatus
  })
}

export {
  evidenceMappingByType,
  evidenceMappingByReason,
  updateReceiptDisputeStatus,
  updateReceiptStatus
}
