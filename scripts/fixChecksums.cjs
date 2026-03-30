const { ethers } = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  const envPath = path.join(process.cwd(), '.env')
  let content = fs.readFileSync(envPath, 'utf8')

  const addresses = [
    '0xEF2088b398df9819777176E36a3A43D0530705F9',
    '0x5317Af0e2f442254c45d6f2E3faF2577B0824870',
    '0x229418e244Cb91B1Fdf87A8679A89D227d113B6A',
  ]

  for (const addr of addresses) {
    try {
      const checksummed = ethers.getAddress(addr.toLowerCase())
      console.log(`Input: ${addr} -> Fixed: ${checksummed}`)
      content = content.replace(new RegExp(addr, 'ig'), checksummed)
    } catch (e) {
      console.error(`Failed to fix ${addr}: ${e.message}`)
    }
  }

  fs.writeFileSync(envPath, content)
}

main().catch(console.error)
