const { ethers, network } = require('hardhat')
require('dotenv').config()

const TOKEN_ADDRESS = '0x2656f902c4d404e90673931857761483A33541aa'

// Adjusted for Sepolia test — sending smaller amounts to verify addresses work
// On mainnet use the full amounts
const IS_TEST = network.name === 'sepolia'

const TEAM = [
  {
    name: 'Phearun (Founder)',
    address: '0xf18e59291febf91b0BAa57E10AD26711337ba722',
    mainnet: '9000000',
    test: '90000',
  },
  {
    name: 'Vanda',
    address: '0x899b5138Bb2EEeBB1821B8D819ACeF91995Bab20',
    mainnet: '2250000',
    test: '22500',
  },
  {
    name: 'Kao Ching',
    address: '0x20b9a63f1e98a84292245bd8ea6d329b30ccb5c9',
    mainnet: '1800000',
    test: '18000',
  },
  {
    name: 'Niron',
    address: '0x263a72260e4F08931119522260E4AC578F7e980C',
    mainnet: '1800000',
    test: '18000',
  },
  {
    name: 'Sok Ny',
    address: '0x3fcEDd6B24eE6E636C066aDebcF5F1E06C6fC901',
    mainnet: '1800000',
    test: '18000',
  },
  {
    name: 'Kimleang',
    address: '0xa97d7dB42A89a005dA23E5BDFc7BE7A65Bf00a19',
    mainnet: '1800000',
    test: '18000',
  },
  {
    name: 'JJ-Dubai',
    address: '0x9756c9520030fc50625abe9f2ed706c4dBC21128',
    mainnet: '1350000',
    test: '13500',
  },
  {
    name: 'Pu-Kim',
    address: '0xBA27D9FB9dd2C664eFdA4d7e01d4D871BD3A5fCB',
    mainnet: '1350000',
    test: '13500',
  },
  {
    name: 'Sovandy',
    address: '0x2EC22ebD64f79283877e1AD8B9D13F89A76B45A0',
    mainnet: '1350000',
    test: '13500',
  },
]

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

async function main() {
  const [deployer] = await ethers.getSigners()
  const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, deployer)
  const decimals = await token.decimals()
  const myBalance = await token.balanceOf(deployer.address)
  const isTest = network.name === 'sepolia'

  console.log('\n═══════════════════════════════════════════════════')
  console.log('   DWT Team Distribution')
  console.log('═══════════════════════════════════════════════════')
  console.log(
    'Network:    ',
    network.name,
    isTest ? '(TEST — scaled 1/100)' : '(MAINNET — real amounts)',
  )
  console.log('Token:      ', TOKEN_ADDRESS)
  console.log('Sender:     ', deployer.address)
  console.log('DWT balance:', ethers.formatUnits(myBalance, decimals), 'DWT')

  const totalToSend = TEAM.reduce((sum, m) => {
    const amt = isTest ? m.test : m.mainnet
    return sum + BigInt(ethers.parseUnits(amt, decimals))
  }, 0n)

  console.log(
    'Total sending:',
    ethers.formatUnits(totalToSend, decimals),
    'DWT',
  )

  if (myBalance < totalToSend) {
    console.error(`\n❌ Insufficient balance.`)
    console.error(`   Need:  ${ethers.formatUnits(totalToSend, decimals)} DWT`)
    console.error(`   Have:  ${ethers.formatUnits(myBalance, decimals)} DWT`)
    process.exit(1)
  }

  if (!isTest) {
    console.log('\n⚠️  MAINNET — 10 second countdown, Ctrl+C to cancel...\n')
    await new Promise(r => setTimeout(r, 10000))
  }

  console.log('\nStarting transfers...\n')

  for (const member of TEAM) {
    const amt = isTest ? member.test : member.mainnet
    const amount = ethers.parseUnits(amt, decimals)
    process.stdout.write(
      `Sending ${amt.padStart(10)} DWT to ${member.name.padEnd(20)} (${member.address.slice(0, 10)}...)... `,
    )
    try {
      const tx = await token.transfer(member.address, amount)
      await tx.wait()
      console.log(`✅ ${tx.hash.slice(0, 20)}...`)
    } catch (e) {
      console.log(`❌ FAILED: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 2000))
  }

  console.log('\n── Final balances ──────────────────────────────────')
  for (const member of TEAM) {
    const bal = await token.balanceOf(member.address)
    console.log(
      `${member.name.padEnd(22)} ${ethers.formatUnits(bal, decimals).padStart(14)} DWT`,
    )
  }
  const remaining = await token.balanceOf(deployer.address)
  console.log(
    `\nDeployer remaining: ${ethers.formatUnits(remaining, decimals)} DWT`,
  )
  console.log('═══════════════════════════════════════════════════\n')
}

main().catch(e => {
  console.error('\n❌', e.message)
  process.exit(1)
})
