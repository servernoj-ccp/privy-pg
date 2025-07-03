import { BrowserRouter, Route, Routes  } from 'react-router'
import Home from '@/views/home'
import Layout from '@/components/layout'
import IFramedProvider from '@/components/iFramedProvider'
import CheckoutProvider from '@/components/buyer/checkoutProvider'
import AuthGuard from '@/components/authGuard'
import WalletGuard from '@/components/walletGuard'
import TokenGuard from '@/components/tokenGuard'
import Seller from '@/views/seller'
import Buyer from '@/views/buyer'
import SellerReceipts from '@/views/seller/receipts'
import BuyerReceipts from '@/views/buyer/receipts'
import { PrivyProviderProps } from '@privy-io/react-auth'
import { lazy } from 'react'
import Disputes from '@/views/seller/disputes'

const BridgeKYC = lazy(
  () => import('@/views/seller/bridgeKYC')
)
const BridgeToS = lazy(
  () => import('@/views/seller/bridgeToS')
)
const StripeOnboarding = lazy(
  () => import('@/views/seller/stripeOnboarding')
)
const Checkout = lazy(
  () => import('@/views/buyer/checkout')
)
const Shopping = lazy(
  () => import('@/views/buyer/shopping')
)
const Status = lazy(
  () => import('@/views/buyer/status')
)

const privyProviders: Record<string, Omit<PrivyProviderProps, 'children'>> = {
  seller: {
    appId: import.meta.env.VITE_PRIVY_S_APP_ID,
    config: {
      appearance: {
        landingHeader: 'Login to manage your account',
        loginMessage: 'Sign-ups are disabled'
      }
    }
  },
  buyer: {
    appId: import.meta.env.VITE_PRIVY_B_APP_ID,
    config: {
      appearance: {
        landingHeader: 'Please login or sign-up',
        loginMessage: ''
      }
    }
  }
} as Record<string, Omit<PrivyProviderProps, 'children'>>


function App () {
  const isLocal = !!import.meta.env.VITE_API_BASE_URL
  const iframeSchema = isLocal ? 'http' : 'https'
  return <BrowserRouter>
    <Routes>
      <Route element={<Layout/>}>
        <Route index element={<Home />} />
        <Route
          path="/seller/*"
          element={
            <IFramedProvider
              provider={privyProviders.seller}
              origin={`${iframeSchema}://${import.meta.env.VITE_HOSTNAME_ALIAS}`}
            />
          }>
          <Route element={<AuthGuard disableSignup/>}>
            <Route element={<TokenGuard/>}>
              <Route index element={<Seller/>}/>
              <Route path='receipts' element={<SellerReceipts/>}/>
              <Route path="receipts/:receipt_id/disputes" element={<Disputes />} />
              <Route path="stripe/kyb" element={<StripeOnboarding />} />
              <Route path="bridge/kyb" element={<BridgeKYC />} />
              <Route path="bridge/tos" element={<BridgeToS />} />
            </Route>
          </Route>
        </Route>
        <Route
          path="/buyer/*"
          element={
            <IFramedProvider
              provider={privyProviders.buyer}
              origin={`${window.location.origin}`}
              pt
            />
          }>
          <Route element={<CheckoutProvider/>}>
            <Route index element={<Buyer/>}/>
            <Route path='shopping' element={<Shopping/>}/>
            <Route path='status' element={<Status/>}/>
            <Route element={<AuthGuard/>}>
              <Route element={<WalletGuard/>}>
                <Route element={<TokenGuard/>}>
                  <Route path='checkout' element={<Checkout/>}/>
                  <Route path='receipts' element={<BuyerReceipts/>}/>
                </Route>
              </Route>
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
}

export default App
