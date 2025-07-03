import { useToast } from '@/toast'
import { Button } from 'primereact/button'
import { api } from '@/axios'
import { UserAttr } from 'api/src/db/models'

type Props = {
  profile: UserAttr
}

export default function ({ profile }: Props) {
  const { errorHandler, successHandler } = useToast()
  return profile.bridge_onboarded && <>
    <h2>On-ramp</h2>
    <p>
      The on-ramp configuration allows to configure Stripe payout process to target Treasury Smart Contract (TSC). It is safe to re-run this step but it will essentially result in the same configuration. Without this step, your account will not be "fully onboarded" which prevents buyers to select it as a seller.
    </p>
    <Button
      severity='success'
      onClick={
        async () => {
          try {
            await api.post('/seller/setup/on-ramp')
            successHandler('On-ramp flow configured')
          } catch (e) {
            errorHandler(e)
          }
        }
      }>
      <span className='mx-4'>Configure</span>
    </Button>
  </>
}
