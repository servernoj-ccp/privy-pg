import { api } from '@/axios'
import { useLoginWithEmail, usePrivy, useUser, useCreateWallet } from '@privy-io/react-auth'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { InputOtp } from 'primereact/inputotp'
import { InputText } from 'primereact/inputtext'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

export default function () {
  const { refreshUser } = useUser()
  const { createWallet } = useCreateWallet()
  const { loginWithCode, sendCode, state } = useLoginWithEmail({
    onComplete: async ({ isNewUser, user }) => {
      await createWallet()
      if (
        role === 'buyer' && (
          isNewUser || !user.customMetadata?.isBuyer
        )
      ) {
        await api.post('/buyers')
        await refreshUser()
      }
      const returnPath = new URLSearchParams(search).get('return') ?? '../'
      await navigate(returnPath)
    }
  })
  const navigate = useNavigate()
  const { search, pathname } = useLocation()
  const { authenticated } = usePrivy()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const role = pathname?.match(/[/](?<role>[^/]+)[/]login/)?.groups?.role
  const initialTitle = role === 'seller'
    ? 'Continue as a Seller'
    : 'Continue as a Buyer'
  const isWrongState = !authenticated && state.status === 'done'

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    if (state.status === 'initial') {
      await sendCode({ email, disableSignup: role === 'seller' })
    } else if (state.status === 'awaiting-code-input') {
      try {
        await loginWithCode({ code })
      } catch (e) {
        console.error((e as Error).message)
      }
    }
  }
  useEffect(
    () => {
      const run = async () => {
        if (isWrongState) {
          location.reload()
        }
      }
      run()
    },
    [authenticated, state]
  )

  return <div className="flex flex-col h-full justify-center items-center">
    {
      isWrongState
        ? <></>
        : state.status === 'error'
          ? <article className='flex flex-col gap-4'>
            <meta httpEquiv="refresh" content="5;" />
            <h2 className="text-red-600">
              { state.error?.message ?? 'Unknown error' }
            </h2>
            <p>
              You will be automatically redirected to login prompt in a few seconds
            </p>
          </article>
          : state.status === 'initial'
            ? <Card title={initialTitle} className="w-[500px]">
              <div className="w-full">
                <label htmlFor="email" className="font-bold block mb-2">Email</label>
                <form className="p-inputgroup w-full" onSubmit={handleSubmit}>
                  <InputText
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button
                    type="submit"
                    disabled={!email}
                    label="Submit"
                    className='p-button-info'
                  />
                </form>
              </div>
            </Card>
            : state.status === 'awaiting-code-input'
              ? <Card title="Enter confirmation code" className="w-[400px]">
                <form className="w-full" onSubmit={handleSubmit}>
                  <p>
                    Please check <strong>{email}</strong> for an email from StyleVie and enter your code below.
                  </p>
                  <InputOtp
                    length={6}
                    id="otp"
                    value={code}
                    onChange={(e) => setCode(e.value as string)}
                  />
                  <Button
                    type="submit"
                    severity='info'
                    disabled={!code}
                    label="Submit"
                    className='mt-6'
                  />
                </form>
              </Card>
              : <>
                <ProgressSpinner aria-label="Loading" />
              </>
    }
  </div>
}
