type SupportedChain = 'polygon' | 'celo'
type CryptoCurrency = 'usdc'
type FiatCurrency = 'usd'
type FiatPaymentRail = 'ach'
type CryptoPaymentRail = SupportedChain

type Address = {
  street_line_1: string
  street_line_2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

type UBO = {
  first_name: string
  last_name: string
  birth_date: string
  email: string
  phone: string
  tax_identification_number: string
  address: Address
  has_ownership: boolean
  has_control: boolean
  is_signer: boolean
  relationship_established_at: string
  gov_id_image_front: string
}

type CustomerCapability = 'pending' | 'active' | 'inactive' | 'rejected'

type EventObjectTransfer = {
  id: string
  state:
    | 'awaiting_funds'
    | 'in_review'
    | 'funds_received'
    | 'payment_submitted'
    | 'payment_processed'
    | 'canceled'
    | 'error'
    | 'returned'
    | 'refunded'
  amount: string
  source: TransferTemplateCreateInput['source']
  destination: TransferTemplateCreateInput['destination']
  on_behalf_of: string
}

type EventObjectVirtualAccountActivity = {
  id: string
  type:
    | 'funds_received'
    | 'payment_submitted'
    | 'payment_processed'
    | 'in_review'
    | 'refund'
    | 'microdeposit'
    | 'account_update'
    | 'deactivation'
    | 'activation'
    amount: string
    virtual_account_id: string
    customer_id: string
    currency: FiatCurrency
    source: Record<string, unknown>
    destination_tx_hash: string
}

type EventObjectKYC = {
  id: string
  email: string
  kyc_link: string
  tos_link: string
  full_name: string
  kyc_status:
    | 'not_started'
    | 'pending'
    | 'incomplete'
    | 'awaiting_ubo'
    | 'manual_review'
    | 'under_review'
    | 'approved'
    | 'rejected'
  tos_status: 'approved' | 'pending'
  customer_id: string
  rejection_reasons: Array<{
    developer_reason: string
    reason: string
  }>
}

type EventObjectCustomer = {
  id: string
  first_name: string
  last_name: string
  email: string
  status:
    | 'not_started'
    | 'incomplete'
    | 'awaiting_ubo'
    | 'under_review'
    | 'active'
    | 'rejected'
    | 'paused'
    | 'offboarded'
  capabilities: {
    payin_crypto: CustomerCapability
    payout_crypto: CustomerCapability
    payin_fiat: CustomerCapability
    payout_fiat: CustomerCapability
  }
  future_requirements_due: Array<string>
  requirements_due: Array<string>
  rejection_reasons: Array<{
    developer_reason: string
    reason: string
  }>
  has_accepted_terms_of_service: boolean
  endorsements: Array<{
    name: 'base' | 'sepa'
    status: 'incomplete' | 'approved' | 'revoked'
    additional_requirements?: Array<string>
    requirements: {
      missing: {
        all_of: Array<string>
      }
    }
  }>
}


type EventMutation = 'created' | 'updated' | 'updated.status_transitioned'

type EventPayloadBase = {
  api_version: 'v0'
  event_id: string
  event_object_id: string
  event_created_at: string
}

type EventObject<C> = C extends 'kyc_link'
  ? EventObjectKYC
  : C extends 'customer'
    ? EventObjectCustomer
    : C extends 'virtual_account.activity'
      ? EventObjectVirtualAccountActivity
      : EventObjectTransfer

type EventPayloadObject<C extends 'kyc_link' | 'customer' | 'transfer' | 'virtual_account.activity'> = {
  event_category: C
  event_type: `${C}.${EventMutation}`
  event_object: EventObject<C>
  event_object_changes?: {
    [k in keyof  EventObject<C>]: [EventObject<C>[k], EventObject<C>[k]]
  }
}

type EventPayloadOr =
  | EventPayloadObject<'kyc_link'>
  | EventPayloadObject<'customer'>
  | EventPayloadObject<'transfer'>
  | EventPayloadObject<'virtual_account.activity'>

type EventPayload = EventPayloadBase & EventPayloadOr

type ListResponse<T = any> = {
  count: number
  data: Array<T>
}

type VirtualAccountCreateInput = {
    source: {
      currency: FiatCurrency
    },
    destination: {
      currency: CryptoCurrency,
      payment_rail: CryptoPaymentRail,
      address: string
    }
}

type VirtualAccount = {
    id: string
    status: 'activated' | 'deactivated'
    currency: CryptoCurrency
    source_deposit_instructions: {
      currency: VirtualAccountCreateInput['source']['currency']
      bank_name: string
      bank_address: string
      bank_routing_number: string
      bank_account_number: string
      bank_beneficiary_name: string,
      bank_beneficiary_address: string
    },
    destination: VirtualAccountCreateInput['destination']
}

type LiquidationAddress = {
	id: string
	chain: SupportedChain
	address: string
	currency: CryptoCurrency
	external_account_id: string
	destination_payment_rail: FiatPaymentRail
	destination_currency: FiatCurrency
	state: 'active' | 'deactivated'
}

type LiquidationAddressCreateInput = {
  chain: SupportedChain
  currency: CryptoCurrency
  external_account_id: string
  destination_payment_rail: FiatPaymentRail
  destination_currency: FiatCurrency
}


type TransferTemplateCreateInput = {
  on_behalf_of: string
  source: {
    payment_rail: CryptoPaymentRail
    currency: CryptoCurrency
  },
  destination: {
    payment_rail: FiatPaymentRail
    currency: FiatCurrency
    external_account_id: string
  },
  features: {
    flexible_amount: true
    allow_any_from_address: true
    static_template: true
  }
}

type TransferTemplate = {
  id: string
  source_deposit_instructions: {
    payment_rail: CryptoPaymentRail
    currency: CryptoCurrency
    to_address: string
  }
  destination: {
    payment_rail: FiatPaymentRail,
    currency: FiatCurrency,
    external_account_id: string
  }
  features: {
    flexible_amount: true
    static_template: true
    allow_any_from_address: true
  }
  state: 'awaiting_funds' | 'canceled'
}

type ExternalAccount = {
  id: string
  account_type: 'us' | 'iban' | 'unknown'
  currency: string
  customer_id: string
  account_owner_name: string
  bank_name: string
  last_4: string
  active: boolean
  beneficiary_address_valid: boolean
  account?: {
    last_4: string
    routing_number: string
    checking_or_savings: 'checking' | 'savings'
  },
  iban?: {
    bic: string
    country: string
    last_4: string
  }
}

export type {
  Address,
  UBO,
  EventObjectKYC as BridgeKYC,
  EventObjectCustomer as BridgeCustomer,
  EventObjectTransfer as BridgeTransfer,
  EventObjectVirtualAccountActivity as BridgeVirtualAccountActivity,
  EventMutation,
  EventPayload,
  ListResponse,
  VirtualAccountCreateInput,
  VirtualAccount,
  TransferTemplate,
  TransferTemplateCreateInput,
  ExternalAccount,
  LiquidationAddress,
  LiquidationAddressCreateInput
}
