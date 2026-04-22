/**
 * DWT Token Service
 * Fetches real-time token data from blockchain
 */

import { ethers } from 'ethers'
import { DWTToken_ABI } from '../config/abis'

// Contract addresses for different networks
const CONTRACT_ADDRESSES = {
  // Base Mainnet
  base: import.meta.env.VITE_DWT_TOKEN_ADDRESS || import.meta.env.BASE_DWT_TOKEN || '0x9ce235f8574bde67393884550F02135CE4fB8387',
  // Base Sepolia Testnet (fallback)
  baseSepolia: '0x769F23dd0F6bc92C9d9d914190Ae9006d3FbDe48',
  // Sepolia Testnet (legacy)
  sepolia: '0x3A4B1a7aD971be03dEe83A7B61d575304C9C0b0f',
}

// RPC URLs
const RPC_URLS = {
  base: 'https://mainnet.base.org',
  baseSepolia: 'https://sepolia.base.org',
  sepolia: import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/' + import.meta.env.VITE_INFURA_KEY,
}

/**
 * Get the current network
 * @returns {string} Network name
 */
function getCurrentNetwork() {
  // Check if we have a connected wallet
  if (window.ethereum) {
    const chainId = window.ethereum.chainId
    if (chainId === '0x2105') return 'base' // Base Mainnet: 8453
    if (chainId === '0x14a34') return 'baseSepolia' // Base Sepolia: 84532
    if (chainId === '0xaa36a7') return 'sepolia' // Sepolia: 11155111
  }
  
  // Fallback to environment variable
  const network = import.meta.env.VITE_NETWORK || 'baseSepolia'
  return network
}

/**
 * Get provider for the current network
 * @returns {ethers.Provider} Ethereum provider
 */
function getProvider() {
  const network = getCurrentNetwork()
  const rpcUrl = RPC_URLS[network] || RPC_URLS.baseSepolia
  
  return new ethers.JsonRpcProvider(rpcUrl)
}

/**
 * Get token contract instance
 * @param {ethers.Provider|ethers.Signer} providerOrSigner - Provider or signer
 * @returns {ethers.Contract} DWT token contract
 */
function getTokenContract(providerOrSigner) {
  const network = getCurrentNetwork()
  const address = CONTRACT_ADDRESSES[network] || CONTRACT_ADDRESSES.baseSepolia
  
  return new ethers.Contract(address, DWTToken_ABI, providerOrSigner)
}

/**
 * Fetch total supply from blockchain
 * @returns {Promise<string>} Total supply formatted
 */
export async function getTotalSupply() {
  try {
    const provider = getProvider()
    const contract = getTokenContract(provider)
    
    const supply = await contract.totalSupply()
    return ethers.formatEther(supply)
  } catch (error) {
    console.error('Error fetching total supply:', error)
    throw error
  }
}

/**
 * Fetch max supply from blockchain
 * @returns {Promise<string>} Max supply formatted
 */
export async function getMaxSupply() {
  try {
    const provider = getProvider()
    const contract = getTokenContract(provider)
    
    const maxSupply = await contract.MAX_SUPPLY()
    return ethers.formatEther(maxSupply)
  } catch (error) {
    console.error('Error fetching max supply:', error)
    throw error
  }
}

/**
 * Fetch circulating supply (total supply - burned)
 * @returns {Promise<string>} Circulating supply formatted
 */
export async function getCirculatingSupply() {
  try {
    const provider = getProvider()
    const contract = getTokenContract(provider)
    
    const totalSupply = await contract.totalSupply()
    const burned = await contract.totalBurned ? await contract.totalBurned() : 0n
    
    const circulating = totalSupply - burned
    return ethers.formatEther(circulating)
  } catch (error) {
    console.error('Error fetching circulating supply:', error)
    throw error
  }
}

/**
 * Fetch burned tokens from blockchain
 * @returns {Promise<string>} Burned amount formatted
 */
export async function getBurnedTokens() {
  try {
    const provider = getProvider()
    const contract = getTokenContract(provider)
    
    if (!contract.totalBurned) {
      console.warn('totalBurned() not available on this contract')
      return '0'
    }
    
    const burned = await contract.totalBurned()
    return ethers.formatEther(burned)
  } catch (error) {
    console.error('Error fetching burned tokens:', error)
    throw error
  }
}

/**
 * Fetch token holder count (approximation via events)
 * Note: This is an approximation - accurate count requires indexer
 * @returns {Promise<number>} Approximate holder count
 */
export async function getHolderCount() {
  try {
    const provider = getProvider()
    const network = getCurrentNetwork()
    const address = CONTRACT_ADDRESSES[network] || CONTRACT_ADDRESSES.baseSepolia
    
    // For now, return a placeholder - real implementation needs indexer
    // You could use The Graph, Covalent, or Alchemy APIs for accurate count
    console.warn('Holder count requires indexer service - returning placeholder')
    return 0
  } catch (error) {
    console.error('Error fetching holder count:', error)
    throw error
  }
}

/**
 * Fetch all token statistics
 * @returns {Promise<Object>} Token statistics
 */
export async function getTokenStats() {
  try {
    const [
      totalSupply,
      maxSupply,
      circulatingSupply,
      burnedTokens,
      holderCount
    ] = await Promise.allSettled([
      getTotalSupply(),
      getMaxSupply(),
      getCirculatingSupply(),
      getBurnedTokens(),
      getHolderCount()
    ])
    
    return {
      totalSupply: totalSupply.status === 'fulfilled' ? totalSupply.value : '0',
      maxSupply: maxSupply.status === 'fulfilled' ? maxSupply.value : '0',
      circulatingSupply: circulatingSupply.status === 'fulfilled' ? circulatingSupply.value : '0',
      burnedTokens: burnedTokens.status === 'fulfilled' ? burnedTokens.value : '0',
      holderCount: holderCount.status === 'fulfilled' ? holderCount.value : 0,
      // Market data would come from external APIs (CoinGecko, etc.)
      marketCap: '0',
      price: '0'
    }
  } catch (error) {
    console.error('Error fetching token stats:', error)
    throw error
  }
}

/**
 * Mint tokens to an address (owner only)
 * @param {ethers.Signer} signer - Wallet signer with owner permissions
 * @param {string} toAddress - Recipient address
 * @param {string} amount - Amount to mint (in ether, e.g., "1000")
 * @returns {Promise<object>} Transaction receipt
 */
export async function mintTokens(signer, toAddress, amount) {
  try {
    const contract = getTokenContract(signer)
    
    // Validate address
    if (!ethers.isAddress(toAddress)) {
      throw new Error('Invalid Ethereum address')
    }
    
    // Validate amount
    const amountWei = ethers.parseEther(amount.toString())
    if (amountWei <= 0n) {
      throw new Error('Amount must be greater than 0')
    }
    
    // Check max supply constraint
    const totalSupply = await contract.totalSupply()
    const maxSupply = await contract.MAX_SUPPLY()
    
    if (totalSupply + amountWei > maxSupply) {
      const remaining = maxSupply - totalSupply
      throw new Error(`Mint would exceed max supply. Can only mint ${ethers.formatEther(remaining)} more DWT`)
    }
    
    // Execute mint transaction
    console.log(`Minting ${amount} DWT to ${toAddress}...`)
    const tx = await contract.mint(toAddress, amountWei)
    
    console.log('Transaction sent:', tx.hash)
    const receipt = await tx.wait()
    
    console.log('Mint successful! Gas used:', receipt.gasUsed.toString())
    
    return {
      success: true,
      hash: tx.hash,
      receipt: receipt,
      amount: amount,
      to: toAddress
    }
  } catch (error) {
    console.error('Mint failed:', error)
    throw error
  }
}

/**
 * Burn tokens from caller's balance
 * @param {ethers.Signer} signer - Wallet signer
 * @param {string} amount - Amount to burn (in ether, e.g., "1000")
 * @returns {Promise<object>} Transaction receipt
 */
export async function burnTokens(signer, amount) {
  try {
    const contract = getTokenContract(signer)
    
    // Validate amount
    const amountWei = ethers.parseEther(amount.toString())
    if (amountWei <= 0n) {
      throw new Error('Amount must be greater than 0')
    }
    
    // Check caller's balance
    const address = await signer.getAddress()
    const balance = await contract.balanceOf(address)
    
    if (balance < amountWei) {
      throw new Error(`Insufficient balance. Have ${ethers.formatEther(balance)} DWT, trying to burn ${amount} DWT`)
    }
    
    // Execute burn transaction
    console.log(`Burning ${amount} DWT from ${address}...`)
    const tx = await contract.burn(amountWei)
    
    console.log('Transaction sent:', tx.hash)
    const receipt = await tx.wait()
    
    console.log('Burn successful! Gas used:', receipt.gasUsed.toString())
    
    return {
      success: true,
      hash: tx.hash,
      receipt: receipt,
      amount: amount,
      from: address
    }
  } catch (error) {
    console.error('Burn failed:', error)
    throw error
  }
}

/**
 * Burn tokens from another address (owner only, if contract supports burnFrom)
 * @param {ethers.Signer} signer - Wallet signer with owner permissions
 * @param {string} account - Address to burn from
 * @param {string} amount - Amount to burn (in ether)
 * @returns {Promise<object>} Transaction receipt
 */
export async function burnTokensFrom(signer, account, amount) {
  try {
    const contract = getTokenContract(signer)
    
    // Validate address
    if (!ethers.isAddress(account)) {
      throw new Error('Invalid Ethereum address')
    }
    
    // Validate amount
    const amountWei = ethers.parseEther(amount.toString())
    if (amountWei <= 0n) {
      throw new Error('Amount must be greater than 0')
    }
    
    // Check if burnFrom exists
    if (!contract.burnFrom) {
      throw new Error('burnFrom() not supported by this contract')
    }
    
    // Execute burnFrom transaction
    console.log(`Burning ${amount} DWT from ${account}...`)
    const tx = await contract.burnFrom(account, amountWei)
    
    console.log('Transaction sent:', tx.hash)
    const receipt = await tx.wait()
    
    console.log('BurnFrom successful! Gas used:', receipt.gasUsed.toString())
    
    return {
      success: true,
      hash: tx.hash,
      receipt: receipt,
      amount: amount,
      from: account
    }
  } catch (error) {
    console.error('BurnFrom failed:', error)
    throw error
  }
}

/**
 * Freeze/blacklist an address (owner only, if contract supports it)
 * @param {ethers.Signer} signer - Wallet signer with owner permissions
 * @param {string} account - Address to freeze
 * @returns {Promise<object>} Transaction receipt
 */
export async function freezeAddress(signer, account) {
  try {
    const contract = getTokenContract(signer)
    
    // Validate address
    if (!ethers.isAddress(account)) {
      throw new Error('Invalid Ethereum address')
    }
    
    // Prevent freezing zero address
    if (account === ethers.ZeroAddress) {
      throw new Error('Cannot freeze zero address')
    }
    
    // Check if freeze/pause function exists
    // Common function names: freeze, blacklist, pauseAddress, blockAddress
    let freezeTx
    if (contract.freeze) {
      freezeTx = await contract.freeze(account)
    } else if (contract.blacklist) {
      freezeTx = await contract.blacklist(account)
    } else if (contract.pauseAddress) {
      freezeTx = await contract.pauseAddress(account)
    } else {
      throw new Error('Freeze function not supported by this contract')
    }
    
    console.log(`Freezing address ${account}...`)
    console.log('Transaction sent:', freezeTx.hash)
    const receipt = await freezeTx.wait()
    
    console.log('Freeze successful! Gas used:', receipt.gasUsed.toString())
    
    return {
      success: true,
      hash: freezeTx.hash,
      receipt: receipt,
      account: account
    }
  } catch (error) {
    console.error('Freeze failed:', error)
    throw error
  }
}

/**
 * Unfreeze/unblacklist an address (owner only)
 * @param {ethers.Signer} signer - Wallet signer with owner permissions
 * @param {string} account - Address to unfreeze
 * @returns {Promise<object>} Transaction receipt
 */
export async function unfreezeAddress(signer, account) {
  try {
    const contract = getTokenContract(signer)
    
    // Validate address
    if (!ethers.isAddress(account)) {
      throw new Error('Invalid Ethereum address')
    }
    
    // Check if unfreeze/unblacklist function exists
    let unfreezeTx
    if (contract.unfreeze) {
      unfreezeTx = await contract.unfreeze(account)
    } else if (contract.unblacklist) {
      unfreezeTx = await contract.unblacklist(account)
    } else if (contract.unpauseAddress) {
      unfreezeTx = await contract.unpauseAddress(account)
    } else {
      throw new Error('Unfreeze function not supported by this contract')
    }
    
    console.log(`Unfreezing address ${account}...`)
    console.log('Transaction sent:', unfreezeTx.hash)
    const receipt = await unfreezeTx.wait()
    
    console.log('Unfreeze successful! Gas used:', receipt.gasUsed.toString())
    
    return {
      success: true,
      hash: unfreezeTx.hash,
      receipt: receipt,
      account: account
    }
  } catch (error) {
    console.error('Unfreeze failed:', error)
    throw error
  }
}

/**
 * Check if an address is frozen/blacklisted
 * @param {string} account - Address to check
 * @returns {Promise<boolean>} True if frozen
 */
export async function isAddressFrozen(account) {
  try {
    const provider = getProvider()
    const contract = getTokenContract(provider)
    
    // Check various function names
    if (contract.isFrozen) {
      return await contract.isFrozen(account)
    } else if (contract.isBlacklisted) {
      return await contract.isBlacklisted(account)
    } else if (contract.isPaused) {
      return await contract.isPaused(account)
    } else {
      console.warn('Freeze check function not available')
      return false
    }
  } catch (error) {
    console.error('Error checking freeze status:', error)
    return false
  }
}

/**
 * Get token holders (requires external API or indexer)
 * For now, returns placeholder - real implementation needs The Graph, Alchemy, or Covalent
 * @returns {Promise<Array>} Array of holder objects
 */
export async function getTokenHolders() {
  try {
    const network = getCurrentNetwork()
    const address = CONTRACT_ADDRESSES[network] || CONTRACT_ADDRESSES.baseSepolia
    
    // Placeholder - real implementation options:
    // 1. The Graph subgraph
    // 2. Alchemy API: alchemy_getTokenHolders
    // 3. Covalent API: /v1/{chain_id}/tokens/{address}/token_holders/
    // 4. Moralis API: /erc20/{address}/owners
    
    console.warn('getTokenHolders() requires external API integration')
    console.log('Use one of: The Graph, Alchemy, Covalent, or Moralis APIs')
    
    return []
  } catch (error) {
    console.error('Error fetching token holders:', error)
    throw error
  }
}

/**
 * Format number with commas
 * @param {string|number} value - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(value) {
  const num = parseFloat(value)
  if (isNaN(num)) return '0'
  
  // Format with appropriate precision
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + 'B'
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M'
  } else if (num >= 1000) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
  } else {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }
}

export default {
  getTotalSupply,
  getMaxSupply,
  getCirculatingSupply,
  getBurnedTokens,
  getHolderCount,
  getTokenStats,
  mintTokens,
  burnTokens,
  burnTokensFrom,
  freezeAddress,
  unfreezeAddress,
  isAddressFrozen,
  getTokenHolders,
  formatNumber,
  CONTRACT_ADDRESSES,
  getCurrentNetwork,
}
