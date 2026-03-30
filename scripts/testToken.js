const { ethers } = require('hardhat')

async function main() {
  const [deployer] = await ethers.getSigners()
  const TOKEN_ADDRESS = '0x2656f902c4d404e90673931857761483A33541aa'
  const token = await ethers.getContractAt('DWalletToken', TOKEN_ADDRESS)

  const TEST_RECIPIENT = '0x000000000000000000000000000000000000dEaD'
  const amount = ethers.parseEther('1000')

  console.log('Sending 1,000 DWT to test address...')
  const tx = await token.transfer(TEST_RECIPIENT, amount)
  await tx.wait()
  console.log('✅ Transfer successful. Tx:', tx.hash)

  const deadBal = await token.balanceOf(TEST_RECIPIENT)
  console.log('Dead address now holds:', ethers.formatEther(deadBal), 'DWT')
}

main().catch(console.error)
