const hre = require('hardhat')

async function main() {
  const names = await hre.artifacts.getAllFullyQualifiedNames()
  console.log('All Fully Qualified Names:')
  console.log(JSON.stringify(names, null, 2))
}

main().catch(console.error)
