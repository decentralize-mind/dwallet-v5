import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'

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
  const { wallet, addAccount, switchAccount, renameAccount } = useWallet()
  const accounts = wallet?.accounts || []
  const activeIndex = wallet?.activeAccount ?? 0

  const [copied, setCopied] = useState(null)
  const [adding, setAdding] = useState(false)
  const [editingI, setEditingI] = useState(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

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

        {/* Scrollable account list */}
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

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px 28px',
            borderTop: '1px solid var(--border)',
            marginTop: 8,
          }}
        >
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
        </div>
      </div>
    </div>
  )
}
