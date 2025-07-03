import getAbi, { getEventSignatures } from './getAbi'
import getSmartAccountClient from './getSmartAccountClient'
import getTransactionReceipt from './getTransactionReceipt'
import { polygon } from 'viem/chains'

const tscAddresses: Record<number, `0x${string}`> = {
  [polygon.id]: '0x1ecdab8ac2bcb0b0e02b3b26e845725a19135147'
}

export {
  getAbi,
  getEventSignatures,
  getTransactionReceipt,
  tscAddresses,
  getSmartAccountClient
}
