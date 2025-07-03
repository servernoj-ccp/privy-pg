import { PrivyProvider, PrivyProviderProps } from '@privy-io/react-auth'
import { useState } from 'react'
import { ProgressSpinner } from 'primereact/progressspinner'
import { Outlet, useLocation } from 'react-router'

type Props = {
  provider: Omit<PrivyProviderProps, 'children'>
  origin: string
  pt?: boolean
}

export default function (props: Props) {
  const location = useLocation()
  const isIframe = props.pt || window.self !== window.top
  const [isLoading, setIsLoading] = useState(true)
  return isIframe
    ? <PrivyProvider {...props.provider}>
      {
        props.pt
          ? <div className='p-8 h-full border-2 border-red-500 overflow-y-hidden'>
            <Outlet/>
          </div>
          : <Outlet/>
      }
    </PrivyProvider>
    : <>
      {
        isLoading && <section className='h-full w-full flex justify-center items-center'>
          <ProgressSpinner aria-label="Loading" />
        </section>
      }
      <iframe
        src={props.origin + location.pathname + location.search}
        allow='clipboard-write;'
        onLoad={
          () => {
            setIsLoading(false)
          }
        }
        width="100%"
        height="100%"
      ></iframe>
    </>
}
