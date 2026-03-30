const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  const DWT_ADDR = '0x8d4a7Bb80aFc56Ba0aACCF31610Dd571aBAD9272'
  const dwt = await ethers.getContractAt(
    'contracts/layer1/DWTToken.sol:DWTToken',
    DWT_ADDR,
  )

  const target = '0xf18e59291febf91b0BAa57E10AD26711337ba722'
  const amt = ethers.parseEther('3500000')

  console.log(`Attempting to mint 3.5M to ${target}...`)
  try {
    const tx = await dwt.mint(target, amt)
    console.log('Tx hash:', tx.hash)
    const receipt = await tx.wait()
    console.log('Success! Gas used:', receipt.gasUsed.toString())
  } catch (e) {
    console.error('FAILED:', e.message)
    if (e.data) console.error('Data:', e.data)
  }
}

main().catch(console.error)
