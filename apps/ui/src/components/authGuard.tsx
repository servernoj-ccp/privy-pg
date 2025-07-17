import { useLogout, usePrivy, useIdentityToken, useUser } from '@privy-io/react-auth'
import { Button } from 'primereact/button'
import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { ProgressSpinner } from 'primereact/progressspinner'


export default function () {
  const { refreshUser } = useUser()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { identityToken } = useIdentityToken()
  const { logout } = useLogout()
  const [authorized, setAuthorized] = useState(false)
  const role = pathname?.match(/[/](?<role>[^/]+)/)?.groups?.role
  const { ready, authenticated, user } = usePrivy()
  useEffect(
    () => {
      const run = async () => {
        if (ready) {
          const isAuthorizedSeller = (
            user?.customMetadata?.role === 'BRAND_OWNER' &&
            role === 'seller'
          )
          const isAuthorizedBuyer = (
            user?.customMetadata?.role === 'BACKER' &&
            role === 'buyer'
          )
          const isAuthorized = isAuthorizedSeller || isAuthorizedBuyer
          setAuthorized(isAuthorized)
          if (!authenticated || !isAuthorized) {
            if (!isAuthorized) {
              await logout()
            }
            await navigate(`/${role}/login?return=${pathname}`)
          }
        }
      }
      run()
    },
    [ready, authenticated, user, pathname]
  )

  return ready && authenticated && authorized
    ? (
      <section className='h-full flex flex-col gap-8'>
        <section className='flex gap-8'>
          <Button
            size='small'
            onClick={
              async () => {
                await logout()
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
    : (
      <section className='h-full w-full flex justify-center items-center'>
        <ProgressSpinner aria-label="Loading" />
      </section>
    )
}
