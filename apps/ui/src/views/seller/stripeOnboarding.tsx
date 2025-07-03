import { loadConnectAndInitialize } from '@stripe/connect-js'
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider
} from '@stripe/react-connect-js'
import { useState } from 'react'
import { api } from '@/axios'
import { useToast } from '@/toast'

type StripeSessionResponse = {
  clientSecret: string
}

export default () => {
  const { errorHandler } = useToast()
  const [isError, setIsError] = useState(false)
  const [stripeConnectInstance] = useState(
    () => {
      const fetchClientSecret = async () => {
        try {
          const { clientSecret } = await api.get<StripeSessionResponse>('/seller/stripe/sessions/onboarding')
          return clientSecret
        } catch (e) {
          setIsError(true)
          errorHandler(e)
        }
      }
      return loadConnectAndInitialize({
        publishableKey: import.meta.env.VITE_STRIPE_KEY,
        fetchClientSecret: fetchClientSecret as any
      })
    }
  )

  return isError
    ? <h3 className='text-red-700'>Unable to initialize embedded onboarding</h3>
    : <article className='h-full overflow-y-auto p-8 flex justify-center'>
      <section className='w-full lg:w-3/4 lg:min-w-[600px] lg:max-w-[900px]'>
        <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
          <ConnectAccountOnboarding
            onExit={() => {
              console.log('The account has exited onboarding')
            }}
          />
        </ConnectComponentsProvider>
      </section>
    </article>
}
