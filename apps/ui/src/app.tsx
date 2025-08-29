import { BrowserRouter, Route, Routes  } from 'react-router'
import Home from '@/views/home'
import Layout from '@/components/layout'
import AuthGuard from '@/components/authGuard'
import WalletGuard from '@/components/walletGuard'
import TokenGuard from '@/components/tokenGuard'
import Login from '@/views/login'
import Seller from '@/views/seller'
import StripeOnboarding from '@/views/seller/stripeOnboarding'
import GuestBuyer from '@/views/buyer'
import AuthenticatedBuyer from '@/views/buyer/authenticated'
import { PrivyProvider } from '@privy-io/react-auth'
import Status from '@/views/buyer/status'
import Checkout from '@/views/buyer/checkout'

function App () {
  return <BrowserRouter>
    <PrivyProvider appId={import.meta.env.VITE_PRIVY_APP_ID}>
      <Routes>
        <Route element={<Layout/>}>
          <Route index element={<Home />} />
          <Route path="/seller/*">
            <Route path="login" element={<Login/>}/>
            <Route element={<AuthGuard key='seller'/>}>
              <Route element={<TokenGuard/>}>
                <Route index element={<Seller/>}/>
                <Route path="kyc/stripe" element={<StripeOnboarding/>}/>
              </Route>
            </Route>
          </Route>
          <Route path="/buyer/*" >
            <Route index element={<GuestBuyer/>}/>
            <Route path="status" element={<Status/>}/>
            <Route path="login" element={<Login/>}/>
            <Route element={<AuthGuard key='buyer'/>}>
              <Route element={<WalletGuard/>}>
                <Route element={<TokenGuard/>}>
                  <Route path='authenticated' element={<AuthenticatedBuyer/>}/>
                  <Route path='checkout' element={<Checkout/>}/>
                </Route>
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
    </PrivyProvider>
  </BrowserRouter>
}

export default App
