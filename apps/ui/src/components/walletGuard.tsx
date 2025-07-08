import {
  useModalStatus,
  usePrivy,
  useSessionSigners
} from '@privy-io/react-auth'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useEffect } from 'react'
import { Outlet } from 'react-router'

export default function () {
  const { isOpen: isModalOpen } = useModalStatus()
  const { addSessionSigners } = useSessionSigners()
  const { user } = usePrivy()
  useEffect(
    () => {
      const run = async () => {
        if (!isModalOpen && user?.wallet && !user.wallet.delegated) {
          await addSessionSigners({
            address: user.wallet.address,
            signers: [
              {
                signerId: import.meta.env.VITE_PRIVY_KEY_QUORUM_ID
              }
            ]
          }).catch(
            e => {
              const { message } = e as Error
              console.error(message)
            }
          )
        }
      }
      run()
    },
    [user, isModalOpen]
  )
  return user?.wallet?.delegated
    ? <Outlet/>
    : <ProgressSpinner aria-label="Loading" />
}
