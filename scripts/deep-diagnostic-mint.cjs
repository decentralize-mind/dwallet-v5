const { ethers, network } = require('hardhat')
require('dotenv').config()

async function main() {
  const [deployer] = await ethers.getSigners()
  
  // Use the latest deployed token
  const TOKEN_ADDR = '0xEa824cA9497864cB326b93D80ec99C5b1319d9c6'
  
  console.log('🔍 Deep Diagnostic: Why are mints failing?\n')
  
  const DWTToken = await ethers.getContractFactory('DWTTokenSimple')
  const token = DWTToken.attach(TOKEN_ADDR)
  
  // 1. Check who is the owner
  const owner = await token.owner()
  console.log(`1. Token owner: ${owner}`)
  console.log(`   Is deployer: ${owner === deployer.address}\n`)
  
  // 2. Check current supply
  const totalSupply = await token.totalSupply()
  console.log(`2. Total supply: ${ethers.formatEther(totalSupply)} DWT`)
  
  const maxSupply = await token.MAX_SUPPLY()
  console.log(`   Max supply: ${ethers.formatEther(maxSupply)} DWT`)
  
  const remaining = maxSupply - totalSupply
  console.log(`   Remaining: ${ethers.formatEther(remaining)} DWT\n`)
  
  // 3. Test minting to a NEW address
  console.log('3. Testing mint to a fresh address...')
  const testWallet = ethers.Wallet.createRandom()
  console.log(`   Test address: ${testWallet.address}`)
  
  try {
    const tx = await token.mint(testWallet.address, ethers.parseEther('100'))
    await tx.wait()
    console.log('   ✅ SUCCESS! Minted 100 DWT\n')
    
    const bal = await token.balanceOf(testWallet.address)
    console.log(`   Balance: ${ethers.formatEther(bal)} DWT\n`)
  } catch (e) {
    console.log(`   ❌ FAILED: ${e.message}`)
    console.log(`   Error data: ${e.data}\n`)
  }
  
  // 4. Check if there's a receiver hook issue
  console.log('4. Checking if target addresses have code...')
  const failedAddr = '0xf18e59291febf91b0BAa57E10AD26711337ba722' // Founder 2
  
  const code = await ethers.provider.getCode(failedAddr)
  console.log(`   Founder 2 address: ${failedAddr}`)
  console.log(`   Has contract code: ${code !== '0x'}`)
  console.log(`   Code length: ${code.length}\n`)
  
  // 5. Try a minimal transfer instead of mint
  console.log('5. Testing simple transfer (if deployer has tokens)...')
  const deployerBal = await token.balanceOf(deployer.address)
  console.log(`   Deployer balance: ${ethers.formatEther(deployerBal)} DWT`)
  
  if (deployerBal > 0n) {
    try {
      const tx = await token.transfer(failedAddr, ethers.parseEther('1'))
      await tx.wait()
      console.log('   ✅ Transfer succeeded\n')
    } catch (e) {
      console.log(`   ❌ Transfer failed: ${e.message}\n`)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
