import { ethers } from 'ethers'
import { getContractAddress } from '../config/contracts'
import * as ABIS from '../config/abis'

/**
 * Utility to get a connected contract instance for the dWallet Protocol.
 *
 * @param {string} network - 'sepolia' or 'baseSepolia'
 * @param {string} contractName - e.g. 'DWalletCore', 'DWT', 'StakingPool'
 * @param {ethers.Provider | ethers.Signer} providerOrSigner
 * @returns {ethers.Contract | null}
 */
export function getProtocolContract(network, contractName, providerOrSigner) {
  const address = getContractAddress(network, contractName)
  if (!address) {
    console.warn(`Contract address not found for ${contractName} on ${network}`)
    return null
  }

  const abi = ABIS[`${contractName}_ABI`]
  if (!abi) {
    console.warn(`ABI not found for ${contractName}`)
    return null
  }

  return new ethers.Contract(address, abi, providerOrSigner)
}

/**
 * Example: Fetch the total supply of DWT on the specified network
 */
export async function getDWTTotalSupply(network, provider) {
  const dwtContract = getProtocolContract(network, 'DWT', provider)
  if (!dwtContract) return '0'

  try {
    const supply = await dwtContract.totalSupply()
    const decimals = await dwtContract.decimals()
    return ethers.formatUnits(supply, decimals)
  } catch (err) {
    console.error('Error fetching DWT Supply:', err)
    return '0'
  }
}

/**
 * Example: Get details from the Staking Pool
 */
export async function getStakingPoolInfo(network, provider) {
  const stakingContract = getProtocolContract(network, 'StakingPool', provider)
  if (!stakingContract) return null

  try {
    const totalStaked = await stakingContract.totalStaked()
    return {
      totalStaked: ethers.formatUnits(totalStaked, 18),
    }
  } catch (err) {
    console.error('Error fetching Staking Pool Info:', err)
    return null
  }
}
