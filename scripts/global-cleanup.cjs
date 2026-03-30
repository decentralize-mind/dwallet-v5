const { ethers } = require('hardhat')
const fs = require('fs')

async function main() {
  // Definitive Latest Addresses (from Step 1047)
  const latest = {
    DWT: ethers.getAddress('0x9ce235f8574bde67393884550F02135CE4fB8387'),
    TIMELOCK: ethers.getAddress('0x4D4b62f064bCe37983853037569c0087879A367b'),
    GOVERNOR: ethers.getAddress('0xeDF8F64D36c2fb1502276787B1D32cec23EdbDe5'),
    TREASURY: ethers.getAddress('0xb5002AC3EE2f8d10f6dCB5F3a9070d625d8d4417'),
  }

  // Old addresses to find (any variant)
  const oldDWT = '0xEF2088b398df9819777176E36a3A43D0530705F9'
  const oldDWT2 = '0x8e9fabcFf4A97eEBa63943D0530705302e519102'

  let content = fs.readFileSync('.env', 'utf8')

  // Replace all token-related vars
  const tokenVars = [
    'DWT_TOKEN',
    'DWT_TOKEN_ADDRESS',
    'GOVERNANCE_TOKEN_ADDRESS',
    'REWARD_TOKEN_ADDRESS',
    'BASE_DWT_TOKEN',
  ]
  for (const v of tokenVars) {
    content = content.replace(new RegExp(`${v}=.*`, 'g'), `${v}=${latest.DWT}`)
  }

  // Replace all other core vars
  content = content.replace(/TIMELOCK=.*/g, `TIMELOCK=${latest.TIMELOCK}`)
  content = content.replace(/GOVERNOR=.*/g, `GOVERNOR=${latest.GOVERNOR}`)
  content = content.replace(
    /TREASURY_ADDRESS=.*/g,
    `TREASURY_ADDRESS=${latest.TREASURY}`,
  )
  content = content.replace(/TREASURY=.*/g, `TREASURY=${latest.TREASURY}`)

  fs.writeFileSync('.env', content)
  console.log('Global .env cleanup finished.')
}

main().catch(console.error)
