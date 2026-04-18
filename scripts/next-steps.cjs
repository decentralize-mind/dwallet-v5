const { ethers, network } = require('hardhat')
require('dotenv').config()

/**
 * NEXT STEPS AFTER DEPLOYMENT
 * 
 * 1. Check current token balances
 * 2. Fund the airdrop contract (if needed)
 * 3. Deploy additional contracts (optional)
 * 4. Print summary with verification links
 */

const TOKEN_ADDR = '0x75A884C401A69481d4377F79dc1918b3D18e2aE8'
const TIMELOCK_ADDR = '0x52F274444c198DC3824C3C18009C7D9A1cB4bBAb'
const AIRDROP_ADDR = '0x11aE2b13FfB98D8Ba47a5CDAdD898CA85CA21b84'

async function main() {
  const [deployer] = await ethers.getSigners()
  
  console.log('\n' + '═'.repeat(70))
  console.log('  DWT TOKEN - NEXT STEPS & VERIFICATION')
  console.log('═'.repeat(70) + '\n')
  
  const DWTToken = await ethers.getContractFactory('DWTToken')
  const token = DWTToken.attach(TOKEN_ADDR)
  
  // 1. Check token info
  console.log('📊 Token Information:')
  console.log(`   Name: ${await token.name()}`)
  console.log(`   Symbol: ${await token.symbol()}`)
  console.log(`   Total Supply: ${ethers.formatEther(await token.totalSupply())} DWT`)
  console.log(`   Owner: ${await token.owner()}`)
  console.log(`   Max Supply: ${ethers.formatEther(await token.MAX_SUPPLY())} DWT`)
  
  // 2. Check airdrop contract balance
  console.log('\n🎁 Airdrop Contract:')
  const airdropBalance = await token.balanceOf(AIRDROP_ADDR)
  console.log(`   Address: ${AIRDROP_ADDR}`)
  console.log(`   Current Balance: ${ethers.formatEther(airdropBalance)} DWT`)
  
  const airdropAmount = process.env.AIRDROP_AMOUNT || '2100000'
  console.log(`   Expected: ${airdropAmount} DWT`)
  
  if (airdropBalance === 0n) {
    console.log(`\n   ⚠️  Airdrop contract needs funding!`)
    console.log(`   📋 Manual steps:`)
    console.log(`      1. Get DWT tokens from a recipient wallet`)
    console.log(`      2. Transfer ${airdropAmount} DWT to ${AIRDROP_ADDR}`)
    console.log(`      3. Verify on BaseScan`)
  } else {
    console.log(`   ✅ Airdrop contract is funded`)
  }
  
  // 3. Print all deployed contracts
  console.log('\n📋 Deployed Contracts:')
  console.log(`   Token: ${TOKEN_ADDR}`)
  console.log(`   Timelock: ${TIMELOCK_ADDR}`)
  console.log(`   Airdrop: ${AIRDROP_ADDR}`)
  
  // 4. Verification links
  console.log('\n🔗 Verification Links:')
  console.log(`   Token (Verified): https://sepolia.basescan.org/address/${TOKEN_ADDR}#code`)
  console.log(`   Timelock: https://sepolia.basescan.org/address/${TIMELOCK_ADDR}`)
  console.log(`   Airdrop: https://sepolia.basescan.org/address/${AIRDROP_ADDR}`)
  
  // 5. Next steps
  console.log('\n' + '═'.repeat(70))
  console.log('  NEXT STEPS')
  console.log('═'.repeat(70))
  
  console.log(`
1. ✅ CONTRACT VERIFIED - Source code visible on BaseScan

2. 🎁 FUND AIRDROP CONTRACT
   - Transfer ${airdropAmount} DWT to: ${AIRDROP_ADDR}
   - Use any wallet that received DWT tokens
   - Transaction: token.transfer("${AIRDROP_ADDR}", ethers.parseEther("${airdropAmount}"))

3. 🔍 VERIFY REMAINING CONTRACTS (Optional)
   - TimelockController (OpenZeppelin standard contract)
   - SimpleAirdrop (custom contract)
   
   Commands:
   npx hardhat verify --network baseSepolia ${AIRDROP_ADDR} "${TOKEN_ADDR}"

4. 💰 ADD LIQUIDITY (When ready for mainnet)
   - Pair DWT with ETH on Uniswap/Aerodrome
   - Recommended: 5-10M DWT + equivalent ETH

5. 🗳️  GOVERNANCE SETUP (Future)
   - Timelock owns the token (48h delay)
   - Can deploy DWTGovernor for on-chain voting
   - Requires token voting support (upgrade later)

6. 📊 MONITOR & TRACK
   - Add token to CoinGecko/CoinMarketCap (mainnet only)
   - Set up analytics dashboard
   - Monitor holder distribution

7. 🔒 SECURITY AUDIT (Before mainnet)
   - Professional audit recommended
   - Test all governance functions
   - Verify timelock operations

8. 🚀 MAINNET DEPLOYMENT
   - Deploy same contracts to Base mainnet
   - Use multisig (Gnosis Safe) as owner
   - Start with smaller initial supply
`)
  
  console.log('═'.repeat(70))
  console.log('  DEPLOYMENT COMPLETE! 🎉')
  console.log('═'.repeat(70) + '\n')
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
