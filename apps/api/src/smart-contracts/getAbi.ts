import { Abi, AbiEvent } from 'abitype'
import { keccak256, stringToBytes } from 'viem'

import { readFile } from 'fs/promises'

const _fetchAbi = async (abiPath: string) => {
  const resolvedPath = new URL(await import.meta.resolve(abiPath), import.meta.url)
  const jsonString = await readFile(resolvedPath.pathname, 'utf-8')
  const m = JSON.parse(jsonString)
  return m.abi as Abi
}

const abiPaths = {
  nft: 'sc/NFT',
  tsc: 'sc/TSC',
  erc20: '@openzeppelin/contracts/build/contracts/ERC20.json'
}

const getEventSignatures = async (contractName: keyof typeof abiPaths) => {
  const ABIs = await _fetchAbi(abiPaths[contractName])
  return ABIs
    .reduce(
      (acc, abi) => {
        if (abi.type === 'event') {
          const signature = `${abi.name}(${abi.inputs.map((input) => input.type).join(',')})`
          const hash = keccak256(stringToBytes(signature))
          acc[hash] = abi
        }
        return acc
      },
      {} as Record<string, AbiEvent>
    )
}

export default (contractName: keyof typeof abiPaths) => _fetchAbi(abiPaths[contractName])

export {
  abiPaths,
  getEventSignatures
}
