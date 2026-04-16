import { useState } from 'react'

const WALLET_COLORS = [
  { name: 'Purple', value: '#6366f1' },
  { name: 'Green', value: '#10b981' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Red', value: '#ef4444' },
]

const WALLET_GROUPS = [
  'Personal',
  'Business',
  'DeFi',
  'Trading',
  'Savings',
  'NFTs',
  'Test',
  'Other'
]

export default function WalletOrganizationModal({ 
  wallet,
  onUpdate, 
  onCancel 
}) {
  const [color, setColor] = useState(wallet?.color || null)
  const [group, setGroup] = useState(wallet?.group || null)
  const [notes, setNotes] = useState(wallet?.notes || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate({ color, group, notes })
    } catch (err) {
      console.error('Failed to update:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg2)',
          borderRadius: '20px',
          width: '90%',
          maxWidth: 450,
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '24px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', color: 'var(--text)' }}>
          Organize Wallet
        </h3>

        {/* Color Selection */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12, display: 'block' }}>
            Color Tag
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setColor(null)}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: !color ? '3px solid var(--accent)' : '2px solid var(--border)',
                background: 'var(--bg3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              ✕
            </button>
            {WALLET_COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: color === c.value ? '3px solid var(--text)' : '2px solid transparent',
                  background: c.value,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Group Selection */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12, display: 'block' }}>
            Category
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setGroup(null)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: !group ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: !group ? 'rgba(99,102,241,0.1)' : 'var(--bg3)',
                color: !group ? 'var(--accent)' : 'var(--text2)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              None
            </button>
            {WALLET_GROUPS.map(g => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: group === g ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: group === g ? 'rgba(99,102,241,0.1)' : 'var(--bg3)',
                  color: group === g ? 'var(--accent)' : 'var(--text2)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 8, display: 'block' }}>
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about this wallet..."
            rows={3}
            maxLength={200}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              fontSize: 13,
              color: 'var(--text)',
              fontFamily: 'var(--font)',
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: '4px 0 0', textAlign: 'right' }}>
            {notes.length}/200
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: '14px',
              background: saving ? 'rgba(99,102,241,0.3)' : 'var(--accent)',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font)',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: '14px 20px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text2)',
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font)',
              opacity: saving ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
