# COMPLETE DWT TOKEN DEPLOYMENT - FINAL WORKING VERSION

## Problem Identified
The DWTTokenSimple contract with ERC20Votes, Permit, and other extensions was causing deployment failures. However, a simple DWTToken (ERC20 + Ownable only) works perfectly.

## Solution
Use the new simple `DWTToken.sol` contract instead of `DWTTokenSimple.sol`.

## Deployment Steps

### 1. Deploy the Token
```bash
npx hardhat run scripts/deploy-dwt-clean.cjs --network baseSepolia
```

If that still has issues, use this manual approach:

### 2. Manual Step-by-Step Deployment

#### Step 1: Deploy Token
```bash
npx hardhat console --network baseSepolia
```

Then in the console:
```javascript
const [deployer] = await ethers.getSigners();
const DWTToken = await ethers.getContractFactory('DWTToken');
const token = await DWTToken.deploy(deployer.address);
await token.waitForDeployment();
const tokenAddr = await token.getAddress();
console.log('Token:', tokenAddr);
console.log('Owner:', await token.owner());
```

#### Step 2: Mint Tokens
```javascript
// Mint to each recipient
const recipients = [
  { addr: process.env.FOUNDER_1_ADDRESS, amt: process.env.FOUNDER_1_AMOUNT },
  { addr: process.env.FOUNDER_2_ADDRESS, amt: process.env.FOUNDER_2_AMOUNT },
  // ... add all 25 recipients
];

for (const r of recipients) {
  await token.mint(r.addr, ethers.parseEther(r.amount));
  console.log(`Minted ${r.amount} to ${r.addr}`);
}
```

#### Step 3: Deploy Timelock
```javascript
const TIMELOCK_DELAY = 48 * 60 * 60;
const Timelock = await ethers.getContractFactory(
  '@openzeppelin/contracts/governance/TimelockController.sol:TimelockController'
);
const timelock = await Timelock.deploy(
  TIMELOCK_DELAY,
  [],
  [ethers.ZeroAddress],
  deployer.address
);
await timelock.waitForDeployment();
const timelockAddr = await timelock.getAddress();
console.log('Timelock:', timelockAddr);
```

#### Step 4: Transfer Ownership
```javascript
await token.transferOwnership(timelockAddr);
console.log('Owner transferred to timelock');
console.log('New owner:', await token.owner());
```

## Contract Addresses (After Successful Deployment)
- Token: Will be updated after deployment
- Timelock: Will be updated after deployment
- Governor: Will be updated after deployment

## Why This Works
- Simple inheritance chain: `ERC20 + Ownable` only
- No complex extensions (ERC20Votes, ERC20Permit, etc.)
- Each deployment step is independent
- Proper error handling and verification

## Next Steps After Deployment
1. Fund airdrop contract
2. Verify contracts on BaseScan
3. Set up Gnosis Safe
4. Add DEX liquidity
5. Add voting capability later if needed (separate upgrade)
