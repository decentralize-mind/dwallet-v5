// scripts/interact.js
// Use this script to interact with your deployed contract
// Run: npx hardhat run scripts/interact.js --network mainnet

const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  const contractAddress = process.env.FEE_ROUTER_ADDRESS
  if (!contractAddress) {
    throw new Error('Set FEE_ROUTER_ADDRESS in your .env file')
  }

  const [owner] = await ethers.getSigners()
  const router = await ethers.getContractAt('DWalletFeeRouter', contractAddress)

  console.log('\n═══════════════════════════════════════════════════')
  console.log('   dWallet Fee Router — Status Dashboard')
  console.log('═══════════════════════════════════════════════════\n')

  // ── Read current config ────────────────────────────────────────────────────
  const config = await router.getConfig()
  console.log('CONTRACT:', contractAddress)
  console.log('Owner:          ', config._owner)
  console.log('Fee Recipient:  ', config._feeRecipient)
  console.log(
    'Fee:            ',
    config._feeBps.toString(),
    'bps =',
    Number(config._feeBps) / 100,
    '%',
  )
  console.log('Max Fee:        ', config._maxFeeBps.toString(), 'bps = 1%')
  console.log('Paused:         ', config._paused)

  // ── Token stats ────────────────────────────────────────────────────────────
  const TOKENS = {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  }

  const DECIMALS = { USDC: 6, USDT: 6, DAI: 18, WETH: 18 }

  console.log('\n── Revenue Stats ──────────────────────────────────')
  for (const [symbol, address] of Object.entries(TOKENS)) {
    const [fees, volume] = await router.getTokenStats(address)
    if (fees > 0n || volume > 0n) {
      const dec = DECIMALS[symbol]
      console.log(`${symbol}:`)
      console.log(
        `  Volume:        ${ethers.formatUnits(volume, dec)} ${symbol}`,
      )
      console.log(
        `  Fees collected: ${ethers.formatUnits(fees, dec)} ${symbol}`,
      )
    }
  }

  // ── Available actions (comment/uncomment as needed) ────────────────────────
  console.log('\n── Available actions (edit script to enable) ──────')
  console.log('  - Update fee:            router.setFee(newBps)')
  console.log('  - Update fee recipient:  router.setFeeRecipient(newAddress)')
  console.log('  - Pause swaps:           router.setPaused(true)')
  console.log('  - Rescue stuck tokens:   router.rescueTokens(token, to)')
  console.log('  - Transfer ownership:    router.transferOwnership(newOwner)')

  // ── Example: update fee to 0.15% ──────────────────────────────────────────
  // Uncomment to use:
  /*
  console.log("\nUpdating fee to 0.15%...");
  const tx = await router.connect(owner).setFee(15); // 15 bps = 0.15%
  await tx.wait();
  console.log("✓ Fee updated. Tx:", tx.hash);
  */

  // ── Example: pause in emergency ───────────────────────────────────────────
  /*
  console.log("\nPausing contract...");
  const tx = await router.connect(owner).setPaused(true);
  await tx.wait();
  console.log("✓ Contract paused. Tx:", tx.hash);
  */
}

main()
  .then(() => process.exit(0))
  .catch(console.error)
