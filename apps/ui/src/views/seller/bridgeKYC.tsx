import { ProgressSpinner } from 'primereact/progressspinner'
import React, { useState } from 'react'
import { useLocation } from 'react-router'

const component: React.FC = () => {
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const { kyc_link } = location.state || {}
  return kyc_link && <>
    {
      isLoading && <section className='h-full w-full flex justify-center items-center'>
        <ProgressSpinner aria-label="Loading" />
      </section>
    }
    <section className='flex-grow flex justify-center items-center bg-surface-200'>
      <iframe
        className='h-full'
        onLoad={
          () => {
            setIsLoading(false)
          }
        }
        allow="camera;"
        src={
          `${kyc_link.replace(/[/]verify/, '/widget')}&iframe-origin=${encodeURIComponent(window.location.origin)}`
        }
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
      />
    </section>
  </>
}

export default component
