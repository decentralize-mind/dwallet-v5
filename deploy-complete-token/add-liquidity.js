/**
 * scripts/add-liquidity.js
 *
 * Standalone script to add DWT/ETH liquidity on Uniswap V2 (Base Sepolia).
 * Run this after deployment if the auto-liquidity step was skipped.
 *
 * Usage:
 *   npx hardhat run scripts/add-liquidity.js --network baseSepolia
 *
 * Required .env:
 *   DWT_TOKEN_ADDRESS      — deployed DWT token
 *   LIQUIDITY_DEX_AMOUNT   — DWT amount to add (e.g. "500000")
 *   LIQUIDITY_ETH_AMOUNT   — ETH amount to pair (e.g. "0.05")
 */

const { ethers } = require('hardhat')
require('dotenv').config()

// ─── Base Sepolia Uniswap V2 addresses ────────────────────────────────────────
const UNISWAP_V2_ROUTER  = '0x1689E7B1F10000AE47eBfE339a4f69dECd19F602'
const UNISWAP_V2_FACTORY = '0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1E'
const WETH               = '0x4200000000000000000000000000000000000006'

const ROUTER_ABI = [
  'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint, uint, uint)',
  'function factory() external pure returns (address)',
]

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address)',
  'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
]

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]

async function main() {
  const [signer] = await ethers.getSigners()
  const balance  = await ethers.provider.getBalance(signer.address)

  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║   ADD DWT/ETH LIQUIDITY — BASE SEPOLIA              ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')
  console.log(`👤 Wallet   : ${signer.address}`)
  console.log(`💰 ETH Bal  : ${ethers.formatEther(balance)} ETH`)

  // ─── Load config ──────────────────────────────────────────────────
  const dwtTokenAddr = process.env.DWT_TOKEN_ADDRESS
  const dwtAmount    = process.env.LIQUIDITY_DEX_AMOUNT   // e.g. "500000"
  const ethAmount    = process.env.LIQUIDITY_ETH_AMOUNT   // e.g. "0.05"

  if (!dwtTokenAddr || !dwtAmount || !ethAmount) {
    throw new Error(
      'Missing env vars: DWT_TOKEN_ADDRESS, LIQUIDITY_DEX_AMOUNT, LIQUIDITY_ETH_AMOUNT'
    )
  }

  const tokenAmtWei = ethers.parseEther(dwtAmount)
  const ethAmtWei   = ethers.parseEther(ethAmount)

  console.log(`\n🪙 DWT addr  : ${dwtTokenAddr}`)
  console.log(`💧 DWT amt   : ${dwtAmount} DWT`)
  console.log(`💧 ETH amt   : ${ethAmount} ETH`)

  // ─── Check DWT balance ────────────────────────────────────────────
  const dwtToken = new ethers.Contract(dwtTokenAddr, ERC20_ABI, signer)
  const dwtBal   = await dwtToken.balanceOf(signer.address)
  console.log(`\n📊 DWT balance : ${ethers.formatEther(dwtBal)} DWT`)

  if (dwtBal < tokenAmtWei) {
    throw new Error(
      `Insufficient DWT balance. Have ${ethers.formatEther(dwtBal)}, need ${dwtAmount}`
    )
  }
  if (balance < ethAmtWei) {
    throw new Error(
      `Insufficient ETH balance. Have ${ethers.formatEther(balance)}, need ${ethAmount}`
    )
  }

  // ─── Approve router ───────────────────────────────────────────────
  const router  = new ethers.Contract(UNISWAP_V2_ROUTER, ROUTER_ABI, signer)
  const factory = new ethers.Contract(UNISWAP_V2_FACTORY, FACTORY_ABI, signer)

  console.log('\n⏳ Approving DWT for Uniswap V2 router...')
  const allowance = await dwtToken.allowance(signer.address, UNISWAP_V2_ROUTER)
  if (allowance < tokenAmtWei) {
    const approveTx = await dwtToken.approve(UNISWAP_V2_ROUTER, ethers.MaxUint256)
    await approveTx.wait()
    console.log('✅ Approved')
  } else {
    console.log('✅ Already approved')
  }

  // ─── Add liquidity ────────────────────────────────────────────────
  const deadline    = Math.floor(Date.now() / 1000) + 60 * 20
  const minToken    = (tokenAmtWei * 95n) / 100n  // 5% slippage
  const minEth      = (ethAmtWei   * 95n) / 100n

  console.log('\n⏳ Adding DWT/ETH liquidity...')
  const liqTx = await router.addLiquidityETH(
    dwtTokenAddr,
    tokenAmtWei,
    minToken,
    minEth,
    signer.address,   // LP tokens to your wallet — consider a lock contract for production
    deadline,
    { value: ethAmtWei, gasLimit: 500_000 }
  )

  console.log(`   Tx sent: ${liqTx.hash}`)
  const receipt = await liqTx.wait()
  console.log(`✅ Liquidity added! Block: ${receipt.blockNumber}`)

  // ─── Find pair address ────────────────────────────────────────────
  const pairAddr = await factory.getPair(dwtTokenAddr, WETH)
  console.log(`\n🔗 DWT/WETH Pair : ${pairAddr}`)
  console.log(`🔗 BaseScan Pair : https://sepolia.basescan.org/address/${pairAddr}`)

  console.log('\n📋 Next steps:')
  console.log('   • Consider locking LP tokens with a time-lock contract')
  console.log('   • Verify the pair on BaseScan')
  console.log('   • Add the pair to your dapp UI / token list')
  console.log('\n✅ Done!\n')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Liquidity script failed:', err.message)
    process.exit(1)
  })
