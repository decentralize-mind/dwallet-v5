const { ethers } = require('hardhat')

async function main() {
  const [deployer] = await ethers.getSigners()
  const currentNonce = await deployer.getNonce()
  console.log('Current Nonce:', currentNonce)

  // Scan backwards from currentNonce
  for (let i = currentNonce - 1; i >= Math.max(0, currentNonce - 50); i--) {
    // Since we can't easily get the tx by nonce from provider in a simple way
    // We'll just check if we can find any that created contracts
  }
  // Better: I'll just check the ONE contract I need: Treasury
  // I deployed it at the very end.
  // Let's use the address from the previous log if I can find it or just redeploy it.
  // Wait, I'll just re-deploy Layer 1 ONE LAST TIME with .env logging.
}
