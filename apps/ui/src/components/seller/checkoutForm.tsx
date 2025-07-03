import React, { useState } from 'react'
import {
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Button } from 'primereact/button'
import { useToast } from '@/toast'
import { api } from '@/axios'
import { useQuery } from '@tanstack/react-query'
import { PaymentMethod } from '@stripe/stripe-js'
import { UserAttr } from 'api/src/db/models'
import { Chip } from 'primereact/chip'

type CreateIntentResponse = {
  clientSecret: string
}

type Props = {
  profile: UserAttr
}

export default function ({ profile }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const { errorHandler, successHandler } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethodId, setPaymentMethodId] = useState(profile.payment_method_id)

  const paymentMethodQuery = useQuery({
    queryKey: ['payment-method', paymentMethodId],
    queryFn: ({ queryKey: [, id] }) => api.get<PaymentMethod>(`/seller/stripe/payment-method/${id}`),
    enabled: !!paymentMethodId
  })


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) {
      return
    }
    try {
      setIsLoading(true)
      const { clientSecret } = await api.post<CreateIntentResponse>('/seller/setup/create-intent')
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          metadata: { },
          card: elements.getElement('card')!
        }
      })
      if (error) {
        throw error
      }
      if (setupIntent) {
        successHandler('Payment method updated')
        const { payment_method } = setupIntent
        setPaymentMethodId(payment_method as string)
      }
    } catch (e) {
      const error = e as Error
      errorHandler(error)
      console.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <CardElement id="card-element" />
      <section className="mt-8 flex justify-between">
        <Button type="submit" disabled={isLoading || !stripe || !elements} >
          {
            paymentMethodId ? 'Update' : 'Add'
          }
        </Button>
        {
          paymentMethodQuery.isSuccess && paymentMethodQuery.data.card &&
          <Chip
            label={`${paymentMethodQuery.data.card.brand}: ...${paymentMethodQuery.data.card.last4}`}
            icon="pi pi-credit-card" />
        }
      </section>
    </form>
  )
}
