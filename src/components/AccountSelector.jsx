import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import PasswordPrompt from './PasswordPrompt'
import WalletCreationModal from './WalletCreationModal'
import WalletImportModal from './WalletImportModal'
import WalletExportModal from './WalletExportModal'
import HardwareWalletModal from './HardwareWalletModal'

const AVATAR_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
]
const getColor = i => AVATAR_COLORS[i % AVATAR_COLORS.length]

export default function AccountSelector({ onClose }) {
  const { wallet, wallets, activeWalletIndex, addAccount, switchAccount, renameAccount, switchWallet, removeWallet, renameWallet, biometricEnabled, unlockWithBiometric } = useWallet()
  const accounts = wallet?.accounts || []
  const activeIndex = wallet?.activeAccount ?? 0

  const [copied, setCopied] = useState(null)
  const [adding, setAdding] = useState(false)
  const [editingI, setEditingI] = useState(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('accounts') // 'accounts' or 'wallets'
  const [showAddWallet, setShowAddWallet] = useState(false)
  const [showCreateWallet, setShowCreateWallet] = useState(false)
  const [showImportWallet, setShowImportWallet] = useState(false)
  const [showSwitchPassword, setShowSwitchPassword] = useState(false)
  const [pendingSwitchIndex, setPendingSwitchIndex] = useState(null)
  const [showRemovePassword, setShowRemovePassword] = useState(false)
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState(null)
  const [walletOperationLoading, setWalletOperationLoading] = useState(false)
  const [showRenamePassword, setShowRenamePassword] = useState(false)
  const [pendingRenameIndex, setPendingRenameIndex] = useState(null)
  const [pendingRenameName, setPendingRenameName] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [pendingExportIndex, setPendingExportIndex] = useState(null)
  const [showHardwareWallet, setShowHardwareWallet] = useState(false)

  const handleSwitch = i => {
    if (i === activeIndex) return
    switchAccount(i)
    onClose()
  }

  const handleAdd = async () => {
    setAdding(true)
    await addAccount()
    setAdding(false)
  }

  const handleSwitchWallet = async (index) => {
    if (index === activeWalletIndex) return
    
    // If biometric is enabled, try it first
    if (biometricEnabled) {
      try {
        await unlockWithBiometric()
        // Biometric succeeded, now we still need password for decryption
        // but we can show a different message
        setPendingSwitchIndex(index)
        setShowSwitchPassword(true)
        return
      } catch (err) {
        // Biometric failed or cancelled, fall back to password
        console.log('Biometric failed, falling back to password')
      }
    }
    
    setPendingSwitchIndex(index)
    setShowSwitchPassword(true)
  }

  const handleSwitchWalletWithPassword = async (password) => {
    if (pendingSwitchIndex === null) return
    
    setWalletOperationLoading(true)
    try {
      await switchWallet(pendingSwitchIndex, password)
      setShowSwitchPassword(false)
      setPendingSwitchIndex(null)
      onClose()
    } catch (err) {
      console.error('Failed to switch wallet:', err)
      // Error is handled by PasswordPrompt
    } finally {
      setWalletOperationLoading(false)
    }
  }

  const handleBiometricSwitch = async () => {
    if (pendingSwitchIndex === null) return
    
    try {
      await unlockWithBiometric()
      // After biometric succeeds, user still needs to enter password
      // but we can show a success notification
      notify('✓ Biometric verified', 'success')
    } catch (err) {
      console.error('Biometric verification failed:', err)
      notify('Biometric verification failed', 'error')
    }
  }

  const handleRemoveWallet = (index) => {
    if (wallets.length <= 1) {
      alert('Cannot remove the last wallet')
      return
    }
    setPendingRemoveIndex(index)
    setShowRemovePassword(true)
  }

  const handleRemoveWalletWithPassword = async (password) => {
    if (pendingRemoveIndex === null) return
    
    setWalletOperationLoading(true)
    try {
      await removeWallet(pendingRemoveIndex, password)
      setShowRemovePassword(false)
      setPendingRemoveIndex(null)
    } catch (err) {
      console.error('Failed to remove wallet:', err)
      // Error is handled by PasswordPrompt
    } finally {
      setWalletOperationLoading(false)
    }
  }

  const handleRenameWallet = (index, currentName) => {
    const newName = prompt('Enter new wallet name:', currentName)
    if (newName && newName.trim() && newName.trim() !== currentName) {
      setPendingRenameIndex(index)
      setPendingRenameName(newName.trim())
      setShowRenamePassword(true)
    }
  }

  const handleExportWallet = (index) => {
    setPendingExportIndex(index)
    setShowExportModal(true)
  }

  const handleRenameWalletWithPassword = async (password) => {
    if (pendingRenameIndex === null || !pendingRenameName) return
    
    setWalletOperationLoading(true)
    try {
      await renameWallet(pendingRenameIndex, pendingRenameName, password)
      setShowRenamePassword(false)
      setPendingRenameIndex(null)
      setPendingRenameName('')
    } catch (err) {
      console.error('Failed to rename wallet:', err)
      // Error is handled by PasswordPrompt
    } finally {
      setWalletOperationLoading(false)
    }
  }

  const handleCopy = (addr, e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(addr)
    setCopied(addr)
    setTimeout(() => setCopied(null), 2000)
  }

  const startEdit = (i, currentName, e) => {
    e.stopPropagation()
    setEditingI(i)
    setEditName(currentName)
  }

  const cancelEdit = e => {
    e && e.stopPropagation()
    setEditingI(null)
    setEditName('')
  }

  const saveEdit = async e => {
    e && e.stopPropagation()
    if (!editName.trim()) return
    setSaving(true)
    await renameAccount(editingI, editName.trim())
    setSaving(false)
    setEditingI(null)
    setEditName('')
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ alignItems: 'flex-end', padding: 0 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg2)',
          borderRadius: '20px 20px 0 0',
          width: '100%',
          maxWidth: 480,
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          animation: 'slideUp 0.22s ease',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '10px 0 4px',
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: 'var(--border)',
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 20px 14px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                margin: 0,
                color: 'var(--text)',
              }}
            >
              My Accounts
            </h2>
            <p
              style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0' }}
            >
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} · tap
              edit icon to rename
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--text2)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            padding: '0 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setActiveTab('accounts')}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'accounts' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'accounts' ? 'var(--accent)' : 'var(--text3)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              transition: 'all 0.2s',
            }}
          >
            Accounts ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab('wallets')}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'wallets' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'wallets' ? 'var(--accent)' : 'var(--text3)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              transition: 'all 0.2s',
            }}
          >
            Wallets ({wallets.length || 1})
          </button>
        </div>

        {/* Scrollable account list */}
        {activeTab === 'accounts' && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {accounts.map((acc, i) => {
            const isActive = i === activeIndex
            const color = getColor(i)
            const isCopied = copied === acc.address
            const isEditing = editingI === i

            return (
              <div
                key={i}
                onClick={() => !isEditing && handleSwitch(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 14px',
                  background: isActive ? color + '0f' : 'var(--bg3)',
                  border:
                    '1px solid ' + (isActive ? color + '55' : 'var(--border)'),
                  borderRadius: 14,
                  cursor: isActive ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {/* Colored avatar */}
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: color + '18',
                    border: '2.5px solid ' + color + (isActive ? '99' : '40'),
                    color,
                    fontSize: 19,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    userSelect: 'none',
                  }}
                >
                  {(acc.name || 'A')[0].toUpperCase()}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 15,
                        height: 15,
                        borderRadius: '50%',
                        background: 'var(--green)',
                        border: '2px solid var(--bg2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 8,
                        color: 'white',
                        fontWeight: 900,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>

                {/* Name + address */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditing ? (
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <input
                        autoFocus
                        maxLength={24}
                        placeholder="Enter account name..."
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(e)
                          if (e.key === 'Escape') cancelEdit(e)
                        }}
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          background: 'var(--bg2)',
                          border: '1.5px solid var(--accent)',
                          borderRadius: 8,
                          padding: '5px 10px',
                          color: 'var(--text)',
                          fontFamily: 'var(--font)',
                          outline: 'none',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={saveEdit}
                          disabled={!editName.trim() || saving}
                          style={{
                            flex: 1,
                            padding: '5px 0',
                            background: editName.trim()
                              ? 'var(--accent)'
                              : 'var(--bg3)',
                            color: editName.trim() ? 'white' : 'var(--text3)',
                            border: 'none',
                            borderRadius: 7,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: editName.trim() ? 'pointer' : 'default',
                            fontFamily: 'var(--font)',
                          }}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            flex: 1,
                            padding: '5px 0',
                            background: 'var(--bg3)',
                            color: 'var(--text2)',
                            border: '1px solid var(--border)',
                            borderRadius: 7,
                            fontSize: 12,
                            cursor: 'pointer',
                            fontFamily: 'var(--font)',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                      <p
                        style={{
                          fontSize: 10,
                          color: 'var(--text3)',
                          margin: 0,
                          textAlign: 'right',
                        }}
                      >
                        {editName.length}/24
                      </p>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 3,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            margin: 0,
                            color: 'var(--text)',
                            lineHeight: 1.2,
                          }}
                        >
                          {acc.name || `Account ${i + 1}`}
                        </p>
                        {isActive && (
                          <span
                            style={{
                              fontSize: 9,
                              padding: '1px 6px',
                              borderRadius: 8,
                              fontWeight: 700,
                              background: color + '20',
                              color,
                            }}
                          >
                            Active
                          </span>
                        )}
                        <button
                          onClick={e =>
                            startEdit(i, acc.name || `Account ${i + 1}`, e)
                          }
                          title="Rename account"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text3)',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            fontSize: 12,
                            lineHeight: 1,
                            marginLeft: 2,
                          }}
                          onMouseEnter={e =>
                            (e.currentTarget.style.color = 'var(--accent)')
                          }
                          onMouseLeave={e =>
                            (e.currentTarget.style.color = 'var(--text3)')
                          }
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 14 14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" />
                            <path d="M8 4l2 2" />
                          </svg>
                        </button>
                      </div>
                      <p
                        style={{
                          fontSize: 10,
                          color: 'var(--text3)',
                          margin: 0,
                          fontFamily: 'var(--font-mono)',
                          letterSpacing: '0.2px',
                          wordBreak: 'break-all',
                          lineHeight: 1.6,
                        }}
                      >
                        {acc.address}
                      </p>
                    </>
                  )}
                </div>

                {!isEditing && (
                  <button
                    onClick={e => handleCopy(acc.address, e)}
                    style={{
                      flexShrink: 0,
                      padding: '5px 10px',
                      background: isCopied
                        ? 'rgba(16,185,129,0.1)'
                        : 'var(--bg2)',
                      border:
                        '1px solid ' +
                        (isCopied ? 'rgba(16,185,129,0.35)' : 'var(--border)'),
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: isCopied ? 700 : 400,
                      color: isCopied ? 'var(--green)' : 'var(--text2)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font)',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isCopied ? '✓ Copied' : 'Copy'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        )}

        {/* Wallets tab */}
        {activeTab === 'wallets' && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Current wallet info */}
          <div
            style={{
              padding: '16px',
              background: 'var(--accent)',
              borderRadius: 14,
              marginBottom: 8,
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.8)',
                margin: '0 0 4px',
              }}
            >
              Current Wallet
            </p>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'white',
                margin: 0,
              }}
            >
              {wallet?.accounts?.[0]?.name || 'Wallet 1'}
            </p>
            <p
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.9)',
                margin: '4px 0 0',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {wallet?.accounts?.[0]?.address || ''}
            </p>
          </div>

          {/* Wallets list */}
          {(wallets.length > 0 ? wallets : [{ id: 'default', name: 'Wallet 1', address: wallet?.accounts?.[0]?.address, createdAt: Date.now() }]).map((w, i) => {
            const isActive = i === activeWalletIndex
            const color = getColor(i)
            
            return (
              <div
                key={w.id || i}
                onClick={() => handleSwitchWallet(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 14px',
                  background: isActive ? color + '0f' : 'var(--bg3)',
                  border:
                    '1px solid ' + (isActive ? color + '55' : 'var(--border)'),
                  borderRadius: 14,
                  cursor: isActive ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {/* Colored avatar */}
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: color + '18',
                    border: '2.5px solid ' + color + (isActive ? '99' : '40'),
                    color,
                    fontSize: 19,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    userSelect: 'none',
                  }}
                >
                  {(w.name || 'W')[0].toUpperCase()}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 15,
                        height: 15,
                        borderRadius: '50%',
                        background: 'var(--green)',
                        border: '2px solid var(--bg2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 8,
                        color: 'white',
                        fontWeight: 900,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>

                {/* Name + address */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 3,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        margin: 0,
                        color: 'var(--text)',
                        lineHeight: 1.2,
                      }}
                    >
                      {w.name || `Wallet ${i + 1}`}
                    </p>
                    {isActive && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: '1px 6px',
                          borderRadius: 8,
                          fontWeight: 700,
                          background: color + '20',
                          color,
                        }}
                      >
                        Active
                      </span>
                    )}
                    {w.isHardwareWallet && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: '1px 6px',
                          borderRadius: 8,
                          fontWeight: 700,
                          background: 'rgba(59,130,246,0.1)',
                          color: '#3b82f6',
                        }}
                      >
                        🔐 Hardware
                      </span>
                    )}
                    {!isActive && wallets.length > 1 && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleRemoveWallet(i)
                        }}
                        title="Remove wallet"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text3)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          fontSize: 12,
                          lineHeight: 1,
                        }}
                        onMouseEnter={e =>
                          (e.currentTarget.style.color = '#ef4444')
                        }
                        onMouseLeave={e =>
                          (e.currentTarget.style.color = 'var(--text3)')
                        }
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 4h8M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M6 6v5M8 6v5M4 4l1 8h4l1-8" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleRenameWallet(i, w.name || `Wallet ${i + 1}`)
                      }}
                      title="Rename wallet"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text3)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: 12,
                        lineHeight: 1,
                      }}
                      onMouseEnter={e =>
                        (e.currentTarget.style.color = 'var(--accent)')
                      }
                      onMouseLeave={e =>
                        (e.currentTarget.style.color = 'var(--text3)')
                      }
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" />
                        <path d="M8 4l2 2" />
                      </svg>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleExportWallet(i)
                      }}
                      title="Export wallet seed phrase"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text3)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: 12,
                        lineHeight: 1,
                      }}
                      onMouseEnter={e =>
                        (e.currentTarget.style.color = '#f59e0b')
                      }
                      onMouseLeave={e =>
                        (e.currentTarget.style.color = 'var(--text3)')
                      }
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 9v3a1 1 0 01-1 1H3a1 1 0 01-1-1V9" />
                        <path d="M7 3v6M4 6l3 3 3-3" />
                      </svg>
                    </button>
                  </div>
                  <p
                    style={{
                      fontSize: 10,
                      color: 'var(--text3)',
                      margin: 0,
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.2px',
                      wordBreak: 'break-all',
                      lineHeight: 1.6,
                    }}
                  >
                    {w.address || 'Locked'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px 28px',
            borderTop: '1px solid var(--border)',
            marginTop: 8,
          }}
        >
          {activeTab === 'accounts' ? (
            <>
              <button
                onClick={handleAdd}
                disabled={adding}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '13px',
                  background: adding ? 'rgba(99,102,241,0.06)' : 'var(--bg3)',
                  border:
                    '1.5px dashed ' + (adding ? 'var(--accent)' : 'var(--border)'),
                  borderRadius: 14,
                  cursor: adding ? 'default' : 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: adding ? 'var(--accent)' : 'var(--text2)',
                  fontFamily: 'var(--font)',
                  transition: 'all 0.2s',
                }}
              >
                {adding ? (
                  <>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        border: '2px solid rgba(99,102,241,0.25)',
                        borderTopColor: 'var(--accent)',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    Creating account...
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 15,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      +
                    </span>
                    Add Account
                  </>
                )}
              </button>
              <p
                style={{
                  fontSize: 10,
                  color: 'var(--text3)',
                  textAlign: 'center',
                  margin: '8px 0 0',
                  lineHeight: 1.5,
                }}
              >
                All accounts share the same seed phrase
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowAddWallet(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '13px',
                  background: 'var(--bg3)',
                  border: '1.5px dashed var(--border)',
                  borderRadius: 14,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text2)',
                  fontFamily: 'var(--font)',
                  transition: 'all 0.2s',
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  +
                </span>
                Add Wallet
              </button>
              <p
                style={{
                  fontSize: 10,
                  color: 'var(--text3)',
                  textAlign: 'center',
                  margin: '8px 0 0',
                  lineHeight: 1.5,
                }}
              >
                Create or import a new wallet
              </p>
            </>
          )}
        </div>
      </div>

      {/* Add Wallet Modal */}
      {showAddWallet && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddWallet(false)}
          style={{ alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg2)',
              borderRadius: '20px',
              width: '90%',
              maxWidth: 400,
              padding: '24px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
            }}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                margin: '0 0 8px',
                color: 'var(--text)',
              }}
            >
              Add New Wallet
            </h3>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text2)',
                margin: '0 0 20px',
                lineHeight: 1.5,
              }}
            >
              Choose how you want to add a wallet:
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <button
                onClick={() => {
                  setShowAddWallet(false)
                  setShowCreateWallet(true)
                }}
                style={{
                  padding: '16px',
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                }}
              >
                Create New Wallet
              </button>
              <button
                onClick={() => {
                  setShowAddWallet(false)
                  setShowImportWallet(true)
                }}
                style={{
                  padding: '16px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  color: 'var(--text)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                }}
              >
                Import Existing Wallet
              </button>
              <button
                onClick={() => {
                  setShowAddWallet(false)
                  setShowHardwareWallet(true)
                }}
                style={{
                  padding: '16px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  color: 'var(--text)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                }}
              >
                🔐 Connect Hardware Wallet
              </button>
              <button
                onClick={() => setShowAddWallet(false)}
                style={{
                  padding: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text3)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  marginTop: 8,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Creation Modal */}
      {showCreateWallet && (
        <WalletCreationModal
          onSuccess={() => {
            setShowCreateWallet(false)
            onClose()
          }}
          onCancel={() => setShowCreateWallet(false)}
        />
      )}

      {/* Wallet Import Modal */}
      {showImportWallet && (
        <WalletImportModal
          onSuccess={() => {
            setShowImportWallet(false)
            onClose()
          }}
          onCancel={() => setShowImportWallet(false)}
        />
      )}

      {/* Password Prompt for Switching Wallets */}
      {showSwitchPassword && (
        <PasswordPrompt
          title="Switch Wallet"
          message="Enter your password to switch to this wallet"
          onSuccess={handleSwitchWalletWithPassword}
          onCancel={() => {
            setShowSwitchPassword(false)
            setPendingSwitchIndex(null)
          }}
          buttonText="Switch Wallet"
          showBiometric={biometricEnabled}
          onBiometricClick={handleBiometricSwitch}
        />
      )}

      {/* Password Prompt for Removing Wallets */}
      {showRemovePassword && (
        <PasswordPrompt
          title="Remove Wallet"
          message="Enter your password to confirm wallet removal. This action cannot be undone."
          onSuccess={handleRemoveWalletWithPassword}
          onCancel={() => {
            setShowRemovePassword(false)
            setPendingRemoveIndex(null)
          }}
          buttonText="Remove Wallet"
        />
      )}

      {/* Password Prompt for Renaming Wallets */}
      {showRenamePassword && (
        <PasswordPrompt
          title="Rename Wallet"
          message={`Enter your password to rename wallet to "${pendingRenameName}"`}
          onSuccess={handleRenameWalletWithPassword}
          onCancel={() => {
            setShowRenamePassword(false)
            setPendingRenameIndex(null)
            setPendingRenameName('')
          }}
          buttonText="Rename Wallet"
        />
      )}

      {/* Wallet Export Modal */}
      {showExportModal && pendingExportIndex !== null && (
        <WalletExportModal
          walletIndex={pendingExportIndex}
          onSuccess={() => {
            setShowExportModal(false)
            setPendingExportIndex(null)
          }}
          onCancel={() => {
            setShowExportModal(false)
            setPendingExportIndex(null)
          }}
        />
      )}

      {/* Hardware Wallet Modal */}
      {showHardwareWallet && (
        <HardwareWalletModal
          onSuccess={() => {
            setShowHardwareWallet(false)
            onClose()
          }}
          onCancel={() => setShowHardwareWallet(false)}
        />
      )}
    </div>
  )
}
