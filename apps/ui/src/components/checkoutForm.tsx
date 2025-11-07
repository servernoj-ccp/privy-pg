import React, { useState } from 'react'
import {
  PaymentElement,
  AddressElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Button } from 'primereact/button'
import { useToast } from '@/toast'
import { StripeAddressElementChangeEvent } from '@stripe/stripe-js'
import { Card } from 'primereact/card'
import { api } from '@/axios'

type Shipping = StripeAddressElementChangeEvent['value']

type Props = {
  publishableKey: string
  paymentMethodId: string
}

export default function (props: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const { errorHandler } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [shipping, setShipping] = useState<Shipping>()
  const [shippingComplete, setShippingComplete] = useState(false)
  const handleAddressChange = async (e: StripeAddressElementChangeEvent) => {
    const { name, address } = e.value ?? {}
    setShippingComplete(e.complete)
    setShipping({ name, address })
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) {
      return
    }
    try {
      setIsLoading(true)
      // -- this call can be potentially moved into `handleAddressChange()`
      await api.patch('/cs/buyers/customer', shipping)
      // -- Emulate order placement
      const order_id = '1eb755ec-9b40-4d0d-8310-007fc7a73374'
      // const order_id = '044d6682-a89a-4f18-96a0-c5c78f4eca6f'
      // -- Update setup intent metadata
      await api.patch(`/cs/buyers/intent/${props.paymentMethodId}/metadata`, {
        order_id
      })
      // -- confirm the setup intent without declaring specific payment amount
      await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${location.origin}/buyer/status`
        }
      })
    } catch (error) {
      errorHandler(error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form
      id="payment-form"
      onSubmit={handleSubmit}
      className='flex flex-col gap-4 px-1'
    >
      {
        <Card title="Shipping info">
          <AddressElement
            onChange={handleAddressChange}
            options={{
              mode: 'shipping',
              defaultValues: shipping ?? undefined,
              allowedCountries: ['US'],
              autocomplete: {
                mode: 'automatic'
              },
              blockPoBox: true
            }}
            id="address-element"
          />
        </Card>
      }
      <Card title="Payment method" className="">
        <PaymentElement id="payment-element" />
      </Card>
      <section>
        <Button
          size='small'
          type="submit"
          disabled={isLoading || !stripe || !elements || !shippingComplete}
          className="mt-8">
        Pay
        </Button>
      </section>
    </form>
  )
}
