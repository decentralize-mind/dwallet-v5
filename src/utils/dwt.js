// ── DWT Token — Toklo native token ───────────────────────────────────────────
// Single source of truth. Update addresses here after each chain deployment.

export const DWT = {
  symbol: 'DWT',
  name: 'dWallet Token',
  icon: '◈',
  decimals: 18,
  color: '#6366f1',
  price: 3.50,
  marketCap: 4_500_000_000,
  priceChange: 12.4,

  addresses: {
    sepolia: '0xcDa9a9C0FC151Af06C8Fde002563133b86D45123', // ✅ live
    baseSepolia: '0xcDa9a9C0FC151Af06C8Fde002563133b86D45123', // ✅ live
    base: '0xcDa9a9C0FC151Af06C8Fde002563133b86D45123', // ✅ live
    ethereum: '0xcDa9a9C0FC151Af06C8Fde002563133b86D45123', // ✅ live
    polygon: '', // deploy pending
    arbitrum: '', // deploy pending
  },

  totalSupply: 75_000_000,
  circulatingSupply: 67_500_000,
  burned: 7_500_000,

  tiers: [
    { name: 'Tier 1', hold: 1_000, feeBps: 15, label: '0.15%' },
    { name: 'Tier 2', hold: 10_000, feeBps: 10, label: '0.10%' },
    { name: 'Tier 3', hold: 100_000, feeBps: 5, label: '0.05%' },
  ],
  defaultFeeBps: 20,

  explorerUrl: (chain = 'sepolia') => {
    const map = {
      sepolia: 'https://sepolia.etherscan.io/token/',
      baseSepolia: 'https://sepolia.basescan.org/token/',
      base: 'https://basescan.org/token/',
      ethereum: 'https://etherscan.io/token/',
    }
    const addr = DWT.addresses[chain]
    if (!addr) return null
    return (map[chain] || map.sepolia) + addr
  },
}

export function getDWTAddress(chainId = 'sepolia') {
  return DWT.addresses[chainId] || DWT.addresses.sepolia || null
}

export function getDWTTier(balance = 0) {
  for (const tier of [...DWT.tiers].reverse()) {
    if (balance >= tier.hold) return tier
  }
  return {
    name: 'Standard',
    hold: 0,
    feeBps: DWT.defaultFeeBps,
    label: '0.20%',
  }
}

export function formatDWT(amount) {
  if (!amount) return '0 DWT'
  const n = parseFloat(amount)
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M DWT'
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K DWT'
  return n.toFixed(4) + ' DWT'
}
