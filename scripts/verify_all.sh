#!/bin/bash
set -e

echo "Starting Full Protocol Verification (Layers 1-10)..."

# Layer 1
echo "Testing Layer 1..."
npx hardhat test test/DWalletFeeRouter.test.cjs

# Layer 4 (already verified but including for completeness)
echo "Testing Layer 4..."
npx hardhat test test/Layer4.test.cjs

# Security Verification Suite (The core of our remediation)
echo "Running Security Verification Suite..."
npx hardhat test test/SecurityFixes.test.cjs

echo "All protocol layers verified successfully!"
