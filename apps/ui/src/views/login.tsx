import { useToast } from '@/toast'
import { useLoginWithEmail, usePrivy } from '@privy-io/react-auth'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { InputOtp } from 'primereact/inputotp'
import { InputText } from 'primereact/inputtext'
import { PropsWithChildren, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

type Props = {
  disableSignup?: boolean
}

export default function ({ disableSignup = false }: PropsWithChildren<Props>) {
  const { loginWithCode, sendCode, state } = useLoginWithEmail({
    onComplete: async ({ isNewUser, user }) => {
      if (
        role === 'seller' &&
        user.customMetadata?.role !== 'seller'
      ) {
        errorHandler(new Error('Invalid role'))
        await new Promise<void>(
          resolve => {
            const timer = setTimeout(
              () => {
                clearTimeout(timer)
                resolve()
              },
              3000
            )
          }
        )
        await logout()
        location.reload()
      } else {
        const returnPath = new URLSearchParams(search).get('return') ?? '../'
        await navigate(returnPath)
      }
    }
  })
  const { errorHandler } = useToast()
  const navigate = useNavigate()
  const { search, pathname } = useLocation()
  const { authenticated, logout } = usePrivy()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const role = pathname?.match(/[/](?<role>[^/]+)[/]login/)?.groups?.role
  const initialTitle = role === 'seller'
    ? 'Login'
    : 'SignIn / SignUp'

  const handleSubmit = async (ev: any) => {
    ev.preventDefault()
    if (state.status === 'initial') {
      await sendCode({ email, disableSignup })
    } else if (state.status === 'awaiting-code-input') {
      await loginWithCode({ code })
    }
  }
  useEffect(
    () => {
      const run = async () => {
        if (!authenticated && state.status === 'done') {
          location.reload()
        }
      }
      run()
    },
    [authenticated, state]
  )

  return <div className="flex flex-col h-full justify-center items-center">
    {
      state.status === 'initial'
        ? <Card title={initialTitle} className="w-[400px]">
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
                onClick={handleSubmit}
              />
            </form>
          </div>
        </Card>
        : <Card title="Enter confirmation code" className="w-[400px]">
          <form className="w-full" onSubmit={handleSubmit}>
            <p>
              Please check {email} for an email from StyleVie and enter your code below.
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
              onClick={handleSubmit}
            />
          </form>
        </Card>
    }
    <pre>{JSON.stringify({ role, authenticated, state: state.status })}</pre>
  </div>
}
