import { RefObject, StrictMode, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { PrimeReactProvider } from 'primereact/api'
import '@/index.css'
import '@/assets/main.css'
import 'primeicons/primeicons.css'
import App from '@/app'
import { ToastContext } from '@/toast'
import { Toast } from 'primereact/toast'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()

const init = async () => {
  const Root = () => {
    const toastRef = useRef<Toast>(null) as RefObject<Toast>
    return (
      <StrictMode>
        <PrimeReactProvider>
          <ToastContext.Provider value={toastRef}>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
            <Toast ref={toastRef}/>
          </ToastContext.Provider>
        </PrimeReactProvider>
      </StrictMode>
    )
  }
  // -- Initialize and mount the App
  createRoot(
    document.getElementById('root')!
  ).render(<Root/>)
}

init()
