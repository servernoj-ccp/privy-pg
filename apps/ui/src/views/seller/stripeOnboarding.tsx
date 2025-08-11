import { useEffect, useState } from 'react'
import { loadConnectAndInitialize, type StripeConnectInstance } from '@stripe/connect-js'
import { api } from '@/axios'
import { ConnectAccountOnboarding, ConnectComponentsProvider } from '@stripe/react-connect-js'
import { useToast } from '@/toast'

type CrowdSplitResponseKYC = {
  stripe: {
    connected_account: {
      clientSecret?: string,
      publishableKey?: string,
      status?: 'approved' | 'awaiting_confirmation'
    }
  },
  bridge: {
    customer: {
      kycLink?: string
      tosLink?: string
      status?: 'approved' | 'awaiting_confirmation'
    }
  }
}

export default function Onboarding () {
  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null)
  const { errorHandler } = useToast()

  useEffect(() => {
    let isMounted = true

    async function initStripe () {
      try {
        const { stripe } = await api.get<CrowdSplitResponseKYC>('cs/sellers/kyc')
        if (!isMounted) {
          return
        }
        const connectInitData = {
          publishableKey: stripe.connected_account.publishableKey ?? '',
          fetchClientSecret: async () => stripe.connected_account.clientSecret ?? ''
        }

        const stripeConnect = loadConnectAndInitialize(connectInitData)

        setConnectInstance(stripeConnect)
      } catch (err) {
        console.error('Stripe init failed:', err)
      }
    }

    initStripe()

    return () => {
      isMounted = false
    }
  }, [])

  if (!connectInstance) {
    return <p>Loading Stripe onboarding…</p>
  }

  return <article className='h-full overflow-y-auto p-8 flex justify-center'>
    <section className='w-full lg:w-3/4 lg:min-w-[600px] lg:max-w-[900px]'>
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <ConnectAccountOnboarding
          onLoadError={
            ({ error }) => {
              errorHandler(error)
            }
          }
          onExit={() => {
            console.log('The account has exited onboarding')
          }}
        />
      </ConnectComponentsProvider>
    </section>
  </article>
}
