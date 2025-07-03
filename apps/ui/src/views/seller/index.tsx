import { useEffect, useState, useMemo } from 'react'
import { api } from '@/axios'
import type { UserAttr } from 'api/src/db/models'
import type {
  BridgeCustomer
} from 'api/src/@types/bridge'
import Status from '@/components/seller/status'
import KYB from '@/components/seller/kyb'
import OffRamp from '@/components/seller/offRamp'
import OnRamp from '@/components/seller/onRamp'
import PaymentMethod from '@/components/seller/paymentMethod'
import { useQuery } from '@tanstack/react-query'
import { ProgressSpinner } from 'primereact/progressspinner'

type BridgeUser = BridgeCustomer & {
  kyc_link: string
  tos_link: string
}

export default function () {
  const [bridgeUser, setBridgeUser] = useState<BridgeUser>()
  const [profile, setProfile] = useState<UserAttr>()
  const [stripeAccountDues, setStripeAccountDues] = useState<Array<string>>([])
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => Promise.all([
      api.get<UserAttr>('/seller'),
      api.get<BridgeUser>('/seller/bridge')
    ])
  })
  useEffect(
    () => {
      if (profileQuery.isSuccess) {
        const [profileData, bridgeCustomerData] = profileQuery.data
        setProfile(profileData)
        setBridgeUser(bridgeCustomerData)
      }
    },
    [profileQuery.isSuccess, profileQuery.data]
  )
  useEffect(
    () => {
      if (profile?.stripe_onboarded) {
        api.get<Array<string>>('/seller/stripe/dues')
          .then(dues => setStripeAccountDues(dues))
          .catch(console.error)
      }
    },
    [profile]
  )
  const bridgeAccountDues = useMemo(
    () => {
      const baseEndorsement = bridgeUser?.endorsements?.find(
        ({ name }) => name === 'base'
      )
      return baseEndorsement?.requirements?.missing?.all_of ?? []
    },
    [bridgeUser]
  )

  return <div className="h-full flex flex-col gap-4 items-start">
    {
      profile
        ? <div className='w-full lg:w-3/4 lg:min-w-[600px] lg:max-w-[900px] pb-8'>
          <Status dues={{ stripeAccountDues, bridgeAccountDues }}/>
          <KYB bridgeUser={bridgeUser}/>
          <PaymentMethod profile={profile}/>
          <OnRamp profile={profile} />
          <OffRamp profile={profile}/>
        </div>
        : <section className='h-full w-full flex justify-center items-center'>
          <ProgressSpinner aria-label="Loading" />
        </section>
    }
  </div>
}
