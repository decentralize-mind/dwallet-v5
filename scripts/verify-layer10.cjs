const { run, network } = require('hardhat')
require('dotenv').config()

async function main() {
  if (network.name !== 'baseSepolia') {
    console.error('Please run with --network baseSepolia')
    process.exit(1)
  }

  // Load from .env
  const addresses = {
    mockUsdc: process.env.MOCK_USDC_L10,
    oracle: process.env.DWT_ORACLE_L10,
    options: process.env.OPTIONS_L10,
    perp: process.env.PERPETUALS_L10,
    prediction: process.env.PREDICTION_MARKET_L10,
    vault: process.env.YIELD_VAULT_L10,
    dwt: process.env.DWT_TOKEN_ADDRESS || process.env.DWT_TOKEN,
    treasury: process.env.TREASURY_ADDRESS || process.env.TREASURY,
    manager: process.env.RELAYER_1 || process.env.DEPLOYER_ADDRESS,
  }

  console.log('🔍 Verifying Layer 10 Contracts on Base Sepolia...')

  const verify = async (addr, args = []) => {
    if (!addr) {
      console.log(`⚠️  Skipping: Address not found in .env`)
      return
    }
    console.log(`\n--- Verifying ${addr} ---`)
    try {
      await run('verify:verify', {
        address: addr,
        constructorArguments: args,
      })
    } catch (e) {
      if (e.message.includes('Already Verified')) {
        console.log('✅ Already Verified.')
      } else {
        console.error(e.message)
      }
    }
  }

  // 1. MockUSDC
  await verify(addresses.mockUsdc, ['Mock USDC', 'mUSDC', 6])

  // 2. DWTOracle
  await verify(addresses.oracle, ['5000000000000000000']) // $5.00

  // 3. DWTOptions
  await verify(addresses.options, [
    addresses.dwt,
    addresses.mockUsdc,
    addresses.oracle,
    addresses.treasury,
  ])

  // 4. DWTPerpetuals
  await verify(addresses.perp, [
    addresses.mockUsdc,
    addresses.oracle,
    addresses.treasury,
  ])

  // 5. DWTPredictionMarket
  await verify(addresses.prediction, [addresses.mockUsdc, addresses.treasury])

  // 6. DWTYieldVault
  await verify(addresses.vault, [
    addresses.dwt,
    addresses.treasury,
    addresses.manager,
  ])

  console.log('\n✅ Verification sequence complete.')
}

main().catch(console.error)
