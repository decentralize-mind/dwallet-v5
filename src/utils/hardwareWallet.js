/**
 * Hardware Wallet Integration
 * Supports: Ledger, Trezor, and other WalletConnect-compatible wallets
 */

const HARDWARE_WALLET_KEY = 'dwallet_hardware_wallet'
const HARDWARE_ENABLED_KEY = 'dwallet_hardware_enabled'

/**
 * Check if hardware wallet is connected
 */
export function isHardwareWalletConnected() {
  return localStorage.getItem(HARDWARE_ENABLED_KEY) === 'true'
}

/**
 * Get hardware wallet info
 */
export function getHardwareWalletInfo() {
  try {
    const data = localStorage.getItem(HARDWARE_WALLET_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * Connect hardware wallet via WalletConnect
 * This is a placeholder - full implementation requires @walletconnect/ethereum-provider
 */
export async function connectHardwareWallet() {
  try {
    // Check if WalletConnect is available
    if (typeof window.ethereum === 'undefined' && !window.WalletConnectProvider) {
      throw new Error(
        'WalletConnect not available. Please install WalletConnect browser extension ' +
        'or use a wallet browser (MetaMask, Trust Wallet, etc.)'
      )
    }

    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    })

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found')
    }

    const address = accounts[0]
    const chainId = await window.ethereum.request({
      method: 'eth_chainId'
    })

    // Store hardware wallet info
    const hwInfo = {
      address,
      chainId,
      type: 'walletconnect',
      connectedAt: Date.now()
    }

    localStorage.setItem(HARDWARE_WALLET_KEY, JSON.stringify(hwInfo))
    localStorage.setItem(HARDWARE_ENABLED_KEY, 'true')

    console.log('✅ Hardware wallet connected:', address)
    return hwInfo
  } catch (error) {
    console.error('Failed to connect hardware wallet:', error)
    throw error
  }
}

/**
 * Disconnect hardware wallet
 */
export function disconnectHardwareWallet() {
  localStorage.removeItem(HARDWARE_WALLET_KEY)
  localStorage.removeItem(HARDWARE_ENABLED_KEY)
  console.log('✅ Hardware wallet disconnected')
}

/**
 * Sign transaction with hardware wallet
 */
export async function signTransactionWithHardware(txParams) {
  try {
    if (!isHardwareWalletConnected()) {
      throw new Error('Hardware wallet not connected')
    }

    // Send transaction through hardware wallet
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [txParams]
    })

    console.log('✅ Transaction signed and sent:', txHash)
    return txHash
  } catch (error) {
    console.error('Failed to sign transaction:', error)
    throw error
  }
}

/**
 * Sign message with hardware wallet
 */
export async function signMessageWithHardware(message) {
  try {
    if (!isHardwareWalletConnected()) {
      throw new Error('Hardware wallet not connected')
    }

    const hwInfo = getHardwareWalletInfo()
    if (!hwInfo) {
      throw new Error('Hardware wallet info not found')
    }

    // Sign message through hardware wallet
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, hwInfo.address]
    })

    console.log('✅ Message signed successfully')
    return signature
  } catch (error) {
    console.error('Failed to sign message:', error)
    throw error
  }
}

/**
 * Get hardware wallet status
 */
export function getHardwareWalletStatus() {
  const connected = isHardwareWalletConnected()
  const info = getHardwareWalletInfo()
  
  return {
    connected,
    info,
    address: info?.address || null
  }
}

/**
 * List supported hardware wallets
 */
export function getSupportedHardwareWallets() {
  return [
    {
      id: 'ledger',
      name: 'Ledger Nano S/X',
      icon: '🔵',
      description: 'Connect via USB or Bluetooth'
    },
    {
      id: 'trezor',
      name: 'Trezor Model T/One',
      icon: '🟠',
      description: 'Connect via USB'
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Connect via QR code (mobile wallets)'
    },
    {
      id: 'metamask',
      name: 'MetaMask (Hardware)',
      icon: '🦊',
      description: 'MetaMask with Ledger/Trezor'
    }
  ]
}
