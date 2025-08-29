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

type Shipping = StripeAddressElementChangeEvent['value']

export default function () {
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
