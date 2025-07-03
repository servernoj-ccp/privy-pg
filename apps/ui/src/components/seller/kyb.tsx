import { useNavigate } from 'react-router'
import { Button } from 'primereact/button'

type Props = {
  bridgeUser ?: {
    kyc_link: string
    tos_link: string
  }
}

export default function ({ bridgeUser }: Props) {
  const navigate = useNavigate()
  return <>
    <h2>KYC/KYB/ToS</h2>
    {
      bridgeUser && <section className='flex flex-col items-start'>
        <p>
        You can use KYB/KYC processes either to initialize or re-define Stripe and/or Bridge sub-accounts. Their corresponding onboarding statuses are reflected in the previous section.
        </p>
        <section className='ml-4'>
          <Button
            text
            link
            onClick={
              () => {
                navigate('stripe/kyb')
              }
            }>
        Stripe
          </Button>
          <Button
            link
            onClick={
              () => {
                navigate('bridge/kyb', { state: bridgeUser })
              }
            }>
        Bridge KYB
          </Button>
          <Button
            link
            onClick={
              () => {
                navigate('bridge/tos', { state: bridgeUser })
              }
            }>
        Bridge ToS
          </Button>
        </section>
      </section>
    }
  </>
}
