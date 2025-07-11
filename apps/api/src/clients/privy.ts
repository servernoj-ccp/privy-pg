import { PrivyClient } from '@privy-io/server-auth'

export const privyClient = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
  {
    walletApi: {
      authorizationPrivateKey: process.env.PRIVY_SERVER_KEY!
    }
  }
)
