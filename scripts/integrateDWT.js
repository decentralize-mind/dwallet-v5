const fs = require('fs')
const path = require('path')

// ── Config — update these after mainnet deployment ────────────────────────────
const DWT_ADDRESS_SEPOLIA = '0x2656f902c4d404e90673931857761483A33541aa'
const DWT_ADDRESS_MAINNET = '' // fill in after mainnet deploy
const USE_MAINNET = false // change to true after mainnet deploy

const DWT_ADDRESS = USE_MAINNET ? DWT_ADDRESS_MAINNET : DWT_ADDRESS_SEPOLIA
const DWALLET_PATH = path.join(__dirname, '../../dwallet-v6/src')

// ── Check dWallet folder exists ───────────────────────────────────────────────
if (!fs.existsSync(DWALLET_PATH)) {
  console.error('❌ dwallet-v6 not found at:', DWALLET_PATH)
  console.error('   Make sure dwallet-v6 is in ~/Downloads/dwallet-v6')
  process.exit(1)
}

console.log('\n═══════════════════════════════════════════════')
console.log('   DWT — dWallet Integration Script')
console.log('═══════════════════════════════════════════════')
console.log('DWT address:', DWT_ADDRESS)
console.log('Network:    ', USE_MAINNET ? 'mainnet' : 'sepolia (test)')
console.log('dWallet at: ', DWALLET_PATH)

// ── Fix 1: chains.js — add DWT to token list ─────────────────────────────────
const chainsPath = path.join(DWALLET_PATH, 'data/chains.js')
let chains = fs.readFileSync(chainsPath, 'utf8')

if (chains.includes('"DWT"')) {
  console.log('\n✓ chains.js — DWT already present, skipping')
} else {
  chains = chains.replace(
    /ethereum:\s*\["ETH",\s*"USDC",\s*"USDT",\s*"DAI"\]/,
    'ethereum: ["ETH", "USDC", "USDT", "DAI", "DWT"]',
  )
  chains = chains.replace(
    /tokens:\s*\["ETH",\s*"USDC",\s*"USDT",\s*"DAI"\]/,
    'tokens: ["ETH", "USDC", "USDT", "DAI", "DWT"]',
  )
  fs.writeFileSync(chainsPath, chains)
  console.log('\n✅ chains.js — DWT added to Ethereum token list')
}

// ── Fix 2: chains.js — add DWT to TOKEN_ICONS ─────────────────────────────────
if (chains.includes('DWT:') && chains.includes('TOKEN_ICONS')) {
  console.log('✓ chains.js — DWT icon already present, skipping')
} else {
  chains = fs.readFileSync(chainsPath, 'utf8')
  chains = chains.replace(/LINK:\s*"⬡",/, 'LINK: "⬡",\n  DWT:  "◈",')
  fs.writeFileSync(chainsPath, chains)
  console.log('✅ chains.js — DWT icon added')
}

// ── Fix 3: blockchain.js — add DWT contract address ──────────────────────────
const blockchainPath = path.join(DWALLET_PATH, 'utils/blockchain.js')
let blockchain = fs.readFileSync(blockchainPath, 'utf8')

if (blockchain.includes('DWT:') && blockchain.includes(DWT_ADDRESS)) {
  console.log('✓ blockchain.js — DWT address already present, skipping')
} else {
  blockchain = blockchain.replace(
    /UNI:\s*"0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",/,
    `UNI:  "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    DWT:  "${DWT_ADDRESS}",  // dWallet Token`,
  )
  fs.writeFileSync(blockchainPath, blockchain)
  console.log('✅ blockchain.js — DWT contract address added')
}

// ── Fix 4: prices.js — add DWT to CoinGecko IDs ──────────────────────────────
const pricesPath = path.join(DWALLET_PATH, 'utils/prices.js')
let prices = fs.readFileSync(pricesPath, 'utf8')

if (prices.includes('DWT:')) {
  console.log('✓ prices.js — DWT already present, skipping')
} else {
  prices = prices.replace(
    /LINK:\s*"chainlink",/,
    `LINK: "chainlink",\n  DWT:  "dwallet-token",  // update when listed on CoinGecko`,
  )
  // Add fallback price
  prices = prices.replace(/AAVE:\s*92,/, `AAVE: 92, DWT: 0.001,`)
  fs.writeFileSync(pricesPath, prices)
  console.log('✅ prices.js — DWT added with $0.001 fallback price')
}

// ── Fix 5: agentTools.js — let AI agent know about DWT ───────────────────────
const agentPath = path.join(DWALLET_PATH, 'utils/agentTools.js')
if (fs.existsSync(agentPath)) {
  let agent = fs.readFileSync(agentPath, 'utf8')
  if (!agent.includes('DWT')) {
    agent = agent.replace(
      /token:.*\{ type: "string", description: "Token symbol: ETH, USDC/,
      `token:  { type: "string", description: "Token symbol: ETH, USDC, DWT`,
    )
    fs.writeFileSync(agentPath, agent)
    console.log('✅ agentTools.js — DWT added to AI agent token list')
  } else {
    console.log('✓ agentTools.js — DWT already present, skipping')
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════')
console.log('✅ Integration complete!')
console.log('\nNext steps:')
console.log('1. cd ~/Downloads/dwallet-v6')
console.log('2. npm run build')
console.log('3. npx vercel --prod')
console.log('\nAfter mainnet deploy:')
console.log('4. Update DWT_ADDRESS_MAINNET in this script')
console.log('5. Set USE_MAINNET = true')
console.log('6. Run this script again')
console.log('═══════════════════════════════════════════════\n')
