import { useCheckout } from '@/components/buyer/checkoutProvider'
import { loadStripe } from '@stripe/stripe-js'
import type { Stripe, SetupIntent } from '@stripe/stripe-js'
import { Message } from 'primereact/message'
import { useState, useEffect, useRef } from 'react'

export default function () {
  const isMounted = useRef(false)
  const [status, setStatus] = useState<SetupIntent.Status>()
  const { reset: checkoutReset } = useCheckout()

  const onMount = async () => {
    const url = new URLSearchParams(window.location.search)
    const stripe = await loadStripe(import.meta.env.VITE_STRIPE_KEY) as Stripe
    const { setupIntent } = await stripe.retrieveSetupIntent(
      url.get('setup_intent_client_secret') as string
    )
    if (setupIntent?.status === 'succeeded') {
      checkoutReset()
    }
    setStatus(setupIntent?.status)
  }
  useEffect(
    () => {
      if (!isMounted.current) {
        onMount()
        isMounted.current = true
      }
    },
    []
  )
  return (
    <div className="h-full flex flex-col gap-4">
      {
        status === 'succeeded'
          ? <>
            <Message severity='success' text='Payment successful' className='flex justify-start' />
          </>
          : (
            status === 'requires_payment_method' &&
            <Message severity="error" text="Payment failed" className='flex justify-start'/>
          )
      }
    </div>
  )
}
