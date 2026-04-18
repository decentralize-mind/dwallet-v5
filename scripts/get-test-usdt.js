#!/usr/bin/env node
/**
 * Get Test USDT Tokens on Testnets
 * 
 * This script helps you obtain test USDT tokens on various testnets
 * for testing purposes.
 * 
 * Usage:
 *   node scripts/get-test-usdt.js --network sepolia --amount 100
 *   node scripts/get-test-usdt.js --network baseSepolia --amount 50
 * 
 * Requirements:
 *   - Infura or Alchemy API key in .env file
 *   - Some native token (ETH) for gas fees
 */

const { ethers } = require('ethers')
require('dotenv').config()

// Testnet USDT contract addresses
const USDT_ADDRESSES = {
  sepolia: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
  baseSepolia: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
}

// Testnet USDT ABIs (minimal for transfer)
const USDT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

// Faucet addresses (these are example addresses - replace with actual faucet contracts)
const FAUCET_ADDRESSES = {
  sepolia: '0x0000000000000000000000000000000000000000', // Replace with actual faucet
  baseSepolia: '0x0000000000000000000000000000000000000000', // Replace with actual faucet
}

// Network RPC URLs
const RPC_URLS = {
  sepolia: process.env.INFURA_KEY
    ? `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`
    : 'https://ethereum-sepolia.publicnode.com',
  baseSepolia: 'https://sepolia.base.org',
}

function parseArgs() {
  const args = process.argv.slice(2)
  const parsed = {
    network: 'sepolia',
    amount: '100',
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--network' && args[i + 1]) {
      parsed.network = args[i + 1]
      i++
    } else if (args[i] === '--amount' && args[i + 1]) {
      parsed.amount = args[i + 1]
      i++
    } else if (args[i] === '--help' || args[i] === '-h') {
      parsed.help = true
    }
  }

  return parsed
}

function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════╗
║        dWallet - Get Test USDT Tokens             ║
╚═══════════════════════════════════════════════════╝

Usage:
  node scripts/get-test-usdt.js [options]

Options:
  --network <network>    Testnet to use (sepolia, baseSepolia)
                         Default: sepolia
  --amount <amount>      Amount of USDT to request
                         Default: 100
  --help, -h             Show this help message

Examples:
  node scripts/get-test-usdt.js --network sepolia --amount 100
  node scripts/get-test-usdt.js --network baseSepolia --amount 50

Supported Networks:
  - sepolia (Ethereum Sepolia testnet)
  - baseSepolia (Base Sepolia testnet)

Note: This script requires a wallet with some native tokens for gas fees.
      Set PRIVATE_KEY in your .env file.

`)
}

async function getProvider(network) {
  const url = RPC_URLS[network]
  if (!url) {
    throw new Error(`Unsupported network: ${network}`)
  }
  return new ethers.JsonRpcProvider(url)
}

async function checkBalance(provider, address, tokenAddress, network) {
  console.log('\n🔍 Checking your USDT balance...')
  
  const contract = new ethers.Contract(tokenAddress, USDT_ABI, provider)
  
  try {
    const [balance, decimals, symbol] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals(),
      contract.symbol(),
    ])
    
    const formatted = ethers.formatUnits(balance, decimals)
    console.log(`💰 Current ${symbol} balance: ${parseFloat(formatted).toFixed(4)}`)
    
    return { balance, decimals, symbol }
  } catch (error) {
    console.error('❌ Error checking balance:', error.message)
    return null
  }
}

async function requestFromFaucet(network, amount, wallet) {
  console.log(`\n🚰 Requesting ${amount} test USDT from faucet...`)
  
  const usdtAddress = USDT_ADDRESSES[network]
  const faucetAddress = FAUCET_ADDRESSES[network]
  
  if (!usdtAddress) {
    throw new Error(`USDT not configured for network: ${network}`)
  }
  
  if (!faucetAddress || faucetAddress === '0x0000000000000000000000000000000000000000') {
    console.log('\n⚠️  No automated faucet available for this network.')
    console.log('\n📋 Manual options:')
    console.log('  1. Visit web-based faucets:')
    
    if (network === 'sepolia') {
      console.log('     - https://faucets.chain.link/sepolia')
      console.log('     - https://sepoliafaucet.com/')
      console.log('     - https://cloud.google.com/application/web3/faucet/ethereum/sepolia')
    } else if (network === 'baseSepolia') {
      console.log('     - https://faucets.chain.link/base-sepolia')
      console.log('     - https://faucet.base.org/')
    }
    
    console.log('\n  2. Ask in Discord/Telegram communities')
    console.log('\n  3. Use Hardhat/Foundry local testnet for development')
    return false
  }
  
  // If faucet contract exists, interact with it
  const FAUCET_ABI = [
    'function requestTokens(address token, address recipient, uint256 amount)',
  ]
  
  try {
    const faucet = new ethers.Contract(faucetAddress, FAUCET_ABI, wallet)
    const usdt = new ethers.Contract(usdtAddress, USDT_ABI, wallet)
    const decimals = await usdt.decimals()
    
    const amountParsed = ethers.parseUnits(amount.toString(), decimals)
    
    console.log('📝 Sending request to faucet contract...')
    
    const tx = await faucet.requestTokens(usdtAddress, wallet.address, amountParsed, {
      gasLimit: 300000,
    })
    
    console.log('⏳ Waiting for transaction confirmation...')
    const receipt = await tx.wait()
    
    console.log('✅ Transaction confirmed!')
    console.log(`🔗 Transaction hash: ${receipt.hash}`)
    console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`)
    
    return true
  } catch (error) {
    console.error('❌ Faucet request failed:', error.message)
    return false
  }
}

async function main() {
  const args = parseArgs()
  
  if (args.help) {
    showHelp()
    process.exit(0)
  }
  
  console.log('\n╔═══════════════════════════════════════════════════╗')
  console.log('║        dWallet - Get Test USDT Tokens             ║')
  console.log('╚═══════════════════════════════════════════════════╝\n')
  
  // Validate network
  if (!USDT_ADDRESSES[args.network]) {
    console.error(`❌ Unsupported network: ${args.network}`)
    console.log('Supported networks:', Object.keys(USDT_ADDRESSES).join(', '))
    process.exit(1)
  }
  
  // Check for private key
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not set in .env file')
    console.log('Please create a .env file with your private key:')
    console.log('PRIVATE_KEY=your_private_key_here')
    process.exit(1)
  }
  
  try {
    // Setup provider and wallet
    const provider = await getProvider(args.network)
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
    
    console.log(`🌐 Network: ${args.network}`)
    console.log(`👛 Wallet: ${wallet.address}`)
    
    // Check native balance
    const nativeBalance = await provider.getBalance(wallet.address)
    const nativeFormatted = ethers.formatEther(nativeBalance)
    console.log(`💎 Native balance: ${parseFloat(nativeFormatted).toFixed(6)} ETH`)
    
    if (nativeBalance === 0n) {
      console.log('\n⚠️  You need some ETH for gas fees!')
      console.log('Get test ETH from:')
      if (args.network === 'sepolia') {
        console.log('  - https://sepoliafaucet.com/')
        console.log('  - https://faucets.chain.link/sepolia')
      } else if (args.network === 'baseSepolia') {
        console.log('  - https://faucet.base.org/')
        console.log('  - https://faucets.chain.link/base-sepolia')
      }
      process.exit(1)
    }
    
    // Check current USDT balance
    const balanceInfo = await checkBalance(
      provider,
      wallet.address,
      USDT_ADDRESSES[args.network],
      args.network
    )
    
    if (!balanceInfo) {
      console.error('❌ Could not read USDT contract. Make sure the address is correct.')
      process.exit(1)
    }
    
    // Request from faucet
    const success = await requestFromFaucet(args.network, args.amount, wallet)
    
    if (success) {
      // Check new balance
      console.log('\n🔄 Checking updated balance...')
      await checkBalance(
        provider,
        wallet.address,
        USDT_ADDRESSES[args.network],
        args.network
      )
      
      console.log('\n✅ Success! You now have test USDT.')
      console.log('💡 You can now test sending/receiving USDT in dWallet.')
    } else {
      console.log('\n⚠️  Automated faucet not available.')
      console.log('📖 Please refer to USDT-GUIDE.md for manual options.')
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
  
  console.log('\n═══════════════════════════════════════════════════\n')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
