import { useState } from 'react'
import { loadConnectAndInitialize, type StripeConnectInstance } from '@stripe/connect-js'
import { ConnectAccountOnboarding, ConnectComponentsProvider } from '@stripe/react-connect-js'
import { useToast } from '@/toast'
import { ProgressSpinner } from 'primereact/progressspinner'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'

export default function Onboarding () {
  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null)
  const { errorHandler } = useToast()
  const [publishableKey, setPublishableKey] = useState<string>()
  const [clientSecret, setClientSecret] = useState<string>()

  const submitHandler = async () => {
    try {
      const stripeConnect = loadConnectAndInitialize({
        publishableKey: publishableKey!,
        fetchClientSecret: async () => clientSecret!
      })
      setConnectInstance(stripeConnect)
    } catch (err) {
      console.error('Stripe init failed:', err)
    }
  }

  return !connectInstance
    ? <form className='flex flex-col gap-4'>
      <InputText
        placeholder="Publishable key"
        value={publishableKey}
        onChange={
          (e) => setPublishableKey(e.target.value)
        }
      />
      <InputText
        placeholder="Client secret"
        value={clientSecret}
        onChange={
          (e) => setClientSecret(e.target.value)
        }
      />
      <Button
        disabled={!clientSecret || !publishableKey}
        severity="secondary"
        label="Start"
        onClick={submitHandler} />
    </form>
    : <article className='h-full overflow-y-auto p-8 flex justify-center'>
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
