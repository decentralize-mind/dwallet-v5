const { ethers, network } = require('hardhat')
require('dotenv').config()

/**
 * DIAGNOSTIC: Check why minting is failing
 */

async function main() {
  const [deployer] = await ethers.getSigners()
  
  const TOKEN_ADDR = '0x36F1427DfD662e4509c26AB403e702A7E9dAbce4'
  const VESTING_ADDR = '0x2A78bB78925CD8aD74aB0CbF770A862c243499B4' // Founder 1 (succeeded)
  const VESTING_ADDR2 = '0xBA81697f3589C1D56d71746eb4CAe87029D1B657' // Founder 2 (failed)
  
  console.log('🔍 Diagnostic Check\n')
  
  const DWTToken = await ethers.getContractFactory('DWTTokenSimple')
  const token = DWTToken.attach(TOKEN_ADDR)
  
  // Check ownership
  const owner = await token.owner()
  console.log(`Token owner: ${owner}`)
  console.log(`Is deployer: ${owner === deployer.address}`)
  
  // Check current supply
  const totalSupply = await token.totalSupply()
  console.log(`Total supply: ${ethers.formatEther(totalSupply)} DWT`)
  
  const maxSupply = await token.MAX_SUPPLY()
  console.log(`Max supply: ${ethers.formatEther(maxSupply)} DWT`)
  
  // Check balance of vesting wallets
  const bal1 = await token.balanceOf(VESTING_ADDR)
  console.log(`\nFounder 1 balance: ${ethers.formatEther(bal1)} DWT`)
  
  const bal2 = await token.balanceOf(VESTING_ADDR2)
  console.log(`Founder 2 balance: ${ethers.formatEther(bal2)} DWT`)
  
  // Try to mint a small amount to see the exact error
  console.log('\n🧪 Testing mint of 1 DWT to Founder 2...')
  try {
    const tx = await token.mint(VESTING_ADDR2, ethers.parseEther('1'))
    await tx.wait()
    console.log('✅ Success!')
  } catch (e) {
    console.log('❌ Failed:')
    console.log(`   Error: ${e.message}`)
    console.log(`   Reason: ${e.reason || e.data || 'unknown'}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
