const { ethers } = require('hardhat')
const fs = require('fs')

async function main() {
  const raw = {
    DWT: '0x9ce235f8574bde67393884550F02135CE4fB8387',
    TIMELOCK: '0x4D4b62f064bCe37983853037569c0087879A367b',
    GOVERNOR: '0xeDF8F64D36c2fb1502276787B1D32cec23EdbDe5',
    TREASURY: '0xb5002AC3EE2f8d10f6dCB5F3a9070d625d8d4417',
  }

  const DWT = ethers.getAddress(raw.DWT)
  const TIMELOCK = ethers.getAddress(raw.TIMELOCK)
  const GOVERNOR = ethers.getAddress(raw.GOVERNOR)
  const TREASURY = ethers.getAddress(raw.TREASURY)

  let content = fs.readFileSync('.env', 'utf8')

  // Replace ALL occurrences to avoid sync issues
  content = content.replace(/(?<=DWT_TOKEN=).*/g, DWT)
  content = content.replace(/(?<=DWT_TOKEN_ADDRESS=).*/g, DWT)
  content = content.replace(/(?<=BASE_DWT_TOKEN=).*/g, DWT)

  content = content.replace(/(?<=TIMELOCK=).*/g, TIMELOCK)
  content = content.replace(/(?<=BASE_TIMELOCK=).*/g, TIMELOCK)

  content = content.replace(/(?<=GOVERNOR=).*/g, GOVERNOR)

  content = content.replace(/(?<=TREASURY=).*/g, TREASURY)
  content = content.replace(/(?<=TREASURY_ADDRESS=).*/g, TREASURY)

  fs.writeFileSync('.env', content)
  console.log('Environment consolidated.')
}

main().catch(console.error)
