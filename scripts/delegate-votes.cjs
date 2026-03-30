const { ethers } = require('hardhat')
require('dotenv').config()

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('\n🗳️ DWT Voting Power Activator')
  console.log('----------------------------------------------------')

  const TokenAddr =
    process.env.BASE_DWT_TOKEN ||
    process.env.DWT_TOKEN_ADDRESS ||
    process.env.DWT_TOKEN
  const dwtToken = await ethers.getContractAt('DWTToken', TokenAddr)

  // List of addresses that just received tokens from the Direct Mint
  const addressesToDelegate = [
    process.env.FOUNDER_1_ADDRESS,
    process.env.FOUNDER_2_ADDRESS,
    process.env.FOUNDER_3_ADDRESS,
    deployer.address, // Just in case
  ].filter(a => !!a)

  for (const addr of addressesToDelegate) {
    const bal = await dwtToken.balanceOf(addr)
    if (bal > 0n) {
      console.log(`Address: ${addr}`)
      console.log(`Balance: ${ethers.formatEther(bal)} DWT`)

      // In a real scenario, each founder must sign for themselves.
      // But since this is a testnet and you likely control these keys:
      try {
        process.stdout.write('Activating voting power (self-delegating)... ')
        const tx = await dwtToken.delegate(addr) // This requires the signer to be 'addr'
        await tx.wait()
        console.log('✅ SUCCESS')
      } catch (e) {
        console.log(
          `❌ FAILED: Signer (deployer) is not the account being delegated. This account must sign its own delegation transaction.`,
        )
      }
    }
  }

  console.log('\n⚠️  Note: Voting power is snapshot-based.')
  console.log('The Governor will see this voting power in the NEXT block.')
}

main().catch(console.error)
