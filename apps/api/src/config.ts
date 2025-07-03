import { polygon } from 'viem/chains'
import { roundToCents } from '@/utils'

type Bridge = {
  payment_rail: 'polygon' | 'celo'
  currency: 'usdc'
}
if (process.env.INFURA_API_KEY) {
  Object.assign(polygon, {
    rpcUrls: {
      default: {
        http: [
          `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
        ]
      }
    }
  })
}

export const bridge: Bridge = {
  payment_rail: 'polygon',
  currency: 'usdc'
}
export const chain = polygon

export const supportedChains = [polygon]

export const getStripeFee = (usdAmount: number, extraPercent = 0) => roundToCents(
  usdAmount * (0.029 + extraPercent) + 0.3
)

export const reverseStripeFee = (usdAmount: number, extraPercent = 0) => roundToCents(
  (usdAmount + 0.3) / (1 - 0.029 - extraPercent)
)

export const isStripeSandbox = /^sk_test/.test(process.env.STRIPE_SECRET_KEY ?? '')

export const processTaxes = /^true$/i.test(process.env.STRIPE_PROCESS_TAXES ?? '')
