/**
 * Integrate FeeRouter with SwapRouter
 * 
 * This script sets the FeeRouter address in the SwapRouter contract
 * 
 * Usage:
 * npx hardhat run scripts/integrate-fee-router.cjs --network baseSepolia
 */

const { ethers } = require('hardhat')

// Contract addresses
const FEE_ROUTER_ADDRESS = '0xd23f3d7fF87c1DC27178D34Ee30ffc6B17bb658d'
const SWAP_ROUTER_ADDRESS = '0xYourSwapRouterAddress' // Update this with actual address

async function main() {
  console.log('🔗 Integrating FeeRouter with SwapRouter...\n')

  const [deployer] = await ethers.getSigners()
  console.log('📝 Deployer:', deployer.address)
  console.log('🎯 FeeRouter:', FEE_ROUTER_ADDRESS)
  console.log('🔄 SwapRouter:', SWAP_ROUTER_ADDRESS)
  console.log('━'.repeat(60))

  try {
    // Get SwapRouter instance
    const SwapRouter = await ethers.getContractFactory('SwapRouter')
    const swapRouter = SwapRouter.attach(SWAP_ROUTER_ADDRESS)

    // Check current FeeRouter
    console.log('\n📊 Current Configuration:')
    const currentFeeRouter = await swapRouter.feeRouter()
    console.log('  Current FeeRouter:', currentFeeRouter)

    if (currentFeeRouter.toLowerCase() === FEE_ROUTER_ADDRESS.toLowerCase()) {
      console.log('\n✅ FeeRouter already set correctly!')
      console.log('   No update needed.')
      return
    }

    // Update FeeRouter
    console.log('\n🔄 Setting new FeeRouter...')
    const tx = await swapRouter.setFeeRouter(FEE_ROUTER_ADDRESS)
    console.log('⏳ Transaction sent:', tx.hash)
    
    const receipt = await tx.wait()
    console.log('✅ Transaction confirmed!')
    console.log('   Block:', receipt.blockNumber)
    console.log('   Gas Used:', receipt.gasUsed.toString())

    // Verify update
    const newFeeRouter = await swapRouter.feeRouter()
    console.log('\n✅ Verification:')
    console.log('   New FeeRouter:', newFeeRouter)
    
    if (newFeeRouter.toLowerCase() === FEE_ROUTER_ADDRESS.toLowerCase()) {
      console.log('\n✅ Integration successful!')
      console.log('━'.repeat(60))
      console.log('\n📝 Summary:')
      console.log('  SwapRouter:', SWAP_ROUTER_ADDRESS)
      console.log('  FeeRouter:', FEE_ROUTER_ADDRESS)
      console.log('  Status: ✅ Connected')
      console.log('\n🎯 Next Steps:')
      console.log('  1. Test a swap to verify fee collection')
      console.log('  2. Monitor fee distribution')
      console.log('  3. Check pending fees in FeeRouter')
    } else {
      console.log('\n❌ Verification failed!')
      console.log('   Expected:', FEE_ROUTER_ADDRESS)
      console.log('   Got:', newFeeRouter)
    }

  } catch (error) {
    console.error('\n❌ Integration failed!')
    console.error('Error:', error.message)
    
    if (error.message.includes('insufficient funds')) {
      console.error('\n💡 Tip: Get free Base Sepolia ETH from:')
      console.error('   https://cloud.google.com/application/web3/faucet/ethereum/sepolia')
    } else if (error.message.includes('reverted')) {
      console.error('\n💡 Tip: Make sure you are the admin of SwapRouter')
    }
    
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
