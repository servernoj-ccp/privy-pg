import React from 'react'
import { useLocation } from 'react-router'

const component: React.FC = () => {
  const location = useLocation()
  const { tos_link } = location.state || {}
  return tos_link && <iframe
    className='flex-grow'
    allow="camera;"
    src={
      `${tos_link}&iframe-origin=${encodeURIComponent(window.location.origin)}`
    }
    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
  />
}

export default component
