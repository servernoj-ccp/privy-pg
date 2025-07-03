import { WaitForTransactionReceiptReturnType, type PublicClient } from 'viem'

const ATTEMPTS = 5
const POLLING_INTERVAL = 3000

type Args = {
  publicClient: PublicClient,
  hash: `0x${string}`
}

export default async ({ publicClient, hash }: Args) => {
  let receipt: WaitForTransactionReceiptReturnType | undefined
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    console.log(`Retrieving transaction receipt, attempt #${attempt + 1}...`)
    receipt = await publicClient.waitForTransactionReceipt({
      hash,
      pollingInterval: POLLING_INTERVAL
    }).catch(() => undefined)
    if (receipt) {
      break
    }
  }
  return receipt
}
