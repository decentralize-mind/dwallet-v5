import { ethers } from 'ethers'
import { Core } from '@walletconnect/core'
import { Web3Wallet } from '@walletconnect/web3wallet'

let web3wallet = null
let activeSessions = {}
let onProposal = null
let onRequest = null
let core = null

export async function initWalletConnect(projectId) {
  if (web3wallet) return web3wallet

  try {
    core = new Core({
      projectId,
    })

    web3wallet = await Web3Wallet.init({
      core,
      metadata: {
        name: 'dWallet',
        description: 'Decentralized Wallet with Multi-Chain Support',
        url: 'https://dwallet.io',
        icons: ['https://dwallet.io/icon.png'],
      },
    })

    // Restore active sessions
    activeSessions = web3wallet.getActiveSessions()

    return web3wallet
  } catch (error) {
    console.error('Failed to initialize WalletConnect:', error)
    throw error
  }
}
export function isWCInitialized() {
  return web3wallet !== null
}
export function getWeb3Wallet() {
  return web3wallet
}
export function getActiveSessions() {
  if (!web3wallet) return {}
  return web3wallet.getActiveSessions()
}
export function setProposalHandler(fn) {
  onProposal = fn
}
export function setRequestHandler(fn) {
  onRequest = fn
}

export async function pairWithDapp(uri) {
  if (!web3wallet) throw new Error('WalletConnect not initialized')
  
  try {
    await web3wallet.core.pairing.pair({ uri })
  } catch (error) {
    console.error('Failed to pair with dApp:', error)
    throw error
  }
}

export async function approveSession(proposal, accounts) {
  if (!web3wallet) throw new Error('WalletConnect not initialized')

  const { id, requiredNamespaces, relays } = proposal.params

  // Build namespaces from requiredNamespaces
  const namespaces = {}
  for (const [namespace, chainData] of Object.entries(requiredNamespaces)) {
    namespaces[namespace] = {
      chains: chainData.chains || [],
      accounts: accounts.filter(acc => acc.startsWith(`${namespace}:`)),
      methods: chainData.methods,
      events: chainData.events,
    }
  }

  try {
    const session = await web3wallet.approveSession({
      id,
      namespaces,
    })

    activeSessions[session.topic] = session
    return session
  } catch (error) {
    console.error('Failed to approve session:', error)
    throw error
  }
}

export async function rejectSession(proposal) {
  if (!web3wallet) throw new Error('WalletConnect not initialized')

  const { id } = proposal.params

  try {
    await web3wallet.rejectSession({
      id,
      reason: {
        code: 4001,
        message: 'User rejected',
      },
    })
  } catch (error) {
    console.error('Failed to reject session:', error)
    throw error
  }
}
export async function disconnectSession(topic) {
  if (!web3wallet) throw new Error('WalletConnect not initialized')

  try {
    await web3wallet.disconnectSession({
      topic,
      reason: {
        code: 6000,
        message: 'User disconnected',
      },
    })
    delete activeSessions[topic]
  } catch (error) {
    console.error('Failed to disconnect session:', error)
    throw error
  }
}
export async function respondToRequest(topic, id, result, isError = false) {
  if (!web3wallet) throw new Error('WalletConnect not initialized')

  try {
    if (isError) {
      await web3wallet.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          error: result,
        },
      })
    } else {
      await web3wallet.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          result,
        },
      })
    }
  } catch (error) {
    console.error('Failed to respond to request:', error)
    throw error
  }
}

export async function signMessage(message, privateKey) {
  const wallet = new ethers.Wallet(privateKey)
  return wallet.signMessage(
    message.startsWith('0x') ? ethers.getBytes(message) : message,
  )
}
export async function signTransaction(txParams, privateKey, provider) {
  return new ethers.Wallet(privateKey, provider).signTransaction(txParams)
}
export function toCaip10(chainId, address) {
  return `eip155:${chainId}:${address}`
}
export const CHAIN_IDS = { 
  ethereum: 1, 
  sepolia: 11155111,
  baseSepolia: 84532,
  base: 8453,
  bnb: 56, 
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  avalanche: 43114,
}
