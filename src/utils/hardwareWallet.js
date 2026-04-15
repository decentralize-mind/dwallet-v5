/**
 * 🔐 Hardware Wallet Integration
 * 
 * Support for:
 * - Ledger (via @ledgerhq/hw-app-eth)
 * - Trezor (via trezor-connect)
 * - WalletConnect for mobile hardware wallets
 */

// ─────────────────────────────────────────────────────────────────────
//  HARDWARE WALLET DETECTION
// ─────────────────────────────────────────────────────────────────────

/**
 * Check if hardware wallet support is available
 * @returns {Object} Support status for different hardware wallets
 */
export function checkHardwareWalletSupport() {
  return {
    ledger: typeof navigator !== 'undefined' && navigator.usb !== undefined,
    trezor: typeof window !== 'undefined', // Web-based, always available
    walletconnect: typeof window !== 'undefined',
  }
}

// ─────────────────────────────────────────────────────────────────────
//  LEDGER INTEGRATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Connect to Ledger device
 * @returns {Promise<Object>} Ledger connection info
 */
export async function connectLedger() {
  try {
    // Dynamic import to keep bundle size small
    const TransportWebUSB = await import('@ledgerhq/hw-transport-webusb').then(
      m => m.default
    )
    const EthApp = await import('@ledgerhq/hw-app-eth').then(m => m.default)

    // Request USB access to Ledger
    const transport = await TransportWebUSB.create()
    const eth = new EthApp(transport)

    // Get device info
    const { version, returnCode } = await eth.getAddress("44'/60'/0'/0/0", false, true)
    
    if (returnCode !== 0x9000) {
      throw new Error('Failed to connect to Ledger device')
    }

    return {
      type: 'ledger',
      transport,
      eth,
      connected: true,
      version: version || 'Unknown',
    }
  } catch (error) {
    console.error('Ledger connection failed:', error)
    throw new Error(`Ledger connection failed: ${error.message}`)
  }
}

/**
 * Get address from Ledger
 * @param {Object} eth - Ledger ETH app instance
 * @param {string} path - Derivation path
 * @returns {Promise<string>} Ethereum address
 */
export async function getLedgerAddress(eth, path = "44'/60'/0'/0/0") {
  try {
    const result = await eth.getAddress(path, false, true)
    return result.address
  } catch (error) {
    throw new Error(`Failed to get Ledger address: ${error.message}`)
  }
}

/**
 * Sign transaction with Ledger
 * @param {Object} eth - Ledger ETH app instance
 * @param {string} path - Derivation path
 * @param {Object} tx - Transaction object
 * @returns {Promise<Object>} Signature
 */
export async function signWithLedger(eth, path, tx) {
  try {
    const { serializeTx } = await import('ethers')
    
    // Serialize transaction
    const txSerialized = serializeTx(tx)
    
    // Sign with Ledger
    const signature = await eth.signTransaction(path, txSerialized)
    
    return {
      v: signature.v,
      r: signature.r,
      s: signature.s,
    }
  } catch (error) {
    throw new Error(`Ledger signing failed: ${error.message}`)
  }
}

/**
 * Sign message with Ledger
 * @param {Object} eth - Ledger ETH app instance
 * @param {string} path - Derivation path
 * @param {string} message - Message to sign
 * @returns {Promise<string>} Signature
 */
export async function signMessageWithLedger(eth, path, message) {
  try {
    const signature = await eth.signPersonalMessage(path, message)
    return `0x${signature.r}${signature.s}${signature.v.toString(16).padStart(2, '0')}`
  } catch (error) {
    throw new Error(`Ledger message signing failed: ${error.message}`)
  }
}

// ─────────────────────────────────────────────────────────────────────
//  TREZOR INTEGRATION
// ─────────────────────────────────────────────────────────────────────

/**
 * Initialize Trezor Connect
 * @param {string} manifestEmail - Manifest email for Trezor
 * @param {string} manifestAppUrl - Manifest app URL
 */
export function initTrezorConnect(manifestEmail, manifestAppUrl) {
  if (typeof window === 'undefined') return
  
  window.TrezorConnect = window.TrezorConnect || {}
  
  window.TrezorConnect.init({
    manifest: {
      email: manifestEmail,
      appUrl: manifestAppUrl,
    },
  })
}

/**
 * Get address from Trezor
 * @param {string} path - Derivation path
 * @returns {Promise<string>} Ethereum address
 */
export async function getTrezorAddress(path = "m/44'/60'/0'/0/0") {
  try {
    const TrezorConnect = window.TrezorConnect
    
    if (!TrezorConnect) {
      throw new Error('Trezor Connect not initialized')
    }

    const result = await TrezorConnect.ethereumGetAddress({
      path,
      showOnTrezor: false,
    })

    if (!result.success) {
      throw new Error(result.payload.error || 'Failed to get Trezor address')
    }

    return result.payload.address
  } catch (error) {
    throw new Error(`Trezor address retrieval failed: ${error.message}`)
  }
}

/**
 * Sign transaction with Trezor
 * @param {string} path - Derivation path
 * @param {Object} tx - Transaction object
 * @returns {Promise<Object>} Signature
 */
export async function signWithTrezor(path, tx) {
  try {
    const TrezorConnect = window.TrezorConnect
    
    if (!TrezorConnect) {
      throw new Error('Trezor Connect not initialized')
    }

    const result = await TrezorConnect.ethereumSignTransaction({
      path,
      transaction: {
        to: tx.to,
        value: tx.value,
        data: tx.data || '0x',
        chainId: tx.chainId,
        nonce: tx.nonce,
        gasLimit: tx.gasLimit,
        gasPrice: tx.gasPrice,
        maxFeePerGas: tx.maxFeePerGas,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      },
    })

    if (!result.success) {
      throw new Error(result.payload.error || 'Failed to sign with Trezor')
    }

    return {
      v: result.payload.v,
      r: result.payload.r,
      s: result.payload.s,
    }
  } catch (error) {
    throw new Error(`Trezor signing failed: ${error.message}`)
  }
}

/**
 * Sign message with Trezor
 * @param {string} path - Derivation path
 * @param {string} message - Message to sign
 * @returns {Promise<string>} Signature
 */
export async function signMessageWithTrezor(path, message) {
  try {
    const TrezorConnect = window.TrezorConnect
    
    if (!TrezorConnect) {
      throw new Error('Trezor Connect not initialized')
    }

    const result = await TrezorConnect.ethereumSignMessage({
      path,
      message,
    })

    if (!result.success) {
      throw new Error(result.payload.error || 'Failed to sign message with Trezor')
    }

    return result.payload.signature
  } catch (error) {
    throw new Error(`Trezor message signing failed: ${error.message}`)
  }
}

// ─────────────────────────────────────────────────────────────────────
//  WALLETCONNECT INTEGRATION (for mobile hardware wallets)
// ─────────────────────────────────────────────────────────────────────

/**
 * Connect via WalletConnect
 * @param {Object} opts - WalletConnect options
 * @returns {Promise<Object>} WalletConnect provider
 */
export async function connectWalletConnect(opts = {}) {
  try {
    const { EthereumProvider } = await import('@walletconnect/ethereum-provider')
    
    const provider = await EthereumProvider.init({
      projectId: opts.projectId || 'YOUR_PROJECT_ID',
      chains: opts.chains || [1],
      showQrModal: true,
      qrModalOptions: {
        themeMode: 'dark',
        themeVariables: {
          '--wcm-z-index': '9999',
        },
      },
      methods: opts.methods || [
        'eth_sendTransaction',
        'personal_sign',
        'eth_signTypedData',
      ],
      events: opts.events || ['chainChanged', 'accountsChanged'],
    })

    await provider.connect()

    return {
      type: 'walletconnect',
      provider,
      connected: true,
      accounts: provider.accounts,
      chainId: provider.chainId,
    }
  } catch (error) {
    console.error('WalletConnect failed:', error)
    throw new Error(`WalletConnect failed: ${error.message}`)
  }
}

/**
 * Sign transaction with WalletConnect
 * @param {Object} provider - WalletConnect provider
 * @param {Object} tx - Transaction object
 * @returns {Promise<string>} Transaction hash
 */
export async function signWithWalletConnect(provider, tx) {
  try {
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [tx],
    })

    return txHash
  } catch (error) {
    throw new Error(`WalletConnect transaction failed: ${error.message}`)
  }
}

// ─────────────────────────────────────────────────────────────────────
//  HARDWARE WALLET SIGNER (Ethers.js compatible)
// ─────────────────────────────────────────────────────────────────────

/**
 * Create a hardware wallet signer compatible with ethers.js
 * @param {string} type - Hardware wallet type ('ledger', 'trezor', 'walletconnect')
 * @param {Object} connection - Connection object from connect function
 * @param {Object} provider - Ethers provider
 * @param {string} path - Derivation path
 * @returns {Object} Hardware wallet signer
 */
export function createHardwareSigner(type, connection, provider, path) {
  const signer = {
    type,
    connection,
    path,
    provider,
    
    // Get address
    getAddress: async () => {
      switch (type) {
        case 'ledger':
          return await getLedgerAddress(connection.eth, path)
        case 'trezor':
          return await getTrezorAddress(path)
        case 'walletconnect':
          return connection.accounts[0]
        default:
          throw new Error(`Unsupported hardware wallet type: ${type}`)
      }
    },
    
    // Sign transaction
    signTransaction: async (tx) => {
      switch (type) {
        case 'ledger': {
          const sig = await signWithLedger(connection.eth, path, tx)
          return sig
        }
        case 'trezor': {
          const sig = await signWithTrezor(path, tx)
          return sig
        }
        case 'walletconnect': {
          const txHash = await signWithWalletConnect(connection.provider, tx)
          return txHash
        }
        default:
          throw new Error(`Unsupported hardware wallet type: ${type}`)
      }
    },
    
    // Sign message
    signMessage: async (message) => {
      switch (type) {
        case 'ledger':
          return await signMessageWithLedger(connection.eth, path, message)
        case 'trezor':
          return await signMessageWithTrezor(path, message)
        default:
          throw new Error(`Message signing not supported for: ${type}`)
      }
    },
    
    // Connect to provider
    connect: (newProvider) => {
      signer.provider = newProvider
      return signer
    },
  }
  
  return signer
}

// ─────────────────────────────────────────────────────────────────────
//  UI HELPERS
// ─────────────────────────────────────────────────────────────────────

/**
 * Get hardware wallet icon
 * @param {string} type - Hardware wallet type
 * @returns {string} Emoji icon
 */
export function getHardwareWalletIcon(type) {
  switch (type) {
    case 'ledger': return '🔷'
    case 'trezor': return '🔶'
    case 'walletconnect': return '📱'
    default: return '🔐'
  }
}

/**
 * Get hardware wallet display name
 * @param {string} type - Hardware wallet type
 * @returns {string} Display name
 */
export function getHardwareWalletName(type) {
  switch (type) {
    case 'ledger': return 'Ledger'
    case 'trezor': return 'Trezor'
    case 'walletconnect': return 'WalletConnect'
    default: return 'Hardware Wallet'
  }
}
