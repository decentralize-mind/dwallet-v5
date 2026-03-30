const { ethers } = require('hardhat')
const fs = require('fs')

async function main() {
  let content = fs.readFileSync('.env', 'utf8')

  // All known addresses in .env should be checksummed
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^([^=]+)=(0x[a-fA-F0-9]{40})$/)
    if (match) {
      try {
        const checksummed = ethers.getAddress(match[2].toLowerCase())
        lines[i] = `${match[1]}=${checksummed}`
      } catch (e) {
        // Not a valid address or already handled
      }
    }
  }
  fs.writeFileSync('.env', lines.join('\n'))
  console.log('Total .env checksum sweep finished.')
}

main().catch(console.error)
