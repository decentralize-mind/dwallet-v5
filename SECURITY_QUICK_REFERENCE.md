# 🔐 Security Features Quick Reference

## Using the New Security Features

### 1. **Secure Key Management**

```javascript
import { 
  withPrivateKey, 
  maskPrivateKey, 
  sanitizeError,
  logKeyUsage 
} from './utils/secureKeyManagement'

// ✅ Secure way to use private key
await withPrivateKey(encryptedKey, password, async (key) => {
  // Key is only available in this scope
  const tx = await signTransaction(key, txData)
  return tx
})
// Key is automatically cleared from memory

// ✅ Safe error logging
try {
  // ... transaction code
} catch (err) {
  const safeError = sanitizeError(err)
  console.error('Transaction failed:', safeError)
}

// ✅ Log key usage
logKeyUsage('send_transaction', address)
```

---

### 2. **Swap with Deadline**

```javascript
// In SwapModal.jsx - Users can now select deadline
const [deadline, setDeadline] = useState(20) // minutes

// Deadline options: 10m, 20m, 30m
// Automatically included in swap transaction
{
  tokenIn: 'ETH',
  tokenOut: 'USDC',
  deadline: Math.floor(Date.now() / 1000) + (20 * 60), // 20 minutes
  // ...
}
```

---

### 3. **Hardware Wallet Integration**

```javascript
import { 
  connectLedger, 
  getLedgerAddress,
  signWithLedger 
} from './utils/hardwareWallet'

// Connect to Ledger
const ledger = await connectLedger()

// Get address
const address = await getLedgerAddress(ledger.eth, "44'/60'/0'/0/0")

// Sign transaction (private key stays on device)
const signature = await signWithLedger(ledger.eth, path, tx)
```

---

### 4. **MEV Protection**

```javascript
import { 
  detectSandwichVulnerability,
  assessPriceImpact,
  generateMEVProtectionReport 
} from './utils/mevProtection'

// Check for MEV risks
const mevCheck = detectSandwichVulnerability({
  tokenIn: 'ETH',
  tokenOut: 'USDC',
  slippage: 0.5,
  amountUSD: 50000,
  poolLiquidity: 1000000,
})

if (mevCheck.riskLevel === 'high') {
  // Warn user or require confirmation
  console.warn('High MEV risk:', mevCheck.vulnerabilities)
}

// Full MEV report
const report = generateMEVProtectionReport({
  tokenIn: 'ETH',
  tokenOut: 'USDC',
  slippage: 0.5,
  amountUSD: 50000,
  poolLiquidity: 1000000,
  priceImpact: 0.5,
})

console.log('Protection Score:', report.protectionScore) // 0-100
```

---

### 5. **Transaction Validation**

```javascript
import { validateTransaction } from './utils/transactionValidation'

// Validate before sending
const validation = await validateTransaction({
  from: '0x123...',
  to: '0x456...',
  amount: 1.5,
  token: 'ETH',
  chain: 'ethereum',
  balance: 2.0,
  gasInfo: { gwei: 50, ethCost: 0.002 },
  price: 3000,
  transactionHistory: [...],
})

if (!validation.valid) {
  // Block transaction
  throw new Error(validation.errors.join('\n'))
}

if (validation.requiresConfirmation) {
  // Show additional confirmation
  console.warn('High risk transaction:', validation.warnings)
}

// Check risk level
console.log('Risk Score:', validation.riskScore) // 0-100
console.log('Risk Level:', validation.riskLevel) // minimal/low/medium/high/critical
```

---

## Transaction Limits

| Limit Type | Value |
|------------|-------|
| Max Single Transaction | $100,000 |
| Max Daily Volume | $250,000 |
| Max Transactions/Hour | 10 |
| Max Transactions/Day | 50 |
| Minimum Balance (ETH) | 0.01 ETH |
| Max Gas Price | 500 Gwei |
| Max Priority Fee | 50 Gwei |

---

## Risk Score Guide

| Score | Level | Action |
|-------|-------|--------|
| 0-19 | Minimal | ✅ Auto-approve |
| 20-39 | Low | ✅ Auto-approve |
| 40-59 | Medium | ⚠️ Show warnings |
| 60-79 | High | 🔒 Require confirmation |
| 80-100 | Critical | ❌ Block transaction |

---

## MEV Risk Levels

| Risk Level | Criteria | Recommendation |
|------------|----------|----------------|
| **Low** | <$10k, <0.5% slippage | ✅ Safe to proceed |
| **Medium** | $10k-$50k or 0.5-1% slippage | ⚠️ Consider reducing size |
| **High** | >$50k or >1% slippage | 🔒 Use Flashbots or split |

---

## Security Checklist Before Sending

- [x] Address validated and not blacklisted
- [x] Amount within limits
- [x] Sufficient balance for transfer + gas
- [x] Gas price reasonable (<200 Gwei)
- [x] MEV risk assessed
- [x] Deadline set (for swaps)
- [x] Transaction history checked
- [x] Risk score acceptable (<80)

---

## Common Error Messages

### Validation Errors
- `"Invalid Ethereum address format"` → Check address is 0x + 40 hex chars
- `"Insufficient ETH balance"` → Check balance covers amount + gas
- `"Transaction exceeds maximum single transaction limit"` → Reduce amount
- `"Recipient address is blacklisted"` → Cannot send to this address

### MEV Warnings
- `"High slippage (2%) makes you vulnerable to sandwich attacks"` → Reduce slippage
- `"Large transaction ($75,000) is attractive to MEV bots"` → Split into smaller trades
- `"This token pair has high MEV activity"` → Use private submission

### Security Warnings
- `"High risk transaction detected"` → Review transaction carefully
- `"First time sending to this address"` → Double-check address
- `"You've sent 3 transactions to this address in the last hour"` → Verify not a scam

---

## Best Practices

### For Developers
1. Always use `withPrivateKey()` for ephemeral key access
2. Sanitize all error messages with `sanitizeError()`
3. Validate transactions before sending
4. Check MEV risks for swaps
5. Log all key usage for auditing
6. Set appropriate deadlines for swaps
7. Use hardware wallets when available

### For Users
1. Verify recipient address before sending
2. Use hardware wallets for large amounts
3. Keep slippage low (0.5% or less)
4. Set appropriate deadlines (20-30 min)
5. Monitor transaction history
6. Enable biometric authentication
7. Never share your password

---

## Need Help?

- Check `SECURITY_IMPROVEMENTS.md` for full documentation
- Review utility files in `src/utils/`
- Check console logs for security warnings
- Monitor risk scores and MEV assessments

---

*Quick Reference v1.0 - April 15, 2026*
