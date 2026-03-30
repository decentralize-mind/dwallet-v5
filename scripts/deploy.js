// scripts/deploy.js
// Run with: npx hardhat run scripts/deploy.js --network sepolia
//           npx hardhat run scripts/deploy.js --network mainnet

const { ethers, network, run } = require('hardhat')
require('dotenv').config()

async function main() {
  console.log('\n═══════════════════════════════════════════════════')
  console.log('   dWallet Fee Router — Deployment Script')
  console.log('═══════════════════════════════════════════════════\n')

  // ── Pre-flight checks ──────────────────────────────────────────────────────
  const feeRecipient = process.env.FEE_RECIPIENT
  const initialFee = parseInt(process.env.INITIAL_FEE_BPS || '20')

  if (!feeRecipient || !ethers.isAddress(feeRecipient)) {
    throw new Error(
      '❌ FEE_RECIPIENT is not set or is an invalid address in .env',
    )
  }

  if (initialFee < 0 || initialFee > 100) {
    throw new Error('❌ INITIAL_FEE_BPS must be between 0 and 100')
  }

  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)
  const networkName = network.name

  console.log('Network:       ', networkName)
  console.log('Deployer:      ', deployer.address)
  console.log('Balance:       ', ethers.formatEther(balance), 'ETH')
  console.log('Fee Recipient: ', feeRecipient)
  console.log('Initial Fee:   ', initialFee / 100, '% (', initialFee, 'bps)')

  // Warn if deploying to mainnet
  if (networkName === 'mainnet') {
    console.log('\n⚠️  DEPLOYING TO MAINNET — this uses real ETH')
    console.log('   Press Ctrl+C within 10 seconds to cancel...\n')
    await new Promise(resolve => setTimeout(resolve, 10000))
  }

  // Check balance is enough (rough estimate: 0.05 ETH for deployment)
  if (balance < ethers.parseEther('0.01')) {
    throw new Error(
      `❌ Insufficient balance. Need at least 0.01 ETH, have ${ethers.formatEther(balance)} ETH`,
    )
  }

  // ── Get gas price ──────────────────────────────────────────────────────────
  const feeData = await ethers.provider.getFeeData()
  const gasPrice = feeData.gasPrice
  console.log('Gas price:     ', ethers.formatUnits(gasPrice, 'gwei'), 'Gwei')

  // ── Deploy ─────────────────────────────────────────────────────────────────
  console.log('\nDeploying DWalletFeeRouter...')

  const FeeRouter = await ethers.getContractFactory('DWalletFeeRouter')

  // Estimate deployment gas
  const deployTx = await FeeRouter.getDeployTransaction(
    feeRecipient,
    initialFee,
  )
  const gasEstimate = await ethers.provider.estimateGas(deployTx)
  const gasCost = gasEstimate * gasPrice

  console.log('Estimated gas: ', gasEstimate.toString(), 'units')
  console.log('Estimated cost:', ethers.formatEther(gasCost), 'ETH')

  const router = await FeeRouter.deploy(feeRecipient, initialFee)
  console.log('\nTransaction sent:', router.deploymentTransaction().hash)
  console.log('Waiting for confirmation...')

  await router.waitForDeployment()
  const contractAddress = await router.getAddress()

  console.log('\n✅ DWalletFeeRouter deployed successfully!')
  console.log('═══════════════════════════════════════════════════')
  console.log('Contract address:', contractAddress)
  console.log('═══════════════════════════════════════════════════\n')

  // ── Verify deployment ──────────────────────────────────────────────────────
  console.log('Verifying deployment...')
  const deployedOwner = await router.owner()
  const deployedRecipient = await router.feeRecipient()
  const deployedFee = await router.feeBps()

  console.log('✓ Owner:        ', deployedOwner)
  console.log('✓ Fee Recipient:', deployedRecipient)
  console.log('✓ Fee:          ', deployedFee.toString(), 'bps')
  console.log(
    '✓ Max Fee:      ',
    (await router.MAX_FEE_BPS()).toString(),
    'bps',
  )
  console.log('✓ Paused:       ', await router.paused())

  // ── Save deployment info ───────────────────────────────────────────────────
  const fs = require('fs')
  const deploymentInfo = {
    network: networkName,
    contractAddress: contractAddress,
    deployer: deployer.address,
    feeRecipient: feeRecipient,
    feeBps: initialFee,
    txHash: router.deploymentTransaction().hash,
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  }

  const filename = `deployments/${networkName}-${Date.now()}.json`
  fs.mkdirSync('deployments', { recursive: true })
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2))
  console.log('\n📁 Deployment info saved to:', filename)

  // ── Etherscan verification ─────────────────────────────────────────────────
  if (networkName !== 'hardhat' && networkName !== 'localhost') {
    console.log('\nVerifying contract on Etherscan...')
    console.log('(waiting 30 seconds for Etherscan to index the contract)\n')
    await new Promise(resolve => setTimeout(resolve, 30000))

    try {
      await run('verify:verify', {
        address: contractAddress,
        constructorArguments: [feeRecipient, initialFee],
      })
      console.log('✅ Contract verified on Etherscan!')
      console.log(
        `   https://${networkName === 'sepolia' ? 'sepolia.' : ''}etherscan.io/address/${contractAddress}#code`,
      )
    } catch (err) {
      if (err.message.includes('Already Verified')) {
        console.log('✓ Contract already verified')
      } else {
        console.log('⚠️  Etherscan verification failed:', err.message)
        console.log('   Run manually:')
        console.log(
          `   npx hardhat verify --network ${networkName} ${contractAddress} "${feeRecipient}" "${initialFee}"`,
        )
      }
    }
  }

  // ── Next steps ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════')
  console.log('NEXT STEPS:')
  console.log('═══════════════════════════════════════════════════')
  console.log('1. Update dWallet src/utils/defi.js:')
  console.log(`   swapRouter02: "${contractAddress}"`)
  console.log('')
  console.log('2. Add fee disclosure to SwapPanel.jsx:')
  console.log('   "Powered by Uniswap V3 · 0.20% dWallet fee"')
  console.log('')
  console.log('3. Monitor your fee wallet:')
  console.log(`   https://etherscan.io/address/${feeRecipient}`)
  console.log('')
  console.log('4. View contract on Etherscan:')
  console.log(
    `   https://${networkName === 'sepolia' ? 'sepolia.' : ''}etherscan.io/address/${contractAddress}`,
  )
  console.log('═══════════════════════════════════════════════════\n')

  return contractAddress
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Deployment failed:', error.message)
    process.exit(1)
  })
