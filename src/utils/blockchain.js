// Real blockchain interactions via ethers.js + Infura
// Covers: balances, tx history, gas estimation, ENS, broadcast
import { ethers } from 'ethers'

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
]

// ── Provider ──────────────────────────────────────────────────────────────────
export function getProvider(chainId = 'ethereum') {
  const infuraKey = import.meta.env.VITE_INFURA_KEY
  const alchemyKey = import.meta.env.VITE_INFURA_KEY

  const RPC = {
    ethereum: infuraKey
      ? `https://mainnet.infura.io/v3/${infuraKey}`
      : alchemyKey
        ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
        : 'https://cloudflare-eth.com', // free public fallback
    bnb: 'https://bsc-dataseed.binance.org/',
    polygon: infuraKey
      ? `https://polygon-mainnet.infura.io/v3/${infuraKey}`
      : 'https://polygon-rpc.com/',
    sepolia: infuraKey
      ? `https://sepolia.infura.io/v3/${infuraKey}`
      : 'https://ethereum-sepolia.publicnode.com',
    baseSepolia: 'https://sepolia.base.org',
    base: 'https://mainnet.base.org',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    solana: null,
  }

  const url = RPC[chainId]
  if (!url) return null
  return new ethers.JsonRpcProvider(url)
}

export function getSigner(privateKey, chainId = 'ethereum') {
  const provider = getProvider(chainId)
  if (!provider) throw new Error('No RPC provider for ' + chainId)
  return new ethers.Wallet(privateKey, provider)
}

// ── ENS Resolution ─────────────────────────────────────────────────────────────
export async function resolveENS(nameOrAddress) {
  if (ethers.isAddress(nameOrAddress)) return nameOrAddress
  if (!nameOrAddress.includes('.')) return null
  try {
    const provider = getProvider('ethereum')
    const resolved = await provider.resolveName(nameOrAddress)
    return resolved // null if not found
  } catch {
    return null
  }
}

export async function lookupENS(address) {
  try {
    const provider = getProvider('ethereum')
    return await provider.lookupAddress(address)
  } catch {
    return null
  }
}

// ── Native + ERC-20 balances ───────────────────────────────────────────────────
const TOKEN_ADDRESSES = {
  ethereum: {
     
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    // eslint-disable-next-line no-secrets/no-secrets
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    // eslint-disable-next-line no-secrets/no-secrets
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    // eslint-disable-next-line no-secrets/no-secrets
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    // eslint-disable-next-line no-secrets/no-secrets
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    // eslint-disable-next-line no-secrets/no-secrets
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    // eslint-disable-next-line no-secrets/no-secrets
    stETH: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
  },
  polygon: {
    // eslint-disable-next-line no-secrets/no-secrets
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    // eslint-disable-next-line no-secrets/no-secrets
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  sepolia: {
     
    DWT: '0xdF8efd9F36f55baD4c7f38a7c958202858927743',
  },
  baseSepolia: {
    DWT: '0xdF8efd9F36f55baD4c7f38a7c958202858927743',
  },
  base: {
    DWT: '0x9ce235f8574bde67393884550F02135CE4fB8387',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  bnb: {
    // eslint-disable-next-line no-secrets/no-secrets
    CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
  },
}

export async function fetchAllBalances(address, chainId) {
  const provider = getProvider(chainId)
  if (!provider) return {}

  const results = {}
  const chainSymbols = {
    ethereum: 'ETH',
    bnb: 'BNB',
    polygon: 'MATIC',
    solana: 'SOL',
    sepolia: 'ETH',
    baseSepolia: 'ETH',
    base: 'ETH',
    arbitrum: 'ETH',
  }
  const nativeSym = chainSymbols[chainId] || 'ETH'

  try {
    const nativeBal = await provider.getBalance(address)
    results[nativeSym] = parseFloat(ethers.formatEther(nativeBal))
  } catch {
    results[nativeSym] = 0
  }

  const tokenMap = TOKEN_ADDRESSES[chainId] || {}
  await Promise.all(
    Object.entries(tokenMap).map(async ([symbol, contractAddr]) => {
      try {
        const contract = new ethers.Contract(contractAddr, ERC20_ABI, provider)
        const [bal, dec] = await Promise.all([
          contract.balanceOf(address),
          contract.decimals(),
        ])
        results[symbol] = parseFloat(ethers.formatUnits(bal, dec))
      } catch {
        results[symbol] = 0
      }
    }),
  )

  return results
}

// ── Gas estimation ────────────────────────────────────────────────────────────
export async function estimateGas(chainId = 'ethereum') {
  try {
    const provider = getProvider(chainId)
    const feeData = await provider.getFeeData()
    const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas
    const gasLimit = 21000n
    const gasCost = gasPrice * gasLimit
    return {
      gwei: parseFloat(ethers.formatUnits(gasPrice, 'gwei')).toFixed(2),
      ethCost: parseFloat(ethers.formatEther(gasCost)).toFixed(6),
      gasPrice,
    }
  } catch {
    return {
      gwei: '20',
      ethCost: '0.000420',
      gasPrice: ethers.parseUnits('20', 'gwei'),
    }
  }
}

// ── Send transaction ──────────────────────────────────────────────────────────
export async function sendNative(
  to,
  amountEth,
  privateKey,
  chainId = 'ethereum',
) {
  const signer = getSigner(privateKey, chainId)
  const feeData = await signer.provider.getFeeData()
  const tx = await signer.sendTransaction({
    to,
    value: ethers.parseEther(amountEth),
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  })
  return tx
}

export async function sendERC20(
  tokenAddress,
  to,
  amount,
  decimals,
  privateKey,
  chainId = 'ethereum',
) {
  const signer = getSigner(privateKey, chainId)
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)
  const parsed = ethers.parseUnits(amount, decimals)
  const tx = await contract.transfer(to, parsed)
  return tx
}

// ── Real transaction history via Etherscan-compatible API ─────────────────────
export async function fetchTxHistory(address, chainId = 'ethereum') {
  const EXPLORERS = {
    ethereum: `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${import.meta.env.VITE_ETHERSCAN_KEY || 'YourApiKeyToken'}`,
    polygon: `https://api.polygonscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${import.meta.env.VITE_POLYGONSCAN_KEY || 'YourApiKeyToken'}`,
    bnb: `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${import.meta.env.VITE_BSCSCAN_KEY || 'YourApiKeyToken'}`,
  }

  const url = EXPLORERS[chainId]
  if (!url) return []

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    if (data.status !== '1' || !Array.isArray(data.result)) return []

    return data.result.slice(0, 50).map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: parseFloat(ethers.formatEther(tx.value || '0')),
      token: (() => {
        if (chainId === 'ethereum') return 'ETH'
        if (chainId === 'bnb') return 'BNB'
        return 'MATIC'
      })(),
      type:
        tx.from.toLowerCase() === address.toLowerCase() ? 'send' : 'receive',
      status: tx.isError === '0' ? 'confirmed' : 'failed',
      timestamp: parseInt(tx.timeStamp) * 1000,
      gasUsed: parseFloat(
        ethers.formatEther(BigInt(tx.gasUsed) * BigInt(tx.gasPrice)),
      ).toFixed(6),
      chain: chainId,
    }))
  } catch {
    return []
  }
}

// ── ERC-20 token transfers ────────────────────────────────────────────────────
export async function fetchTokenTxHistory(address, chainId = 'ethereum') {
  const ENDPOINTS = {
    ethereum: `https://api.etherscan.io/api?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${import.meta.env.VITE_ETHERSCAN_KEY || 'YourApiKeyToken'}`,
  }
  const url = ENDPOINTS[chainId]
  if (!url) return []

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    if (data.status !== '1' || !Array.isArray(data.result)) return []

    return data.result.slice(0, 30).map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: parseFloat(
        ethers.formatUnits(tx.value, parseInt(tx.tokenDecimal)),
      ),
      token: tx.tokenSymbol,
      type:
        tx.from.toLowerCase() === address.toLowerCase() ? 'send' : 'receive',
      status: 'confirmed',
      timestamp: parseInt(tx.timeStamp) * 1000,
      gasUsed: '0',
      chain: chainId,
    }))
  } catch {
    return []
  }
}

// ── NFT fetching via Alchemy NFT API ─────────────────────────────────────────
export async function fetchNFTs(address) {
  // Strategy: try free APIs in order, no key required for any of them

  // 1. OpenSea free API (no key needed for basic queries)
  try {
    const res = await fetch(
      `https://api.opensea.io/api/v2/chain/ethereum/account/${address}/nfts?limit=20`,
      {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      },
    )
    if (res.ok) {
      const data = await res.json()
      if (data.results?.length > 0) {
        return data.results.map(nft => ({
          id: nft.identifier || '0',
          name: nft.name || `#${nft.identifier}`,
          collection: nft.collection || 'Unknown',
          image: nft.image_url || nft.display_image_url || '',
          chain: 'ethereum',
          contract: nft.contract,
          standard: nft.token_standard?.toUpperCase() || 'ERC721',
          permalink: nft.opensea_url || '',
        }))
      }
    }
  } catch {
    // Silent fallback to next API
  }

  // 2. Ankr free NFT API (no key needed, generous free tier)
  try {
    const res = await fetch(
      'https://rpc.ankr.com/multichain/nft/v1/eth/getNFTsByOwner',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockchain: 'eth',
          walletAddress: address,
          pageSize: 20,
        }),
        signal: AbortSignal.timeout(6000),
      },
    )
    if (res.ok) {
      const data = await res.json()
      const assets = data.result?.assets || []
      if (assets.length > 0) {
        return assets.map(nft => ({
          id: nft.tokenId || '0',
          name: nft.name || `#${nft.tokenId}`,
          collection: nft.collectionName || nft.contractAddress || 'Unknown',
          image: nft.imageUrl || '',
          chain: 'ethereum',
          contract: nft.contractAddress,
          standard: nft.contractType || 'ERC721',
          permalink: `https://opensea.io/assets/ethereum/${nft.contractAddress}/${nft.tokenId}`,
        }))
      }
    }
  } catch {
    // Silent fallback to next API
  }

  // 3. SimpleHash free tier (100 req/day no key)
  try {
    const res = await fetch(
      `https://api.simplehash.com/api/v0/nfts/owners?chains=ethereum&wallet_addresses=${address}&limit=20`,
      {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      },
    )
    if (res.ok) {
      const data = await res.json()
      const nfts = data.nfts || []
      if (nfts.length > 0) {
        return nfts.map(nft => ({
          id: nft.token_id || '0',
          name: nft.name || `#${nft.token_id}`,
          collection: nft.collection?.name || 'Unknown',
          image: nft.previews?.image_small_url || nft.image_url || '',
          chain: 'ethereum',
          contract: nft.contract_address,
          standard: nft.contract?.type || 'ERC721',
          permalink: `https://opensea.io/assets/ethereum/${nft.contract_address}/${nft.token_id}`,
        }))
      }
    }
  } catch {
    // All APIs failed or returned empty — return null to show mock data
  }

  // All APIs failed or returned empty — return null to show mock data
  return null
}
