import { useUser } from '@privy-io/react-auth'
import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router'
import { debounce, type DebouncedFunc } from 'lodash-es'

function useOnAppFocus (callback: () => any) {
  useEffect(() => {
    window.addEventListener('focus', callback)
    return () => {
      window.removeEventListener('focus', callback)
    }
  }, [callback])
}

function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): DebouncedFunc<T> {
  const callbackRef = useRef<T>(callback)
  const debouncedRef = useRef<DebouncedFunc<T> | null>(null)

  useEffect(
    () => {
      callbackRef.current = callback
    },
    [callback]
  )

  useEffect(() => {
    debouncedRef.current = debounce(
      ((...args: any[]) => {
        callbackRef.current(...args)
      }) as T,
      delay,
      {
        leading: true,
        trailing: false
      }
    )

    return () => {
      debouncedRef.current?.cancel()
    }
  }, [delay])


  return debouncedRef.current!
}

export default function () {
  const { refreshUser } = useUser()
  const handler = useDebouncedCallback(
    async () => {
      console.log('token refreshed')
      await refreshUser()
    },
    5 * 60 * 1000
  )
  useOnAppFocus(handler)
  return <Outlet/>
}
