import { useState, useEffect, useRef } from 'react'
import { useWallet } from '../hooks/useWallet'
import { isValidAddress } from '../utils/crypto'
import { resolveENS } from '../utils/blockchain'
import { getPrice } from '../utils/prices'
import { getContacts, isWhitelisted, isNewAddress, getAddressWarningLevel } from '../utils/addressBook'
import { DWT } from '../utils/dwt'
import TransactionSimulation from './TransactionSimulation'

const CHAIN_TOKENS = {
  ethereum: ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'UNI', 'LINK', 'DWT'],
  bnb: ['BNB', 'CAKE', 'USDT', 'BUSD'],
  polygon: ['MATIC', 'USDC', 'USDT'],
  sepolia: ['ETH', 'DWT'],
  baseSepolia: ['ETH', 'DWT'],
  base: ['ETH', 'DWT', 'USDC'],
  arbitrum: ['ETH', 'USDC', 'USDT'],
}

const EXPLORERS = {
  ethereum: 'https://etherscan.io',
  bnb: 'https://bscscan.com',
  polygon: 'https://polygonscan.com',
  sepolia: 'https://sepolia.etherscan.io',
  baseSepolia: 'https://sepolia.basescan.org',
  base: 'https://basescan.org',
  arbitrum: 'https://arbiscan.io',
}

export default function SendModal({ onClose }) {
  const { sendTransaction, chainBalances, activeChain, gasInfo, wallet } = useWallet()
  const tokens = CHAIN_TOKENS[activeChain] || ['ETH']

  const [token, setToken] = useState(tokens[0])
  const [recipient, setRecipient] = useState('')
  const [resolvedAddr, setResolvedAddr] = useState('')
  const [ensDisplay, setEnsDisplay] = useState('')
  const [resolvingENS, setResolvingENS] = useState(false)
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState('form')
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [showContacts, setShowContacts] = useState(false)
  
  // Enhanced security features
  const [confirmCountdown, setConfirmCountdown] = useState(5)
  const [addressVerified, setAddressVerified] = useState(false)
  const [showFullAddress, setShowFullAddress] = useState(false)
  const [showSimulation, setShowSimulation] = useState(false)
  const confirmTimerRef = useRef(null)

  const contacts = getContacts()
  const balance = chainBalances[token] || 0
  const price = getPrice(token)
  const usdValue = (parseFloat(amount || 0) * price).toFixed(2)
  const finalAddr = resolvedAddr || recipient
  const isDWT = token === 'DWT'
  const isTestnet = activeChain === 'sepolia' || activeChain === 'baseSepolia'
  
  // Address security check
  const addressWarningLevel = finalAddr ? getAddressWarningLevel(finalAddr) : 'unknown'
  const isTrusted = isWhitelisted(finalAddr)
  const isNew = isNewAddress(finalAddr)
  
  // Debug: Log actual balance values
  console.log('🔍 Balance Debug:', {
    token,
    balance,
    chainBalances,
    activeChain
  })

  useEffect(() => {
    const t = CHAIN_TOKENS[activeChain] || ['ETH']
    setToken(t[0])
    setAmount('')
    setError('')
  }, [activeChain])
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearInterval(confirmTimerRef.current)
    }
  }, [])
  
  // Reset verification when step changes to confirm
  useEffect(() => {
    if (step === 'confirm') {
      setAddressVerified(false)
      setConfirmCountdown(5)
      setShowFullAddress(false)
      
      // Start countdown timer
      if (confirmTimerRef.current) clearInterval(confirmTimerRef.current)
      confirmTimerRef.current = setInterval(() => {
        setConfirmCountdown(prev => {
          if (prev <= 1) {
            if (confirmTimerRef.current) clearInterval(confirmTimerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
  }, [step])

  useEffect(() => {
    if (!recipient || isValidAddress(recipient)) {
      setResolvedAddr('')
      setEnsDisplay('')
      return
    }
    if (!recipient.includes('.')) return
    const t = setTimeout(async () => {
      setResolvingENS(true)
      try {
        const addr = await resolveENS(recipient)
        if (addr) {
          setResolvedAddr(addr)
          setEnsDisplay(addr)
        } else {
          setResolvedAddr('')
          setError('ENS name not found')
        }
      } catch {
        setResolvedAddr('')
      } finally {
        setResolvingENS(false)
      }
    }, 600)
    return () => clearTimeout(t)
  }, [recipient])

  const validate = () => {
    const amountNum = parseFloat(amount)
    
    console.log('✅ Validating transaction:', {
      amount: amountNum,
      balance,
      check: amountNum > balance,
      result: amountNum <= balance
    })
    
    if (!finalAddr || !isValidAddress(finalAddr)) {
      setError(
        recipient.includes('.')
          ? 'ENS could not be resolved'
          : 'Invalid wallet address',
      )
      return false
    }
    if (!amount || amountNum <= 0) {
      setError('Enter an amount')
      return false
    }
    if (amountNum > balance) {
      console.error('❌ Balance check failed:', { amount: amountNum, balance })
      setError('Insufficient balance')
      return false
    }
    
    // For native tokens, also check if there's enough for gas
    const nativeSyms = {
      ethereum: 'ETH',
      bnb: 'BNB',
      polygon: 'MATIC',
      sepolia: 'ETH',
      baseSepolia: 'ETH',
      base: 'ETH',
      arbitrum: 'ETH',
    }
    const isNative = token === nativeSyms[activeChain]
    
    if (isNative && gasInfo && gasInfo.ethCost) {
      const gasCost = parseFloat(gasInfo.ethCost)
      const totalNeeded = amountNum + gasCost
      
      console.log('🔍 Gas validation:', {
        amount: amountNum,
        gasCost,
        totalNeeded,
        balance,
        hasEnough: totalNeeded <= balance
      })
      
      if (totalNeeded > balance) {
        setError(`Insufficient funds. You need ${totalNeeded.toFixed(6)} ${token} total (${amountNum.toFixed(6)} for transfer + ${gasCost.toFixed(6)} for gas fees), but only have ${balance.toFixed(6)} ${token}`)
        return false
      }
    }
    
    console.log('✓ Validation passed!')
    return true
  }

  const handleSend = async () => {
    // SECURITY: Show transaction simulation before sending
    setShowSimulation(true)
  }

  const confirmSend = async (txData) => {
    setShowSimulation(false)
    setSending(true)
    setError('')
    
    // For native token transfers, check if there's enough balance for amount + gas
    const nativeSyms = {
      ethereum: 'ETH',
      bnb: 'BNB',
      polygon: 'MATIC',
      sepolia: 'ETH',
      baseSepolia: 'ETH',
      base: 'ETH',
      arbitrum: 'ETH',
    }
    const isNative = token === nativeSyms[activeChain]
    
    if (isNative) {
      const amountNum = parseFloat(amount)
      
      console.log('💰 Balance Check Debug:', {
        walletBalance: balance,
        sendAmount: amountNum,
        gasInfo,
        remaining: balance - amountNum,
        isTestnet,
        activeChain
      })
      
      // Check balance first
      if (amountNum > balance) {
        setError(`Insufficient balance. You're trying to send ${amountNum.toFixed(6)} ${token}, but only have ${balance.toFixed(6)} ${token}`)
        setSending(false)
        return
      }
      
      // Check if there's gas info available
      if (gasInfo && gasInfo.ethCost) {
        const gasCost = parseFloat(gasInfo.ethCost)
        const totalNeeded = amountNum + gasCost
        
        console.log('🔍 Pre-send validation:', {
          transferAmount: amountNum,
          gasCost,
          totalNeeded,
          balance,
          remaining: balance - totalNeeded,
          hasEnough: totalNeeded <= balance
        })
        
        if (totalNeeded > balance) {
          setError(
            `Insufficient funds for transfer + gas fees.\n\n` +
            `Transfer amount: ${amountNum.toFixed(6)} ${token}\n` +
            `Estimated gas: ${gasCost.toFixed(6)} ${token}\n` +
            `Total needed: ${totalNeeded.toFixed(6)} ${token}\n` +
            `Your balance: ${balance.toFixed(6)} ${token}\n\n` +
            `Shortfall: ${(totalNeeded - balance).toFixed(6)} ${token}\n\n` +
            `Please reduce the send amount or add more ${token} to cover gas fees.`
          )
          setSending(false)
          return
        }
      } else {
        console.warn('⚠️ No gas info available, proceeding with caution')
      }
    }
    
    try {
      console.log('📤 Sending transaction...', {
        to: finalAddr,
        amount,
        token,
        chain: activeChain,
        balance,
        isNative,
        gasInfo
      })
      
      const tx = await sendTransaction(finalAddr, amount, token, activeChain)
      setTxHash(tx.hash)
      setStep('success')
    } catch (e) {
      console.error('❌ Transaction failed:', e)
      console.error('Full error details:', JSON.stringify(e, null, 2))
      
      // Provide better error messages based on the error type
      let errorMessage = e.message || 'Transaction failed'
      
      if (errorMessage.includes('insufficient funds') || errorMessage.includes('INSUFFICIENT_FUNDS')) {
        const nativeSyms = {
          ethereum: 'ETH',
          bnb: 'BNB',
          polygon: 'MATIC',
          sepolia: 'ETH',
          baseSepolia: 'ETH',
          base: 'ETH',
          arbitrum: 'ETH',
        }
        const nativeToken = nativeSyms[activeChain] || 'ETH'
        
        // Extract actual amounts from error
        const valueMatch = e.toString().match(/"value":\s*"0x([0-9a-f]+)"/i)
        const sentValue = valueMatch ? ethers.formatEther('0x' + valueMatch[1]) : amount
        
        errorMessage = `Transaction rejected by blockchain: insufficient ${nativeToken}.\n\n` +
          `Details:\n` +
          `• Amount trying to send: ${parseFloat(sentValue).toFixed(6)} ${token}\n` +
          `• Your current balance: ${balance.toFixed(6)} ${token}\n` +
          `• Remaining after send: ${(balance - parseFloat(sentValue)).toFixed(6)} ${token}\n\n` +
          `Possible causes:\n` +
          `• Balance includes pending transactions (not yet confirmed)\n` +
          `• Network requires higher gas than estimated\n` +
          `• Wallet balance on blockchain differs from displayed\n\n` +
          `Solutions:\n` +
          `1. Try sending a SMALLER amount (leave more for gas)\n` +
          `2. Wait for any pending transactions to confirm\n` +
          `3. Check your actual on-chain balance at a block explorer`
      }
      
      setError(errorMessage)
    } finally {
      setSending(false)
    }
  }

  const explorerTxUrl =
    (EXPLORERS[activeChain] || EXPLORERS.ethereum) + '/tx/' + txHash

  // Faucet links for different networks
  const FAUCETS = {
    sepolia: [
      { name: 'Alchemy Faucet', url: 'https://sepoliafaucet.com/' },
      { name: 'Chainlink Faucet', url: 'https://faucets.chain.link/sepolia' },
      { name: 'Infura Faucet', url: 'https://www.infura.io/faucet/sepolia' },
    ],
    baseSepolia: [
      { name: 'Base Faucet', url: 'https://faucets.chain.link/base-sepolia' },
      { name: 'Coinbase Faucet', url: 'https://faucet.base.org/' },
    ],
  }
  
  const availableFaucets = FAUCETS[activeChain] || []
  const hasZeroBalance = balance <= 0.0001 // Consider as zero if less than 0.0001

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={function (e) {
          e.stopPropagation()
        }}
      >
        <div className="modal-header">
          <h2 className="modal-title">Send</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {step === 'form' && (
          <div className="modal-body">
            {/* Zero Balance Warning */}
            {hasZeroBalance && (
              <div
                style={{
                  padding: '12px',
                  marginBottom: 14,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ 
                      fontSize: 12, 
                      fontWeight: 700, 
                      color: '#ef4444',
                      margin: '0 0 8px 0',
                    }}>
                      Insufficient Balance
                    </p>
                    <p style={{ 
                      fontSize: 11, 
                      color: 'var(--text2)',
                      margin: '0 0 8px 0',
                      lineHeight: 1.5,
                    }}>
                      Your wallet has{' '}
                      <strong>{balance.toFixed(6)} {token}</strong> but you need at least some funds to send transactions.
                    </p>
                    
                    {isTestnet && availableFaucets.length > 0 && (
                      <>
                        <p style={{ 
                          fontSize: 11, 
                          color: 'var(--text3)',
                          margin: '0 0 6px 0',
                          fontWeight: 600,
                        }}>
                          🚰 Get free testnet tokens:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {availableFaucets.map(faucet => (
                            <a
                              key={faucet.name}
                              href={faucet.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 10px',
                                background: 'rgba(59,130,246,0.1)',
                                border: '1px solid rgba(59,130,246,0.3)',
                                borderRadius: '6px',
                                color: '#3b82f6',
                                textDecoration: 'none',
                                fontSize: 11,
                                fontWeight: 600,
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={e => {
                                e.target.style.background = 'rgba(59,130,246,0.15)'
                                e.target.style.borderColor = 'rgba(59,130,246,0.5)'
                              }}
                              onMouseLeave={e => {
                                e.target.style.background = 'rgba(59,130,246,0.1)'
                                e.target.style.borderColor = 'rgba(59,130,246,0.3)'
                              }}
                            >
                              <span>🔗</span>
                              <span>{faucet.name}</span>
                              <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↗</span>
                            </a>
                          ))}
                        </div>
                        <p style={{ 
                          fontSize: 10, 
                          color: 'var(--text3)',
                          margin: '8px 0 0 0',
                          fontStyle: 'italic',
                        }}>
                          💡 After receiving testnet tokens, come back and try sending again!
                        </p>
                      </>
                    )}
                    
                    {!isTestnet && (
                      <p style={{ 
                        fontSize: 11, 
                        color: 'var(--text3)',
                        margin: 0,
                      }}>
                        💡 You need to add {nativeSyms[activeChain] || 'ETH'} to your wallet from an exchange or another wallet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Network Info - Only show if balance is sufficient */}
            {!hasZeroBalance && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  marginBottom: 14,
                  background: isTestnet ? 'rgba(245,158,11,0.08)' : 'var(--bg3)',
                  border:
                    '1px solid ' +
                    (isTestnet ? 'rgba(245,158,11,0.25)' : 'var(--border)'),
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span style={{ fontSize: 12 }}>
                  {activeChain === 'baseSepolia'
                    ? '🔵'
                    : activeChain === 'sepolia'
                      ? '⬡'
                      : '🌐'}
                </span>
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}
                >
                  {activeChain === 'baseSepolia'
                    ? 'Base Sepolia (testnet)'
                    : activeChain === 'sepolia'
                      ? 'Ethereum Sepolia (testnet)'
                      : activeChain}
                </span>
                {isTestnet && (
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--amber)',
                      fontWeight: 600,
                      marginLeft: 'auto',
                    }}
                  >
                    Testnet only
                  </span>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Token</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tokens.map(function (t) {
                  return (
                    <button
                      key={t}
                      onClick={function () {
                        setToken(t)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 20,
                        background:
                          token === t ? 'var(--accent)' : 'var(--bg3)',
                        color: token === t ? 'white' : 'var(--text2)',
                        border:
                          '1px solid ' +
                          (token === t ? 'var(--accent)' : 'var(--border)'),
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font)',
                      }}
                    >
                      {t === 'DWT' && <span>◈</span>}
                      {t} — {(chainBalances[t] || 0).toFixed(4)}
                    </button>
                  )
                })}
              </div>
              {isDWT && (
                <p
                  style={{
                    fontSize: 10,
                    color: 'var(--accent)',
                    margin: '6px 0 0',
                    fontWeight: 600,
                  }}
                >
                  ◈ dWallet Token ·{' '}
                  {(
                    DWT.addresses[activeChain] ||
                    DWT.addresses.sepolia ||
                    ''
                  ).slice(0, 14)}
                  ...
                </p>
              )}
            </div>

            <div className="form-group">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <label className="form-label" style={{ margin: 0 }}>
                  Recipient
                </label>
                {contacts.length > 0 && (
                  <button
                    onClick={function () {
                      setShowContacts(function (v) {
                        return !v
                      })
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'var(--font)',
                      fontWeight: 600,
                    }}
                  >
                    📒 Contacts
                  </button>
                )}
              </div>
              <input
                className="field"
                placeholder="0x... or vitalik.eth"
                value={recipient}
                onChange={function (e) {
                  setRecipient(e.target.value)
                  setError('')
                  setResolvedAddr('')
                }}
              />
              {resolvingENS && <p className="field-hint">Resolving ENS...</p>}
              {ensDisplay && !resolvingENS && (
                <p className="field-hint positive">
                  ✓ {ensDisplay.slice(0, 10)}...{ensDisplay.slice(-4)}
                </p>
              )}
              
              {/* Address Trust Indicator */}
              {finalAddr && isValidAddress(finalAddr) && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: addressWarningLevel === 'safe' ? 'rgba(16,185,129,0.1)' :
                               addressWarningLevel === 'new' ? 'rgba(245,158,11,0.1)' :
                               'rgba(239,68,68,0.1)',
                    border: `1px solid ${
                      addressWarningLevel === 'safe' ? 'rgba(16,185,129,0.3)' :
                      addressWarningLevel === 'new' ? 'rgba(245,158,11,0.3)' :
                      'rgba(239,68,68,0.3)'
                    }`,
                    color: addressWarningLevel === 'safe' ? '#10b981' :
                           addressWarningLevel === 'new' ? '#f59e0b' :
                           '#ef4444'
                  }}
                >
                  {addressWarningLevel === 'safe' && (
                    <span>✓ Trusted Address (Whitelisted)</span>
                  )}
                  {addressWarningLevel === 'new' && (
                    <span>⚠️ New Address (Added recently)</span>
                  )}
                  {addressWarningLevel === 'unknown' && (
                    <span>⚠️ Unverified Address — Double-check before sending</span>
                  )}
                </div>
              )}
              {showContacts && contacts.length > 0 && (
                <div
                  style={{
                    marginTop: 6,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    maxHeight: 160,
                    overflowY: 'auto',
                  }}
                >
                  {contacts.map(function (c) {
                    return (
                      <button
                        key={c.address}
                        onClick={function () {
                          setRecipient(c.address)
                          setShowContacts(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          padding: '8px 12px',
                          background: 'var(--bg3)',
                          border: 'none',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font)',
                          textAlign: 'left',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 12,
                            color: 'var(--text)',
                          }}
                        >
                          {c.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--text3)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {c.address.slice(0, 10)}...{c.address.slice(-6)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Amount</label>
              <div className="amount-input-row">
                <input
                  className="field"
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  min="0"
                  step="any"
                  onChange={function (e) {
                    setAmount(e.target.value)
                  }}
                />
                <button
                  className="max-btn"
                  onClick={function () {
                    // For native tokens, reserve gas by subtracting estimated gas cost
                    const nativeSyms = {
                      ethereum: 'ETH',
                      bnb: 'BNB',
                      polygon: 'MATIC',
                      sepolia: 'ETH',
                      baseSepolia: 'ETH',
                      base: 'ETH',
                      arbitrum: 'ETH',
                    }
                    const isNative = token === nativeSyms[activeChain]
                    
                    if (isNative && gasInfo && gasInfo.ethCost) {
                      const gasCost = parseFloat(gasInfo.ethCost)
                      const maxAmount = Math.max(0, balance - gasCost)
                      setAmount(String(maxAmount.toFixed(6)))
                    } else {
                      setAmount(String(balance))
                    }
                  }}
                >
                  MAX
                </button>
              </div>
              <p className="field-hint">
                {'≈ $' +
                  usdValue +
                  ' · Balance: ' +
                  balance.toFixed(6) +
                  ' ' +
                  token +
                  (isDWT || !gasInfo?.ethCost ? '' : ' (keep ' + parseFloat(gasInfo.ethCost).toFixed(6) + ' for gas)')}
              </p>
            </div>

            <div className="gas-row">
              <span className="gas-label">⛽ Est. gas</span>
              <span className="gas-value">
                {(gasInfo && gasInfo.gwei) || '—'} Gwei
              </span>
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button
              className="btn-primary full-width"
              onClick={function () {
                setError('')
                if (validate()) setStep('confirm')
              }}
            >
              Review →
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="modal-body">
            {/* Security Warning Banner */}
            <div
              style={{
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px'
              }}
            >
              <p style={{ fontSize: '12px', color: '#f59e0b', margin: 0, fontWeight: '600' }}>
                ⚠️ Security Check: Verify all details before confirming
              </p>
            </div>

            <div className="confirm-card">
              <p className="confirm-label">Sending</p>
              <p className="confirm-amount">
                {amount} {token}
              </p>
              <p className="confirm-usd" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent)' }}>
                {'≈ $' + usdValue}
              </p>
            </div>
            
            <div className="confirm-detail">
              <div className="confirm-row">
                <span>To</span>
                <span 
                  className="mono" 
                  onClick={() => setShowFullAddress(!showFullAddress)}
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  title="Click to show full address"
                >
                  {showFullAddress ? finalAddr : `${finalAddr.slice(0, 10)}...${finalAddr.slice(-6)}`}
                </span>
              </div>
              {ensDisplay && (
                <div className="confirm-row">
                  <span>ENS Name</span>
                  <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{ensDisplay}</span>
                </div>
              )}
              <div className="confirm-row">
                <span>Network</span>
                <span>{activeChain}</span>
              </div>
              <div className="confirm-row">
                <span>Gas</span>
                <span>
                  {'~' + ((gasInfo && gasInfo.ethCost) || '—') + ' ETH'}
                </span>
              </div>
            </div>

            {/* Address Verification Checkbox */}
            <div
              style={{
                background: 'var(--bg3)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '12px'
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: 'var(--text2)',
                  lineHeight: '1.5'
                }}
              >
                <input
                  type="checkbox"
                  checked={addressVerified}
                  onChange={e => setAddressVerified(e.target.checked)}
                  style={{
                    marginTop: '2px',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: 'var(--accent)'
                  }}
                />
                <span>
                  <strong>I have verified the recipient address</strong> and confirm this transaction is correct. I understand transactions cannot be reversed.
                </span>
              </label>
            </div>

            {/* Countdown Timer */}
            {confirmCountdown > 0 && (
              <div
                style={{
                  background: confirmCountdown <= 2 ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                  border: `1px solid ${confirmCountdown <= 2 ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
                  padding: '10px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  marginBottom: '12px'
                }}
              >
                <span style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: confirmCountdown <= 2 ? '#10b981' : '#6366f1'
                }}>
                  ⏱️ Confirm button activates in {confirmCountdown} second{confirmCountdown !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {error && <p className="error-msg">{error}</p>}
            
            <div className="btn-row">
              <button
                className="btn-secondary"
                onClick={function () {
                  setStep('form')
                  if (confirmTimerRef.current) clearInterval(confirmTimerRef.current)
                }}
              >
                Edit
              </button>
              <button
                className="btn-primary"
                onClick={handleSend}
                disabled={sending || confirmCountdown > 0 || !addressVerified}
                style={{
                  opacity: (confirmCountdown > 0 || !addressVerified) ? 0.5 : 1,
                  cursor: (confirmCountdown > 0 || !addressVerified) ? 'not-allowed' : 'pointer'
                }}
              >
                {sending ? 'Sending...' : confirmCountdown > 0 ? `Wait ${confirmCountdown}s...` : 'Confirm Send'}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="modal-body center">
            <div className="success-icon">✓</div>
            <h3 className="success-title">Sent!</h3>
            <p className="success-sub">
              {amount + ' ' + token + ' sent successfully'}
            </p>
            <div className="tx-hash-box">
              <span className="tx-hash-label">Tx Hash</span>
              <span className="tx-hash-value mono">
                {txHash.slice(0, 22) + '...'}
              </span>
            </div>
            <a
              href={explorerTxUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary full-width"
              style={{ textAlign: 'center', display: 'block', marginTop: 8 }}
            >
              View on Explorer ↗
            </a>
            <button
              className="btn-primary full-width"
              onClick={onClose}
              style={{ marginTop: 8 }}
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Transaction Simulation */}
      {showSimulation && (
        <TransactionSimulation
          type="send"
          txData={{
            from: wallet?.accounts?.[wallet.activeAccount]?.address,
            to: finalAddr,
            amount: parseFloat(amount),
            token,
            chain: activeChain,
            balance,
            gasInfo,
            price,
            provider: null, // Would need provider from context
          }}
          onClose={() => setShowSimulation(false)}
          onConfirm={confirmSend}
        />
      )}
    </div>
  )
}
