const { ethers } = require('ethers')
const fs = require('fs')

const envPath = '.env'
let content = fs.readFileSync(envPath, 'utf-8')

const badAddr = '0x4aDC67696bA3f88bc758659FA232d6D618583CA1'
const fixedAddr = ethers.getAddress(badAddr.toLowerCase())
content = content.replace(new RegExp(badAddr, 'g'), fixedAddr)

console.log(`Fixed ${badAddr} -> ${fixedAddr}`)
fs.writeFileSync(envPath, content)
