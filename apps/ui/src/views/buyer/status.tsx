import { loadStripe, Stripe } from '@stripe/stripe-js'
import { useState, useEffect, useRef } from 'react'

export default function () {
  const isMounted = useRef(false)
  const [params, setParams] = useState<Record<string, string>>()

  const onMount = async () => {
    const url = new URLSearchParams(window.location.search)
    const p = Object.fromEntries(url.entries())
    if (url.get('publishableKey')) {
      const stripe = await loadStripe(url.get('publishableKey')!) as Stripe
      const { setupIntent } = await stripe.retrieveSetupIntent(
        url.get('setup_intent_client_secret') as string
      )
      if (setupIntent) {
        Object.assign(p, { setupIntent })
      }
    }
    setParams(p)
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
  return params && <pre>{JSON.stringify(params, null, 2)}</pre>
}
