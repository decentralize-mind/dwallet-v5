const KEY = 'dwallet_referral'

export function getReferralCode(address) {
  if (!address) return 'TOKLO'
  return 'TK' + address.slice(2, 8).toUpperCase()
}

export function getReferralLink(address) {
  return 'https://www.toklo.xyz/?ref=' + getReferralCode(address)
}

export function getReferralStats() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{"signups":0,"earned":0}')
  } catch {
    return { signups: 0, earned: 0 }
  }
}

export function checkIncomingReferral() {
  try {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      sessionStorage.setItem('toklo_ref', ref)
      window.history.replaceState({}, '', window.location.pathname)
    }
    return ref
  } catch {
    return null
  }
}

export function copyReferralLink(address) {
  const link = getReferralLink(address)
  try {
    navigator.clipboard.writeText(link)
  } catch {
    // Silent failure if clipboard access is denied or API is missing
  }
  return link
}
