const { ethers, network } = require('hardhat')

async function main() {
  const [deployer] = await ethers.getSigners()
  
  console.log('Testing basic deployment...\n')
  console.log('Network:', network.name)
  console.log('Deployer:', deployer.address)
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n')
  
  // Deploy a minimal contract
  console.log('Deploying minimal ERC20...')
  const ERC20 = await ethers.getContractFactory('DWTToken')
  const token = await ERC20.deploy(deployer.address)
  
  console.log('Deploy transaction sent:', token.deploymentTransaction()?.hash)
  console.log('Waiting for deployment...')
  
  await token.waitForDeployment()
  
  const address = await token.getAddress()
  console.log('\n✅ Contract deployed to:', address)
  
  // Try to read from it
  console.log('\nTrying to read owner()...')
  try {
    const owner = await token.owner()
    console.log('✅ Owner:', owner)
  } catch (e) {
    console.log('❌ Failed to read owner:', e.message)
  }
  
  console.log('\nTrying to read name()...')
  try {
    const name = await token.name()
    console.log('✅ Name:', name)
  } catch (e) {
    console.log('❌ Failed to read name:', e.message)
  }
  
  console.log('\nTrying to read totalSupply()...')
  try {
    const supply = await token.totalSupply()
    console.log('✅ Total Supply:', ethers.formatEther(supply))
  } catch (e) {
    console.log('❌ Failed to read totalSupply:', e.message)
  }
  
  // Check the code at the address
  console.log('\nChecking bytecode at address...')
  const code = await ethers.provider.getCode(address)
  console.log('Code length:', code.length)
  console.log('Has code:', code !== '0x')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
