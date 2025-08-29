import { useState, useEffect, useRef } from 'react'

export default function () {
  const isMounted = useRef(false)
  const [params, setParams] = useState<Record<string, string>>()

  const onMount = async () => {
    const url = new URLSearchParams(window.location.search)
    setParams(Object.fromEntries(url.entries()))
  }
  useEffect(
    () => {
      if (!isMounted.current) {
        onMount()
        isMounted.current = true
      }
    },
    []
  )
  return params && <pre>{JSON.stringify(params, null, 2)}</pre>
}
