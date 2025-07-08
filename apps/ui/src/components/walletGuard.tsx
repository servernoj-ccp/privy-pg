import {
  useDelegatedActions,
  // useHeadlessDelegatedActions,
  useModalStatus,
  usePrivy
} from '@privy-io/react-auth'
import { useEffect } from 'react'
import { Outlet } from 'react-router'

export default function () {
  const { isOpen: isModalOpen } = useModalStatus()
  const { delegateWallet } = useDelegatedActions()
  const { user } = usePrivy()
  useEffect(
    () => {
      if (!isModalOpen && user?.wallet && !user.wallet.delegated) {
        delegateWallet({
          address: user.wallet.address,
          chainType: 'ethereum'
        }).catch(
          e => {
            const { message } = e as Error
            console.error(message)
          }
        )
      }
    },
    [user, isModalOpen]
  )
  return user?.wallet?.delegated && <Outlet/>
}
