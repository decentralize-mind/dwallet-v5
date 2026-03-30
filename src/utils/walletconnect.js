import { ethers } from 'ethers'

let activeSessions = {}
let onProposal = null
let onRequest = null

export async function initWalletConnect() {
  return null
}
export function isWCInitialized() {
  return false
}
export function getWeb3Wallet() {
  return null
}
export function getActiveSessions() {
  return activeSessions
}
export function setProposalHandler(fn) {
  onProposal = fn
}
export function setRequestHandler(fn) {
  onRequest = fn
}

export async function pairWithDapp(uri) {
  const symKey = new URLSearchParams(uri.split('?')[1] || '').get('symKey')
  if (!symKey) throw new Error('Invalid WalletConnect URI')
  setTimeout(() => {
    if (onProposal)
      onProposal({
        id: Date.now(),
        params: {
          proposer: {
            metadata: { name: 'dApp', description: '', url: '', icons: [] },
          },
          requiredNamespaces: {
            eip155: {
              chains: ['eip155:1'],
              methods: ['eth_sendTransaction', 'personal_sign'],
              events: [],
            },
          },
        },
      })
  }, 800)
}

export async function approveSession(proposal, accounts) {
  const session = {
    topic: `session_${Date.now()}`,
    peer: proposal.params.proposer,
    accounts,
  }
  activeSessions[session.topic] = session
  return session
}

export async function rejectSession() {}
export async function disconnectSession(topic) {
  delete activeSessions[topic]
}
export async function respondToRequest(topic, id, result, isErr) {}

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
export const CHAIN_IDS = { ethereum: 1, bnb: 56, polygon: 137 }
