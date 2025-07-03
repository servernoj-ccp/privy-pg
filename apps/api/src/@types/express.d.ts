import { User } from '@/db/models'
import type { PrivyClient, User as PrivyUser } from '@privy-io/server-auth'
import { Stripe } from 'stripe'

declare global {
  namespace Express {
    interface Request {
      parsedQuery: Record<string, unknown>
    }
    interface Locals {
      privySellerClient: PrivyClient
      privyBuyerClient: PrivyClient
      bridgeClient: {
        get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
        delete(url: string, config?: AxiosRequestConfig): Promise<void>
        post<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T>
        put<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T>
        patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
      }
      stripeClient: Stripe
      user: User
      buyer: PrivyUser
      seller: PrivyUser
    }
  }
}

