import { PrivyClient } from '@privy-io/server-auth'

export const privySellerClient = new PrivyClient(
  process.env.PRIVY_S_APP_ID!,
  process.env.PRIVY_S_APP_SECRET!,
  {
    walletApi: {
      authorizationPrivateKey: process.env.PRIVY_S_SERVER_KEY!
    }
  }
)
export const privyBuyerClient = new PrivyClient(
  process.env.PRIVY_B_APP_ID!,
  process.env.PRIVY_B_APP_SECRET!,
  {
    walletApi: {
      authorizationPrivateKey: process.env.PRIVY_B_SERVER_KEY!
    }
  }
)

