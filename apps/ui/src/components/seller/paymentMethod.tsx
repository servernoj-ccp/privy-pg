import { UserAttr } from 'api/src/db/models'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import CheckoutForm from '@/components/seller/checkoutForm'

type Props = {
  profile: UserAttr
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY)

export default function ({ profile }: Props) {
  return profile.stripe_onboarded  && <>
    <h2>Payment source for refunds</h2>
    <p>
      Refund requests from buyers will be resolved by charging the payment source provided here. Please provide credit card info that you'd like us to securely save and associate with your profile.
    </p>
    <Elements stripe={stripePromise}>
      <CheckoutForm profile={profile}/>
    </Elements>
  </>
}
