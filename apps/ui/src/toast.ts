import { isAxiosError } from 'axios'
import type { Toast } from 'primereact/toast'
import { createContext, type RefObject, useContext } from 'react'

export const ToastContext = createContext<RefObject<Toast> | null>(null)
export const useToast = () => {
  const toast = useContext(ToastContext)
  const successHandler = (message: string) => {
    toast?.current?.show({
      severity: 'success',
      detail: message,
      life: 5000
    })
  }
  const warnHandler = (message: string) => {
    toast?.current?.show({
      severity: 'warn',
      detail: message,
      life: 10000,
      className: 'z-50'
    })
  }
  const errorHandler = (error: unknown) => {
    let message = (error as Error).message
    if (isAxiosError(error)) {
      message = error.response?.data.message
      console.warn('axios', error.response?.data)
    }
    toast?.current?.show({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000
    })
  }
  return {
    errorHandler,
    successHandler,
    warnHandler
  }
}

