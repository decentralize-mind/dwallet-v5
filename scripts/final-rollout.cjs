const { ethers } = require('ethers')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org'
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
  const deployer = wallet

  console.log('🚀 DWALLET-V5: GENESIS PROTOCOL ROLLOUT (LAYERS 0-10)')
  console.log(`- Deployer: ${deployer.address}`)
  console.log(`- Network:  ${RPC_URL}`)

  const deploy = async (contractPath, args = [], nonce) => {
    const artifact = JSON.parse(fs.readFileSync(`./artifacts/${contractPath}.json`, 'utf8'))
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer)
    const tx = await factory.deploy(...args, { nonce })
    await tx.waitForDeployment()
    const addr = await tx.getAddress()
    console.log(`   ✅ ${path.basename(contractPath)}: ${addr}`)
    return addr
  }

  let nonce = await provider.getTransactionCount(deployer.address, 'pending')

  // ── LAYER 0: CORE INFRASTRUCTURE ──────────────────────────────────────────
  console.log('\n--- Layer 0: Registry & Infrastructure ---')
  const registry = await deploy('contracts/layer0/ProtocolRegistry.sol/ProtocolRegistry', [deployer.address], nonce++)
  const config   = await deploy('contracts/layer0/NetworkConfig.sol/NetworkConfig',   [registry, deployer.address], nonce++)

  // ── LAYER 7: UNIFIED SECURITY ─────────────────────────────────────────────
  console.log('\n--- Layer 7: Security Controller ---')
  const security = await deploy('contracts/layer7/Layer7Security.sol/Layer7Security', [registry, deployer.address, deployer.address, deployer.address], nonce++)

  // ── LAYER 1: ASSET MANAGEMENT ─────────────────────────────────────────────
  console.log('\n--- Layer 1: Treasury & Liquidity ---')
  const treasury = await deploy('contracts/layer1/Treasury.sol/Treasury', [
    security, registry, deployer.address, deployer.address, deployer.address,
    ethers.ZeroAddress, // Access
    ethers.ZeroAddress, // Time
    ethers.ZeroAddress, // State
    ethers.ZeroAddress, // Rate
    ethers.ZeroAddress  // Verify
  ], nonce++)

  // ── LAYER 9: SETTLEMENT ───────────────────────────────────────────────────
  console.log('\n--- Layer 9: Debt & Settlement ---')
  const lending = await deploy('contracts/layer9/LendingMarket.sol/LendingMarket', [
    process.env.USDC_ADDRESS,
    process.env.DWT_PRICE_ORACLE,
    deployer.address, // Admin
    deployer.address, // Governor
    deployer.address, // Guardian
    security, registry, 
    ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress
  ], nonce++)

  // ── LAYER 10: ECOSYSTEM ───────────────────────────────────────────────────
  console.log('\n--- Layer 10: Derivatives & Data ---')
  const oracle = await deploy('contracts/layer10/DWTOracle.sol/DWTMockOracle', [
    ethers.parseUnits('1.0', 18),
    deployer.address, deployer.address,
    security, registry,
    ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress
  ], nonce++)

  console.log('\n🎉 GENESIS ROLLOUT COMPLETE')
}

main().catch(console.error)
