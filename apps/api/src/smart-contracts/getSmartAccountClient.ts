import { toSafeSmartAccount } from 'permissionless/accounts'
import { createPimlicoClient } from 'permissionless/clients/pimlico'
import { createPublicClient, http } from 'viem'
import { entryPoint07Address } from 'viem/account-abstraction'
import { privateKeyToAccount } from 'viem/accounts'
import { createSmartAccountClient } from 'permissionless'
import type { Chain } from 'viem/chains'

export default async ({ chain }: {chain: Chain}) => {
  const account = privateKeyToAccount(`0x${process.env.WALLET_PRIVATE_KEY}`)
  const read = createPublicClient({
    chain,
    transport: http()
  })
  const pimlicoUrl = `https://api.pimlico.io/v2/${chain.id}/rpc?apikey=${process.env.PIMLICO_API_KEY}`
  const pimlicoClient = createPimlicoClient({
    transport: http(pimlicoUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: '0.7'
    }
  })
  const safeSmartAccount = await toSafeSmartAccount({
    client: read,
    owners: [account],
    entryPoint: {
      address: entryPoint07Address,
      version: '0.7'
    },
    version: '1.4.1'
  })
  return createSmartAccountClient({
    account: safeSmartAccount,
    chain,
    bundlerTransport: http(pimlicoUrl),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        const gasPrice = await pimlicoClient.getUserOperationGasPrice()
        return gasPrice.fast
      }
    }
  })
}
