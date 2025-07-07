import { useLogout, usePrivy, useIdentityToken, useUser } from '@privy-io/react-auth'
import { Button } from 'primereact/button'
import { PropsWithChildren, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'

interface Props {
  role: 'buyer' | 'seller'
}

export default function ({ role }: PropsWithChildren<Props>) {
  const { refreshUser } = useUser()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { identityToken } = useIdentityToken()
  const { logout } = useLogout()

  const { ready, authenticated } = usePrivy()
  useEffect(
    () => {
      const run = async () => {
        if (ready && !authenticated) {
          await navigate(`/${role}/login?return=${pathname}`)
        }
      }
      run()
    },
    [ready, authenticated]
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
