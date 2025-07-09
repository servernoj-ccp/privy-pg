import type { PrivyClient, User as PrivyUser } from '@privy-io/server-auth'

declare global {
  namespace Express {
    interface Request {
      parsedQuery: Record<string, unknown>
    }
    interface Locals {
      privyClient: PrivyClient
      privyUser: PrivyUser
    }
  }
}

