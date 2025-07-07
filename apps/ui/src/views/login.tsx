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
  const initialTitle = disableSignup
    ? 'Login'
    : 'SignIn / SignUp'
  const { loginWithCode, sendCode, state } = useLoginWithEmail()
  const navigate = useNavigate()
  const { search } = useLocation()
  const { authenticated } = usePrivy()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')

  const handleSubmit = async () => {
    if (state.status === 'initial') {
      await sendCode({ email, disableSignup })
    } else if (state.status === 'awaiting-code-input') {
      await loginWithCode({ code })
    }
  }
  useEffect(
    () => {
      const run = async () => {
        if (authenticated && state.status === 'done') {
          const returnPath = new URLSearchParams(search).get('return') ?? '../'
          await navigate(returnPath)
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
            <div className="p-inputgroup w-full">
              <InputText
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                disabled={!email}
                label="Submit"
                className='p-button-info'
                onClick={handleSubmit}
              />
            </div>
          </div>
        </Card>
        : <Card title="Enter confirmation code" className="w-[400px]">
          <div className="w-full">
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
              severity='info'
              disabled={!code}
              label="Submit"
              className='mt-6'
              onClick={handleSubmit}
            />
          </div>
        </Card>
    }
    <pre>{JSON.stringify({ authenticated, state: state.status })}</pre>
  </div>
}
