require('dotenv').config()
const fs = require('fs')
const path = require('path')

async function main() {
  const [deployer] = await ethers.getSigners()
  let currentNonce = await deployer.getNonce('pending')
  console.log('Deploying Layer 7 Security with:', deployer.address)
  console.log('Starting nonce:', currentNonce)

  const signers = [deployer.address] // Start with deployer as sole signer
  const threshold = 1
  const maxCalls = 100
  const maxValue = ethers.parseEther('1')
  const kycLevel = 0

  const Security = await ethers.getContractFactory('Layer7Security')
  const security = await Security.deploy(
    signers,
    threshold,
    maxCalls,
    maxValue,
    kycLevel,
    { nonce: currentNonce++ },
  )

  await security.waitForDeployment()
  const addr = await security.getAddress()

  console.log('\n════════════════════════════════════════════════════')
  console.log('  Layer 7 — Security & Access — Deployment Complete')
  console.log('════════════════════════════════════════════════════')
  console.log('════════════════════════════════════════════════════\n')

  // Save to .env
  const envPath = path.join(__dirname, '..', '.env')
  let envContent = fs.readFileSync(envPath, 'utf8')

  if (envContent.includes('LAYER7_SECURITY_ADDRESS')) {
    envContent = envContent.replace(
      /LAYER7_SECURITY_ADDRESS=.*/,
      `LAYER7_SECURITY_ADDRESS=${addr}`,
    )
  } else {
    envContent += `\nLAYER7_SECURITY_ADDRESS=${addr}\n`
  }

  fs.writeFileSync(envPath, envContent)
  console.log('✅ LAYER7_SECURITY_ADDRESS saved to .env')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
