import { api } from '@/axios'
import { UserAttr } from 'api/src/db/models'
import { useEffect, useState } from 'react'

export default function () {
  const [user, setUser] = useState<UserAttr>()
  useEffect(
    () => {
      const run = async () => {
        await api.get<{user: UserAttr}>('/sellers').then(
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
    Seller
    <pre>{JSON.stringify(user, null, 2)}</pre>
  </div>
}
