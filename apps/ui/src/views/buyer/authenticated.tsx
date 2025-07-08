import { useEffect, useState } from 'react'
import { type UserAttr } from 'api/src/db/models'
import { api } from '@/axios'

export default function () {
  const [user, setUser] = useState<UserAttr>()
  useEffect(
    () => {
      const run = async () => {
        await api.get<{user: UserAttr}>('/buyers').then(
          r => {
            setUser(r.user)
          }
        )
      }
      run()
    },
    []
  )
  return <div>
    Authenticated buyer
    <pre>{JSON.stringify(user, null, 2)}</pre>
  </div>
}
