const dotenv = require('dotenv')
const path = require('path')
const result = dotenv.config({ path: '../../.env' })

if (result.error) {
  console.error('Dotenv Error:', result.error)
}

const pk = process.env.DEPLOYER_PRIVATE_KEY
console.log('DEPLOYER_PRIVATE_KEY raw:', pk ? 'EXISTS' : 'MISSING')
if (pk) {
  console.log('Length:', pk.length)
  const cleaned = pk.replace(/^0x/, '')
  console.log('Cleaned length:', cleaned.length)
  const formatted = `0x${cleaned}`
  console.log('Formatted prefix:', formatted.substring(0, 10))
  try {
    const bigint = BigInt(formatted)
    console.log('BigInt Success')
  } catch (e) {
    console.error('BigInt Fail:', e.message)
  }
}
