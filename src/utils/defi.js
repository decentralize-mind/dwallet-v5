// ── DeFi utility functions ────────────────────────────────────────────────────
import { ethers } from 'ethers'
import {
  UNISWAP_V3,
  UNISWAP_QUOTER_ABI,
  UNISWAP_ROUTER_ABI,
  LIDO,
  LIDO_ABI,
  ROCKET_POOL,
  ROCKET_POOL_ABI,
  AAVE_V3,
  AAVE_POOL_ABI,
  NFT_MANAGER_ABI,
  UNISWAP_V3_NFT_MANAGER,
  ERC20_ABI,
  MAINNET_TOKENS,
} from '../data/defi.js'

// ── Provider helper ───────────────────────────────────────────────────────────
export function getProvider() {
  const key = import.meta.env.VITE_INFURA_KEY
  if (!key) return null
  return new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${key}`)
}

export function getSigner(privateKey) {
  const provider = getProvider()
  if (!provider) throw new Error('No RPC provider configured')
  return new ethers.Wallet(privateKey, provider)
}

// ── Format helpers ────────────────────────────────────────────────────────────
export function formatUnitsFixed(amount, decimals, displayDecimals = 6) {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(
    displayDecimals,
  )
}

export function parseUnits(amount, decimals) {
  return ethers.parseUnits(String(amount), decimals)
}

// ── Uniswap V3 Swap ───────────────────────────────────────────────────────────

/**
 * Get a quote for swapping tokenIn → tokenOut using Uniswap v3 QuoterV2.
 * Returns amountOut as a formatted string.
 */
export async function getSwapQuote({
  tokenIn,
  tokenOut,
  amountIn,
  feeTier = 3000,
}) {
  const provider = getProvider()
  if (!provider) return getMockQuote(tokenIn, tokenOut, amountIn)

  try {
    const quoter = new ethers.Contract(
      UNISWAP_V3.quoterV2,
      UNISWAP_QUOTER_ABI,
      provider,
    )
    const tokenInAddr =
      tokenIn === 'ETH' ? UNISWAP_V3.WETH : MAINNET_TOKENS[tokenIn]?.address
    const tokenOutAddr =
      tokenOut === 'ETH' ? UNISWAP_V3.WETH : MAINNET_TOKENS[tokenOut]?.address
    const decimalsIn =
      MAINNET_TOKENS[tokenIn === 'ETH' ? 'WETH' : tokenIn]?.decimals ?? 18
    const decimalsOut =
      MAINNET_TOKENS[tokenOut === 'ETH' ? 'WETH' : tokenOut]?.decimals ?? 18

    const amountInParsed = parseUnits(amountIn, decimalsIn)

    const [amountOut] = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: tokenInAddr,
      tokenOut: tokenOutAddr,
      amountIn: amountInParsed,
      fee: feeTier,
      sqrtPriceLimitX96: 0n,
    })

    return {
      amountOut: formatUnitsFixed(amountOut, decimalsOut, 6),
      priceImpact: 0.3,
      feeTier,
    }
  } catch (err) {
    console.warn('Quote failed, using mock:', err.message)
    return getMockQuote(tokenIn, tokenOut, amountIn)
  }
}

function getMockQuote(tokenIn, tokenOut, amountIn) {
  const prices = {
    ETH: 3200,
    WBTC: 67000,
    USDC: 1,
    USDT: 1,
    DAI: 1,
    UNI: 8.5,
    LINK: 14.2,
    stETH: 3185,
    rETH: 3350,
  }
  const inPrice = prices[tokenIn] || 1
  const outPrice = prices[tokenOut] || 1
  const rate = inPrice / outPrice
  return {
    amountOut: (parseFloat(amountIn || 0) * rate * 0.997).toFixed(6),
    priceImpact: 0.3,
    feeTier: 3000,
    isMock: true,
  }
}

/**
 * Execute a swap on Uniswap v3.
 * In production: approve router, then call exactInputSingle.
 */
export async function executeSwap({
  tokenIn,
  tokenOut,
  amountIn,
  amountOutMin,
  feeTier,
  privateKey,
  slippage = 0.5,
}) {
  const signer = getSigner(privateKey)
  const tokenInAddr =
    tokenIn === 'ETH' ? UNISWAP_V3.WETH : MAINNET_TOKENS[tokenIn]?.address
  const tokenOutAddr =
    tokenOut === 'ETH' ? UNISWAP_V3.WETH : MAINNET_TOKENS[tokenOut]?.address
  const decimalsIn =
    MAINNET_TOKENS[tokenIn === 'ETH' ? 'WETH' : tokenIn]?.decimals ?? 18
  const amountInParsed = parseUnits(amountIn, decimalsIn)
  const minOut =
    BigInt(Math.floor(parseFloat(amountOutMin) * (1 - slippage / 100) * 1e6)) *
    10n ** 12n
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800)

  // If not ETH, approve router first
  if (tokenIn !== 'ETH') {
    const token = new ethers.Contract(tokenInAddr, ERC20_ABI, signer)
    const allowance = await token.allowance(
      await signer.getAddress(),
      UNISWAP_V3.swapRouter02,
    )
    if (allowance < amountInParsed) {
      const approveTx = await token.approve(
        UNISWAP_V3.swapRouter02,
        ethers.MaxUint256,
      )
      await approveTx.wait()
    }
  }

  const router = new ethers.Contract(
    UNISWAP_V3.swapRouter02,
    UNISWAP_ROUTER_ABI,
    signer,
  )
  const tx = await router.exactInputSingle(
    {
      tokenIn: tokenInAddr,
      tokenOut: tokenOutAddr,
      fee: feeTier,
      recipient: await signer.getAddress(),
      amountIn: amountInParsed,
      amountOutMinimum: minOut,
      sqrtPriceLimitX96: 0n,
    },
    {
      value: tokenIn === 'ETH' ? amountInParsed : 0n,
    },
  )
  console.log(
    'Swap deadline (calculated but currently omitted by protocol):',
    deadline.toString(),
  )
  return tx
}

// ── Lido Staking ──────────────────────────────────────────────────────────────

/**
 * Stake ETH via Lido — submit ETH, receive stETH 1:1.
 */
export async function stakeWithLido({ amountETH, privateKey }) {
  const signer = getSigner(privateKey)
  const lido = new ethers.Contract(LIDO.stETH, LIDO_ABI, signer)
  const value = parseUnits(amountETH, 18)
  const tx = await lido.submit('0x4C0B7314441dfE8E61267C0d87Fc1A657611dCf5', {
    value,
  })
  return tx
}

/**
 * Get Lido stETH balance and current APY.
 */
export async function getLidoBalance(address) {
  const provider = getProvider()
  if (!provider) return { balance: '0', apy: LIDO.APY }
  const lido = new ethers.Contract(LIDO.stETH, LIDO_ABI, provider)
  const balance = await lido.balanceOf(address)
  return { balance: formatUnitsFixed(balance, 18, 4), apy: LIDO.APY }
}

/**
 * Stake ETH via Rocket Pool — deposit, receive rETH.
 */
export async function stakeWithRocketPool({ amountETH, privateKey }) {
  const signer = getSigner(privateKey)
  const rp = new ethers.Contract(
    ROCKET_POOL.depositPool,
    ROCKET_POOL_ABI,
    signer,
  )
  const value = parseUnits(amountETH, 18)
  const tx = await rp.deposit({ value })
  return tx
}

// ── Aave V3 Lending / Borrowing ───────────────────────────────────────────────

/**
 * Supply (deposit) an asset to Aave v3.
 * Approve aToken contract, then call pool.supply().
 */
export async function aaveSupply({ asset, amount, privateKey }) {
  const signer = getSigner(privateKey)
  const address = await signer.getAddress()
  const token = MAINNET_TOKENS[asset]
  if (!token) throw new Error('Unknown asset')

  const amountParsed = parseUnits(amount, token.decimals)

  // Approve Aave pool to spend tokens
  const erc20 = new ethers.Contract(token.address, ERC20_ABI, signer)
  const allowance = await erc20.allowance(address, AAVE_V3.pool)
  if (allowance < amountParsed) {
    const approveTx = await erc20.approve(AAVE_V3.pool, ethers.MaxUint256)
    await approveTx.wait()
  }

  const pool = new ethers.Contract(AAVE_V3.pool, AAVE_POOL_ABI, signer)
  const tx = await pool.supply(token.address, amountParsed, address, 0)
  return tx
}

/**
 * Withdraw a supplied asset from Aave.
 */
export async function aaveWithdraw({ asset, amount, privateKey }) {
  const signer = getSigner(privateKey)
  const address = await signer.getAddress()
  const token = MAINNET_TOKENS[asset]
  const amountParsed =
    amount === 'max' ? ethers.MaxUint256 : parseUnits(amount, token.decimals)

  const pool = new ethers.Contract(AAVE_V3.pool, AAVE_POOL_ABI, signer)
  const tx = await pool.withdraw(token.address, amountParsed, address)
  return tx
}

/**
 * Borrow an asset from Aave (variable rate = mode 2).
 */
export async function aaveBorrow({ asset, amount, privateKey }) {
  const signer = getSigner(privateKey)
  const address = await signer.getAddress()
  const token = MAINNET_TOKENS[asset]
  const amountParsed = parseUnits(amount, token.decimals)

  const pool = new ethers.Contract(AAVE_V3.pool, AAVE_POOL_ABI, signer)
  const tx = await pool.borrow(token.address, amountParsed, 2, 0, address)
  return tx
}

/**
 * Repay a borrowed asset.
 */
export async function aaveRepay({ asset, amount, privateKey }) {
  const signer = getSigner(privateKey)
  const address = await signer.getAddress()
  const token = MAINNET_TOKENS[asset]
  const amountParsed =
    amount === 'max' ? ethers.MaxUint256 : parseUnits(amount, token.decimals)

  // Approve repay amount
  const erc20 = new ethers.Contract(token.address, ERC20_ABI, signer)
  const allowance = await erc20.allowance(address, AAVE_V3.pool)
  if (allowance < amountParsed) {
    await (await erc20.approve(AAVE_V3.pool, ethers.MaxUint256)).wait()
  }

  const pool = new ethers.Contract(AAVE_V3.pool, AAVE_POOL_ABI, signer)
  const tx = await pool.repay(token.address, amountParsed, 2, address)
  return tx
}

/**
 * Get user's Aave account summary (collateral, debt, health factor).
 */
export async function getAaveAccountData(address) {
  const provider = getProvider()
  if (!provider) return getMockAaveData()
  try {
    const pool = new ethers.Contract(AAVE_V3.pool, AAVE_POOL_ABI, provider)
    const data = await pool.getUserAccountData(address)
    return {
      totalCollateralUSD: parseFloat(
        ethers.formatUnits(data.totalCollateralBase, 8),
      ).toFixed(2),
      totalDebtUSD: parseFloat(
        ethers.formatUnits(data.totalDebtBase, 8),
      ).toFixed(2),
      availableBorrowUSD: parseFloat(
        ethers.formatUnits(data.availableBorrowsBase, 8),
      ).toFixed(2),
      ltv: (Number(data.ltv) / 100).toFixed(0),
      healthFactor: parseFloat(
        ethers.formatUnits(data.healthFactor, 18),
      ).toFixed(2),
    }
  } catch {
    return getMockAaveData()
  }
}

function getMockAaveData() {
  return {
    totalCollateralUSD: '0.00',
    totalDebtUSD: '0.00',
    availableBorrowUSD: '0.00',
    ltv: '0',
    healthFactor: '∞',
  }
}

// ── Uniswap V3 LP Positions ───────────────────────────────────────────────────

/**
 * Fetch all Uniswap v3 LP positions for an address.
 */
export async function getLPPositions(address) {
  const provider = getProvider()
  if (!provider) return []
  try {
    const nftManager = new ethers.Contract(
      UNISWAP_V3_NFT_MANAGER.address,
      NFT_MANAGER_ABI,
      provider,
    )
    const count = await nftManager.balanceOf(address)
    const positions = []
    for (let i = 0; i < Math.min(Number(count), 20); i++) {
      const tokenId = await nftManager.tokenOfOwnerByIndex(address, i)
      const pos = await nftManager.positions(tokenId)
      if (pos.liquidity === 0n) continue
      positions.push({
        tokenId: tokenId.toString(),
        token0: pos.token0,
        token1: pos.token1,
        fee: Number(pos.fee),
        liquidity: pos.liquidity.toString(),
        tokensOwed0: formatUnitsFixed(pos.tokensOwed0, 18, 4),
        tokensOwed1: formatUnitsFixed(pos.tokensOwed1, 6, 4),
      })
    }
    return positions
  } catch (err) {
    console.warn('LP fetch failed:', err.message)
    return []
  }
}

/**
 * Collect accumulated fees from a Uniswap v3 LP position.
 */
export async function collectLPFees({ tokenId, privateKey }) {
  const signer = getSigner(privateKey)
  const nftManager = new ethers.Contract(
    UNISWAP_V3_NFT_MANAGER.address,
    NFT_MANAGER_ABI,
    signer,
  )
  const tx = await nftManager.collect({
    tokenId,
    recipient: await signer.getAddress(),
    amount0Max: BigInt('340282366920938463463374607431768211455'),
    amount1Max: BigInt('340282366920938463463374607431768211455'),
  })
  return tx
}
