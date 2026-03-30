import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import {
  initWalletConnect,
  pairWithDapp,
  approveSession,
  rejectSession,
  disconnectSession,
  respondToRequest,
  signMessage,
  signTransaction,
  getActiveSessions,
  toCaip10,
  CHAIN_IDS,
  isWCInitialized,
} from '../utils/walletconnect'
import { ethers } from 'ethers'
import { useWallet } from '../hooks/useWallet'

const WalletConnectContext = createContext(null)

export function WalletConnectProvider({ children }) {
  const { wallet, currentAddress, activeChain } = useWallet()

  const [wcReady, setWcReady] = useState(false)
  const [wcError, setWcError] = useState(null)
  const [sessions, setSessions] = useState({}) // topic → session
  const [pendingProposal, setPendingProposal] = useState(null) // session_proposal awaiting approval
  const [pendingRequest, setPendingRequest] = useState(null) // session_request awaiting approval
  const [pairingUri, setPairingUri] = useState('')
  const [connecting, setConnecting] = useState(false)

  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

  // ── Initialize Web3Wallet once wallet is unlocked ────────────────────────
  useEffect(() => {
    if (!wallet || !projectId) return
    if (isWCInitialized()) {
      setSessions(getActiveSessions())
      setWcReady(true)
      return
    }

    initWalletConnect(projectId)
      .then(wc => {
        // Restore any active sessions
        setSessions(wc.getActiveSessions())
        setWcReady(true)
        attachListeners(wc)
      })
      .catch(err => {
        console.error('WalletConnect init failed:', err)
        setWcError(err.message)
      })
  }, [wallet, projectId, attachListeners])

  // ── Event listeners ───────────────────────────────────────────────────────
  const attachListeners = useCallback(wc => {
    // A dApp wants to connect
    wc.on('session_proposal', proposal => {
      setPendingProposal(proposal)
    })

    // A dApp sent a request (sign, send tx, etc.)
    wc.on('session_request', request => {
      setPendingRequest(request)
    })

    // A dApp disconnected
    wc.on('session_delete', ({ topic }) => {
      setSessions(prev => {
        const next = { ...prev }
        delete next[topic]
        return next
      })
    })
  }, [])

  // ── Pair via URI ──────────────────────────────────────────────────────────
  const connectWithUri = async uri => {
    if (!wcReady) throw new Error('WalletConnect not ready')
    setConnecting(true)
    try {
      await pairWithDapp(uri.trim())
      setPairingUri('')
    } catch (err) {
      throw new Error('Invalid WalletConnect URI: ' + err.message, {
        cause: err,
      })
    } finally {
      setConnecting(false)
    }
  }

  // ── Approve session proposal ──────────────────────────────────────────────
  const handleApproveSession = async () => {
    if (!pendingProposal || !currentAddress) return
    const chainId = CHAIN_IDS[activeChain] || 1
    const accounts = [toCaip10(chainId, currentAddress)]

    const session = await approveSession(pendingProposal, accounts)
    setSessions(prev => ({ ...prev, [session.topic]: session }))
    setPendingProposal(null)
    return session
  }

  // ── Reject session proposal ───────────────────────────────────────────────
  const handleRejectSession = async () => {
    if (!pendingProposal) return
    await rejectSession(pendingProposal)
    setPendingProposal(null)
  }

  // ── Handle incoming dApp request ──────────────────────────────────────────
  const handleApproveRequest = async () => {
    if (!pendingRequest || !wallet) return
    const { topic, id, params } = pendingRequest
    const { request } = params
    const activeAccount = wallet.accounts[wallet.activeAccount]

    try {
      let result

      if (request.method === 'personal_sign') {
        // params: [message, address]
        const message = request.params[0]
        result = await signMessage(message, activeAccount.privateKey)
      } else if (request.method === 'eth_sign') {
        // params: [address, message]
        const message = request.params[1]
        result = await signMessage(message, activeAccount.privateKey)
      } else if (
        request.method === 'eth_sendTransaction' ||
        request.method === 'eth_signTransaction'
      ) {
        const txParams = request.params[0]
        const rpcUrl = `https://mainnet.infura.io/v3/${import.meta.env.VITE_INFURA_KEY}`
        const provider = new ethers.JsonRpcProvider(rpcUrl)
        result = await signTransaction(
          txParams,
          activeAccount.privateKey,
          provider,
        )

        if (request.method === 'eth_sendTransaction') {
          // Broadcast the signed tx
          const txResponse = await provider.broadcastTransaction(result)
          result = txResponse.hash
        }
      } else if (
        request.method === 'eth_signTypedData_v4' ||
        request.method === 'eth_signTypedData'
      ) {
        const typedData = JSON.parse(request.params[1])
        const signer = new ethers.Wallet(activeAccount.privateKey)
        result = await signer.signTypedData(
          typedData.domain,
          typedData.types,
          typedData.message,
        )
      } else {
        throw new Error(`Method not supported: ${request.method}`)
      }

      await respondToRequest(topic, id, result)
    } catch (err) {
      await respondToRequest(
        topic,
        id,
        {
          code: 4001,
          message: err.message,
        },
        true,
      )
    }

    setPendingRequest(null)
  }

  const handleRejectRequest = async () => {
    if (!pendingRequest) return
    const { topic, id } = pendingRequest
    await respondToRequest(
      topic,
      id,
      { code: 4001, message: 'User rejected' },
      true,
    )
    setPendingRequest(null)
  }

  // ── Disconnect a session ──────────────────────────────────────────────────
  const handleDisconnect = async topic => {
    await disconnectSession(topic)
    setSessions(prev => {
      const next = { ...prev }
      delete next[topic]
      return next
    })
  }

  return (
    <WalletConnectContext.Provider
      value={{
        wcReady,
        wcError,
        sessions,
        pendingProposal,
        pendingRequest,
        pairingUri,
        setPairingUri,
        connecting,
        connectWithUri,
        approveSession: handleApproveSession,
        rejectSession: handleRejectSession,
        approveRequest: handleApproveRequest,
        rejectRequest: handleRejectRequest,
        disconnect: handleDisconnect,
        hasProjectId: !!projectId,
      }}
    >
      {children}
    </WalletConnectContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWalletConnect() {
  return useContext(WalletConnectContext)
}
