import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '../hooks/useWallet'
import { chainIdToKey, detectBrowserWalletNetwork } from '../utils/networkDetection'

/**
 * Hook for automatic network detection from browser wallets (MetaMask, etc.)
 * Automatically detects and syncs the network chain ID
 */
export function useNetworkDetection() {
  const { activeChain, setActiveChain } = useWallet()
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectedChain, setDetectedChain] = useState(null)
  const [error, setError] = useState(null)
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true)

  // Detect network from window.ethereum (MetaMask, etc.)
  const detectEthereumNetwork = useCallback(async () => {
    if (!window.ethereum) {
      return null
    }

    try {
      setIsDetecting(true)
      setError(null)

      const result = await detectBrowserWalletNetwork()
      
      if (result) {
        setDetectedChain(result.chainKey)
        if (autoDetectEnabled) {
          setActiveChain(result.chainKey)
        }
        return result.chainKey
      } else {
        setError('Unsupported network or no wallet detected')
        return null
      }
    } catch (err) {
      console.error('Failed to detect Ethereum network:', err)
      setError('Failed to detect network')
      return null
    } finally {
      setIsDetecting(false)
    }
  }, [setActiveChain, autoDetectEnabled])

  // Listen for network changes
  useEffect(() => {
    if (!window.ethereum || !autoDetectEnabled) return

    const handleChainChanged = (chainId) => {
      console.log('🔄 Network changed detected:', chainId)
      const chainKey = chainIdToKey(chainId)
      
      if (chainKey) {
        setDetectedChain(chainKey)
        setActiveChain(chainKey)
        setError(null)
      } else {
        const chainIdNumber = typeof chainId === 'string' 
          ? parseInt(chainId, 16) 
          : chainId
        setError(`Network changed to unsupported chain (ID: ${chainIdNumber})`)
      }
    }

    // Listen for chain changes
    window.ethereum.on('chainChanged', handleChainChanged)

    // Cleanup listener
    return () => {
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [setActiveChain, autoDetectEnabled])

  // Initial detection on mount
  useEffect(() => {
    if (window.ethereum && autoDetectEnabled) {
      detectEthereumNetwork()
    }
  }, [detectEthereumNetwork, autoDetectEnabled])

  // Toggle auto-detection
  const toggleAutoDetect = useCallback(() => {
    setAutoDetectEnabled(prev => !prev)
  }, [])

  // Manual refresh
  const refreshDetection = useCallback(() => {
    return detectEthereumNetwork()
  }, [detectEthereumNetwork])

  return {
    isDetecting,
    detectedChain,
    error,
    autoDetectEnabled,
    toggleAutoDetect,
    refreshDetection,
    hasEthereumWallet: !!window.ethereum,
  }
}
