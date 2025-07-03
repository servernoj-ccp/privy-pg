import { api } from '@/axios'
import { useLogin, useLogout, useModalStatus, usePrivy, useIdentityToken, useUser } from '@privy-io/react-auth'
import { Button } from 'primereact/button'
import { PropsWithChildren, useEffect } from 'react'
import { Outlet } from 'react-router'

interface Props {
  disableSignup?: boolean
}

export default function ({ disableSignup = false }: PropsWithChildren<Props>) {
  const { isOpen: isModalOpen } = useModalStatus()
  const { refreshUser } = useUser()
  const { identityToken } = useIdentityToken()
  const { logout } = useLogout()
  const { login } = useLogin({
    onError: (e) => {
      console.error('---', e)
    },
    onComplete: async ({ isNewUser }) => {
      if (isNewUser && !disableSignup) {
        // -- this is a new Buyer
        await api.post('/buyer')
      }
    }
  })
  const { ready, authenticated } = usePrivy()
  useEffect(
    () => {
      if (ready && !isModalOpen && !authenticated) {
        login({
          disableSignup
        })
      }
    },
    [ready, authenticated, isModalOpen]
  )
  return ready
    ? (
      authenticated && <section className='h-full flex flex-col gap-8'>
        <section className='flex gap-8'>
          <Button
            size='small'
            onClick={
              async () => {
                logout()
              }
            }>Logout</Button>
          <Button
            severity="secondary"
            size='small'
            rounded
            outlined
            tooltip='Copy access token for debugging API'
            icon='pi pi-copy'
            onClick={
              async () => {
                await refreshUser()
                navigator.clipboard.writeText(identityToken!)
              }
            }/>
        </section>
        <Outlet/>
      </section>
    )
    : <>
      {/* additional loading animation */}
    </>
}
