const KEY = 'dwallet_address_book'
const WHITELIST_KEY = 'dwallet_whitelist'

export function getContacts() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function saveContact(name, address, isTrusted = false) {
  const contacts = getContacts()
  const i = contacts.findIndex(
    c => c.address.toLowerCase() === address.toLowerCase(),
  )
  if (i >= 0) {
    contacts[i] = { 
      ...contacts[i], 
      name: name.trim(),
      isTrusted: isTrusted || contacts[i].isTrusted || false,
      trustedSince: contacts[i].trustedSince || (isTrusted ? Date.now() : null)
    }
  } else {
    contacts.push({ 
      id: Date.now(), 
      name: name.trim(), 
      address,
      isTrusted,
      trustedSince: isTrusted ? Date.now() : null,
      addedAt: Date.now()
    })
  }
  localStorage.setItem(KEY, JSON.stringify(contacts))
}

export function deleteContact(address) {
  localStorage.setItem(
    KEY,
    JSON.stringify(
      getContacts().filter(
        c => c.address.toLowerCase() !== address.toLowerCase(),
      ),
    ),
  )
}

export function findContact(address) {
  return getContacts().find(
    c => c.address.toLowerCase() === address.toLowerCase(),
  )
}

// ── Whitelist Functions ─────────────────────────────────────────────

/**
 * Check if an address is whitelisted
 */
export function isWhitelisted(address) {
  const contacts = getContacts()
  return contacts.some(
    c => c.isTrusted && c.address.toLowerCase() === address.toLowerCase()
  )
}

/**
 * Get all whitelisted addresses
 */
export function getWhitelistedAddresses() {
  const contacts = getContacts()
  return contacts
    .filter(c => c.isTrusted)
    .map(c => ({
      address: c.address,
      name: c.name,
      trustedSince: c.trustedSince
    }))
}

/**
 * Add address to whitelist
 */
export function addToWhitelist(address, name = '') {
  const contacts = getContacts()
  const i = contacts.findIndex(
    c => c.address.toLowerCase() === address.toLowerCase()
  )
  
  if (i >= 0) {
    contacts[i].isTrusted = true
    contacts[i].trustedSince = Date.now()
    if (name) contacts[i].name = name
  } else {
    contacts.push({
      id: Date.now(),
      name: name || 'Trusted Contact',
      address,
      isTrusted: true,
      trustedSince: Date.now(),
      addedAt: Date.now()
    })
  }
  
  localStorage.setItem(KEY, JSON.stringify(contacts))
}

/**
 * Remove address from whitelist
 */
export function removeFromWhitelist(address) {
  const contacts = getContacts()
  const i = contacts.findIndex(
    c => c.address.toLowerCase() === address.toLowerCase()
  )
  
  if (i >= 0) {
    contacts[i].isTrusted = false
    contacts[i].trustedSince = null
    localStorage.setItem(KEY, JSON.stringify(contacts))
  }
}

/**
 * Check if address was added recently (within 24 hours)
 */
export function isNewAddress(address, hoursThreshold = 24) {
  const contacts = getContacts()
  const contact = contacts.find(
    c => c.address.toLowerCase() === address.toLowerCase()
  )
  
  if (!contact || !contact.addedAt) return true
  
  const hoursSinceAdded = (Date.now() - contact.addedAt) / (1000 * 60 * 60)
  return hoursSinceAdded < hoursThreshold
}

/**
 * Get warning level for an address
 * Returns: 'safe' | 'new' | 'unknown'
 */
export function getAddressWarningLevel(address) {
  if (isWhitelisted(address)) return 'safe'
  if (isNewAddress(address)) return 'new'
  return 'unknown'
}
