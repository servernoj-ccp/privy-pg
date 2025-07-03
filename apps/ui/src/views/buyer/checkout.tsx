import { useCheckout } from '@/components/buyer/checkoutProvider'
import { usePrivy, useUser } from '@privy-io/react-auth'
import { useToast } from '@/toast'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/axios'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, StripeAddressElementChangeEvent } from '@stripe/stripe-js'
import CheckoutForm from '@/components/buyer/checkoutForm'
import { useNavigate } from 'react-router'
import { Card } from 'primereact/card'
import { intervalMapping } from './shopping'

type CreateIntentResponse = {
  clientSecret: string
  customerSessionClientSecret: string
  customerShipping: StripeAddressElementChangeEvent['value'] | null
  processTaxes: boolean
}
type CreateIntentInput = {
  email: string
  amount: number
  installments: number
  interval?: number
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY)

export default function () {
  const { state: { email, amount, installments, installmentsInterval } } = useCheckout()
  const navigate = useNavigate()
  const checkoutReady = !!email && !!amount
  const [clientSecret, setClientSecret] = useState('')
  const [sessionSecret, setSessionSecret] = useState('')
  const [processTaxes, setProcessTaxes] = useState(false)
  const [customerShipping, setCustomerShipping] = useState<CreateIntentResponse['customerShipping']>()
  const clientSecretFetched = useRef(false)
  const { user: buyer } = usePrivy()
  const { errorHandler } = useToast()
  const { refreshUser } = useUser()

  useEffect(() => {
    if (!checkoutReady) {
      navigate('/buyer')
    }
  }, [checkoutReady])
  useEffect(
    () => {
      if (
        checkoutReady &&
        !clientSecret &&
        !clientSecretFetched.current
      ) {
        clientSecretFetched.current = true
        const createIntent = async () => {
          try {
            await api.post<CreateIntentResponse, CreateIntentInput>(
              '/buyer/create-intent', {
                email,
                amount,
                installments,
                interval: intervalMapping[installmentsInterval].value
              }).then(
              async data => {
                setClientSecret(data.clientSecret)
                setSessionSecret(data.customerSessionClientSecret)
                setCustomerShipping(data.customerShipping)
                setProcessTaxes(data.processTaxes)
                await refreshUser()
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

  return checkoutReady && clientSecret && (
    <article
      className='flex-grow flex flex-col gap-4 overflow-y-hidden w-full lg:w-3/4 lg:min-w-[600px] lg:max-w-[900px]'
    >
      <section className="px-1">
        <Card title="Order summary">
          <p className="m-0">
        You will pay <strong>${amount}</strong> to the seller with email <strong>{email}</strong>
          </p>
        </Card>
      </section>
      <div className='flex-grow overflow-y-auto'>
        <Elements
          options={{
            clientSecret,
            customerSessionClientSecret: sessionSecret
          }}
          stripe={stripePromise} >
          <CheckoutForm
            customerShipping={customerShipping!}
            processTaxes={processTaxes}
          />
        </Elements>
      </div>
    </article>
  )
}
