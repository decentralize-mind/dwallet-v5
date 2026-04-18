/**
 * scripts/create-gnosis-safe.js
 *
 * Programmatically deploys a Gnosis Safe multisig on Base Sepolia
 * using the @safe-global/protocol-kit.
 *
 * Usage:
 *   npm install @safe-global/protocol-kit @safe-global/api-kit ethers
 *   npx hardhat run scripts/create-gnosis-safe.js --network baseSepolia
 *
 * Required .env:
 *   PRIVATE_KEY        — deployer private key
 *   SAFE_OWNERS        — comma-separated owner addresses (min 2)
 *   SAFE_THRESHOLD     — signatures required (e.g. "2")
 *   BASE_SEPOLIA_RPC   — RPC URL
 */

require('dotenv').config()
const { ethers } = require('ethers')

async function main() {
  // Dynamic import — requires @safe-global/protocol-kit to be installed
  let SafeFactory, EthersAdapter
  try {
    const protocolKit = require('@safe-global/protocol-kit')
    SafeFactory   = protocolKit.SafeFactory
    EthersAdapter = protocolKit.EthersAdapter
  } catch {
    console.error('❌ @safe-global/protocol-kit not installed.')
    console.error('   Run: npm install @safe-global/protocol-kit')
    process.exit(1)
  }

  // ─── Config ─────────────────────────────────────────────────────
  const rpcUrl    = process.env.BASE_SEPOLIA_RPC
  const pk        = process.env.PRIVATE_KEY
  const owners    = (process.env.SAFE_OWNERS || '').split(',').map(s => s.trim()).filter(Boolean)
  const threshold = parseInt(process.env.SAFE_THRESHOLD || '2', 10)

  if (!rpcUrl || !pk) throw new Error('Missing BASE_SEPOLIA_RPC or PRIVATE_KEY in .env')
  if (owners.length < 2) throw new Error('SAFE_OWNERS must contain at least 2 addresses')
  if (threshold > owners.length) throw new Error('SAFE_THRESHOLD cannot exceed number of owners')

  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║   GNOSIS SAFE DEPLOYMENT — BASE SEPOLIA             ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')
  console.log(`👥 Owners     : ${owners.length}`)
  owners.forEach((o, i) => console.log(`   [${i + 1}] ${o}`))
  console.log(`🔑 Threshold  : ${threshold} of ${owners.length}`)

  // ─── Provider + Signer ──────────────────────────────────────────
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const signer   = new ethers.Wallet(pk, provider)

  const ethAdapter = new EthersAdapter({ ethers, signerOrProvider: signer })

  // ─── Deploy Safe ────────────────────────────────────────────────
  console.log('\n⏳ Deploying Gnosis Safe...')

  const safeFactory = await SafeFactory.create({ ethAdapter })

  const safeAccountConfig = {
    owners,
    threshold,
  }

  const safe = await safeFactory.deploySafe({ safeAccountConfig })
  const safeAddress = await safe.getAddress()

  console.log(`\n✅ Gnosis Safe deployed: ${safeAddress}`)
  console.log(`🔗 BaseScan: https://sepolia.basescan.org/address/${safeAddress}`)
  console.log(`🔗 Safe App: https://app.safe.global/home?safe=basesep:${safeAddress}`)

  // ─── Summary ────────────────────────────────────────────────────
  console.log('\n📋 Next steps:')
  console.log(`   1. Add this Safe address to your .env: GNOSIS_SAFE_ADDRESS=${safeAddress}`)
  console.log('   2. Transfer DAO Treasury tokens to the Safe address')
  console.log('   3. Use Safe UI or SDK to execute any future treasury transactions')
  console.log('   4. Optionally set Safe as the Timelock executor instead of address(0)')
  console.log('\n✅ Done!\n')

  return safeAddress
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Safe creation failed:', err.message)
    process.exit(1)
  })
