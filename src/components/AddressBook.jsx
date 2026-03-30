import { useState } from 'react'
import { getContacts, saveContact, deleteContact } from '../utils/addressBook'

export default function AddressBook({ onSelect }) {
  const [contacts, setContacts] = useState(getContacts())
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const refresh = () => setContacts(getContacts())

  const isValid = addr => /^0x[0-9a-fA-F]{40}$/.test(addr.trim())

  const COLORS = [
    '#6366f1',
    '#10b981',
    '#f59e0b',
    '#3b82f6',
    '#ec4899',
    '#8b5cf6',
    '#14b8a6',
    '#f97316',
  ]
  const getColor = str => COLORS[str.charCodeAt(0) % COLORS.length]

  const handleSave = () => {
    if (!name.trim()) return setError('Enter a name')
    if (!isValid(address))
      return setError('Invalid address — must be 0x + 40 hex chars')
    saveContact(name.trim(), address.trim())
    setName('')
    setAddress('')
    setError('')
    setShowForm(false)
    refresh()
  }

  const handleCopy = addr => {
    navigator.clipboard.writeText(addr)
    setCopied(addr)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDelete = addr => {
    deleteContact(addr)
    refresh()
  }

  const filtered = contacts.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="view-container">
      <div
        className="view-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2 className="view-title">Address Book</h2>
        <button
          onClick={() => {
            setShowForm(v => !v)
            setError('')
          }}
          style={{
            background: showForm ? 'var(--bg3)' : 'var(--accent)',
            color: showForm ? 'var(--text2)' : 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            transition: 'all 0.15s',
          }}
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Add contact form */}
      {showForm && (
        <div
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-sm)',
            padding: 16,
            marginBottom: 16,
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              margin: '0 0 12px',
              color: 'var(--accent)',
            }}
          >
            New contact
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              className="field"
              placeholder="Name  (e.g. Vanda, Binance Hot Wallet)"
              value={name}
              autoFocus
              onChange={e => {
                setName(e.target.value)
                setError('')
              }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <input
              className="field"
              placeholder="Wallet address  (0x...)"
              value={address}
              onChange={e => {
                setAddress(e.target.value)
                setError('')
              }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
            {error && (
              <p className="error-msg" style={{ margin: 0 }}>
                {error}
              </p>
            )}
            <button
              className="btn-primary full-width"
              onClick={handleSave}
              disabled={!name.trim() || !address.trim()}
            >
              Save Contact
            </button>
          </div>
        </div>
      )}

      {/* Search — only when contacts exist */}
      {contacts.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 14,
              color: 'var(--text3)',
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
          <input
            className="field"
            placeholder="Search by name or address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
      )}

      {/* Empty state */}
      {contacts.length === 0 && !showForm && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            ��
          </div>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              margin: 0,
              color: 'var(--text)',
            }}
          >
            No contacts yet
          </p>
          <p
            style={{
              fontSize: 12,
              color: 'var(--text3)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Save wallet addresses you send to often — no more copy-pasting long
            addresses
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: 4 }}
            onClick={() => setShowForm(true)}
          >
            + Add your first contact
          </button>
        </div>
      )}

      {/* No search results */}
      {contacts.length > 0 && filtered.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '32px 20px',
            color: 'var(--text3)',
            fontSize: 13,
          }}
        >
          No contacts match "<strong>{search}</strong>"
        </div>
      )}

      {/* Contacts list */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(c => {
            const color = getColor(c.name)
            return (
              <div
                key={c.address}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: color + '18',
                    border: '2px solid ' + color + '40',
                    color,
                    fontSize: 17,
                    fontWeight: 700,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {c.name[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      margin: 0,
                      color: 'var(--text)',
                    }}
                  >
                    {c.name}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--text3)',
                      margin: '3px 0 0',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {c.address.slice(0, 10)}...{c.address.slice(-8)}
                  </p>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {/* Use — only shown when onSelect provided (Send modal) */}
                  {onSelect && (
                    <button
                      onClick={() => onSelect(c.address)}
                      style={{
                        background: color,
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        padding: '5px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'var(--font)',
                      }}
                    >
                      Use
                    </button>
                  )}

                  {/* Copy */}
                  <button
                    onClick={() => handleCopy(c.address)}
                    style={{
                      background:
                        copied === c.address
                          ? 'rgba(16,185,129,0.12)'
                          : 'var(--bg3)',
                      color:
                        copied === c.address ? 'var(--green)' : 'var(--text2)',
                      border:
                        '1px solid ' +
                        (copied === c.address
                          ? 'rgba(16,185,129,0.3)'
                          : 'var(--border)'),
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'var(--font)',
                      transition: 'all 0.2s',
                      fontWeight: copied === c.address ? 700 : 400,
                    }}
                  >
                    {copied === c.address ? '✓ Copied' : 'Copy'}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(c.address)}
                    style={{
                      background: 'none',
                      color: 'var(--text3)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '5px 8px',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.target.style.color = 'var(--red)'
                      e.target.style.borderColor = 'rgba(239,68,68,0.4)'
                    }}
                    onMouseLeave={e => {
                      e.target.style.color = 'var(--text3)'
                      e.target.style.borderColor = 'var(--border)'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Count footer */}
      {contacts.length > 0 && (
        <p
          style={{
            fontSize: 11,
            color: 'var(--text3)',
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''} saved
        </p>
      )}
    </div>
  )
}
