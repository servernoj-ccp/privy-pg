import { usePrivy } from '@privy-io/react-auth'
import { useToast } from '@/toast'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/axios'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import CheckoutForm from '@/components/checkoutForm'
import { useNavigate } from 'react-router'
import { Card } from 'primereact/card'

type CreateIntentResponse = {
  clientSecret: string
  publishableKey: string
}

export default function () {
  const navigate = useNavigate()
  const [clientSecret, setClientSecret] = useState('')
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null>>()
  const clientSecretFetched = useRef(false)
  const { user: buyer } = usePrivy()
  const { errorHandler } = useToast()

  useEffect(
    () => {
      if (
        !clientSecret &&
        !clientSecretFetched.current
      ) {
        clientSecretFetched.current = true
        const createIntent = async () => {
          try {
            await api.post<CreateIntentResponse>('cs/buyers/create-intent').then(
              async data => {
                setClientSecret(data.clientSecret)
                setStripePromise(
                  loadStripe(data.publishableKey)
                )
              }
            )
          } catch (e) {
            errorHandler(e)
            navigate('/buyer')
          }
        }
        createIntent()
      }
    },
    [buyer, clientSecret]
  )

  return clientSecret && stripePromise && (
    <article
      className='flex-grow flex flex-col gap-4 overflow-y-hidden w-full lg:w-3/4 lg:min-w-[600px] lg:max-w-[900px]'
    >
      <Card title="Order summary" className="px-1"/>
      <div className='flex-grow overflow-y-auto'>
        <Elements
          options={{
            clientSecret
          }}
          stripe={stripePromise} >
          <CheckoutForm/>
        </Elements>
      </div>
    </article>
  )
}
