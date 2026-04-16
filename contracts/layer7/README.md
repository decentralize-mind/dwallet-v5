# 🛡️ Layer 7 - Root Security Layer (Entry Gate)

## 📋 Overview

Layer 7 is the **ROOT LAYER / ENTRY GATE** of the dWallet v5 protocol's 10-layer security architecture. It controls **EVERYTHING** that happens in the system.

**Components:**
- ✅ **Layer7Security.sol** - Core access control & circuit breaker
- ✅ **SecurityController.sol** - Threat detection & scoring engine
- ✅ **SecurityGated.sol** - Base contract for gated operations
- ✅ **EconomicDefenseLayer.sol** - Anti-exploit economic protections

**Key Features:**
- Real-time anomaly detection
- Automated circuit breaker triggers
- Access control (who can call what)
- Emergency pause / shutdown
- Rate limiting / anti-exploit
- Economic protections (anti-drain)

---

## 📁 File Structure

```
layer7/
├── Layer7Security.sol              # Core entry gate & circuit breaker
├── SecurityController.sol          # Threat detection engine
├── SecurityGated.sol               # Base contract for gated contracts
├── EconomicDefenseLayer.sol        # Economic defense mechanisms
├── README.md                       # This comprehensive guide
└── LAYER7_QUICKREF.md             # Quick reference card

test/layer7/
└── Layer7Integration.test.cjs      # Integration tests
```

---

## 🔧 Contract Details

### 1️⃣ Layer7Security.sol - Core Entry Gate

**Purpose**: Main entry point that controls all system access

**Key Features:**
- ✅ Circuit breaker with automatic trip mechanism
- ✅ Emergency pause / shutdown functionality
- ✅ Threat level monitoring (NONE → LOW → MEDIUM → HIGH → CRITICAL)
- ✅ Integration with SecurityController and AnomalyDetector
- ✅ Multi-sig protection for critical operations
- ✅ Acts as gatekeeper for ALL contract interactions

**Main Functions:**
```solidity
// Trip circuit breaker (emergency only)
function tripCircuitBreaker(string memory reason) external onlyRole(PAUSER_ROLE)

// Emergency pause
function emergencyPause() external onlyRole(PAUSER_ROLE)

// Resume operations
function resumeOperations() external onlyRole(DEFAULT_ADMIN_ROLE)

// Check if circuit is broken
function circuitBroken() public view returns (bool)

// Get current threat level
function getCurrentThreatLevel() external view returns (uint256)

// Validate transaction (called by other contracts)
function validateTransaction(bytes32 layerId, address user, uint256 amount) external view
```

**Access Control:**
- `DEFAULT_ADMIN_ROLE` - Full control
- `PAUSER_ROLE` - Can trigger emergency actions
- `OPERATOR_ROLE` - Can update operational parameters

---

### 2️⃣ SecurityController.sol - Threat Detection Engine

**Purpose**: Real-time threat detection and scoring

**Key Features:**
- ✅ User behavior tracking
- ✅ Activity window analysis
- ✅ Threat score calculation (0-100)
- ✅ Watchlist management
- ✅ Auto-response engine
- ✅ Global threat level assessment

**Main Functions:**
```solidity
// Detect anomaly and return threat level
function detectAnomaly(
    bytes32 layerId,
    address user,
    uint256 amount
) external returns (ThreatLevel, uint256 score)

// Calculate threat score based on multiple factors
function _calculateThreatScore(address user, bytes32 layerId, uint256 amount) internal view

// Automatic response to threats
function _autoRespond(address user, ThreatLevel level) internal

// Add/remove from watchlist
function addToWatchlist(address user) external onlyRole(OPERATOR_ROLE)
function removeFromWatchlist(address user) external onlyRole(OPERATOR_ROLE)
```

**Threat Levels:**
- NONE (0-30): Normal operations
- LOW (31-50): Increased monitoring
- MEDIUM (51-70): Enhanced scrutiny
- HIGH (71-90): Restrictive measures
- CRITICAL (91-100): Circuit breaker trip

---

### 3️⃣ SecurityGated.sol - Base Contract for Gated Operations

**Purpose**: Base contract that enforces Layer 7 checks

**Key Features:**
- ✅ Inheritance of security checks
- ✅ Automatic validation before execution
- ✅ Reverts on circuit break
- ✅ Integrates with Layer7Security

**Usage Pattern:**
```solidity
contract MyContract is SecurityGated {
    function executeAction(address user, uint256 amount) external {
        // Automatically checks:
        // - Circuit not broken
        // - User not restricted
        // - Within rate limits
        
        super._beforeExecution(LAYER_ID, user, amount);
        
        // ... action logic
    }
}
```

---

### 4️⃣ EconomicDefenseLayer.sol - Anti-Exploit Economics

**Purpose**: Economic protections against attacks

**Key Features:**
- ✅ Dynamic fees based on volatility (0.1% - 1%)
- ✅ Withdrawal penalties for early exits
- ✅ Slippage protection (max 1%)
- ✅ Volume monitoring ($1M/block limit)
- ✅ Attack profitability prevention
- ✅ Volatility index tracking (0-100)

**Main Functions:**
```solidity
// Calculate dynamic fee based on conditions
function calculateDynamicFee(uint256 amount) external view returns (uint256)

// Validate slippage is acceptable
function validateSlippage(uint256 expected, uint256 actual) external view returns (bool)

// Calculate withdrawal penalty
function calculateWithdrawalPenalty(uint256 amount, uint256 holdingTime) 
    external view returns (uint256 penalty, uint256 timeLock)

// Check volume limits
function checkVolumeLimit(address user, uint256 amount) external view returns (bool)

// Track transaction volume
function trackVolume(address user, uint256 amount) external
```

**Economic Defenses:**
- **Dynamic Fees**: Increase during high volatility to discourage attacks
- **Withdrawal Penalties**: 0.5% for large early withdrawals (>$10k)
- **Slippage Protection**: Blocks transactions with >1% slippage
- **Volume Limits**: Prevents rapid draining ($1M/block, $1M/address)

---

## 🧪 Testing

### Run Tests

```bash
npx hardhat test test/layer7/Layer7Integration.test.cjs
```

### Test Coverage

The integration tests cover:
- ✅ Circuit breaker triggering
- ✅ Emergency pause functionality
- ✅ Threat level detection
- ✅ Role-based access control
- ✅ Recovery procedures
- ✅ Integration with other security layers

---

## 🔗 How Layer 7 Controls Everything

**CRITICAL**: Every contract must check with Layer 7 before executing.

### Architecture Flow

```
User Transaction
    ↓
Layer7Security.validateTransaction()
    ↓
├─→ Circuit Breaker Check (not broken?)
├─→ SecurityController.detectAnomaly() → Threat Score
├─→ EconomicDefenseLayer.checkVolumeLimit() → Volume OK?
└─→ SecurityGated._beforeExecution() → All checks pass?
    ↓
Execute Transaction (if all pass)
```

---

### Integration Pattern 1: Direct Validation

```solidity
// In ANY contract that executes transactions
import "./layer7/Layer7Security.sol";
import "./layer7/SecurityController.sol";
import "./layer7/EconomicDefenseLayer.sol";

contract MyProtocol {
    Layer7Security public layer7;
    SecurityController public securityController;
    EconomicDefenseLayer public economicDefense;
    
    function deposit(address user, uint256 amount) external {
        // STEP 1: Validate through Layer 7
        layer7.validateTransaction(LAYER_ID, user, amount);
        
        // STEP 2: Check threat level
        (ThreatLevel threat, uint256 score) = securityController.detectAnomaly(
            LAYER_ID,
            user,
            amount
        );
        
        require(threat < ThreatLevel.HIGH, "High threat detected");
        
        // STEP 3: Check economic limits
        require(economicDefense.checkVolumeLimit(user, amount), "Volume limit exceeded");
        
        // STEP 4: Calculate and collect fees
        uint256 fee = economicDefense.calculateDynamicFee(amount);
        require(amount + fee <= userBalance[user], "Insufficient balance");
        
        // STEP 5: Track volume
        economicDefense.trackVolume(user, amount);
        
        // STEP 6: Execute actual logic
        _executeDeposit(user, amount - fee);
    }
}
```

---

### Integration Pattern 2: Inheritance (Recommended)

```solidity
// Inherit from SecurityGated for automatic checks
import "./layer7/SecurityGated.sol";

contract MyProtocol is SecurityGated {
    constructor(address layer7Address) SecurityGated(layer7Address) {}
    
    function withdraw(address user, uint256 amount) external {
        // Automatic checks happen in _beforeExecution():
        // - Circuit not broken
        // - User not on watchlist
        // - Within rate limits
        // - Threat level acceptable
        
        super._beforeExecution(LAYER_ID, user, amount);
        
        // Your logic here - all security checks already passed!
        _executeWithdraw(user, amount);
    }
}
```

---

### Integration Pattern 3: Off-chain Monitoring

```javascript
// Off-chain bot monitors and can trigger circuit breaker
const { ethers } = require("hardhat");

async function monitorAndProtect() {
    const layer7 = await ethers.getContractAt("Layer7Security", LAYER7_ADDRESS);
    const anomalyDetector = await ethers.getContractAt("AnomalyDetector", ANOMALY_ADDRESS);
    
    // Monitor in real-time
    anomalyDetector.on("AnomalyDetected", async (layerId, user, amount, level, reason) => {
        console.log(`🚨 Anomaly: ${reason}`);
        
        if (level >= 4) { // CRITICAL
            console.log("⚠️ TRIGGERING CIRCUIT BREAKER");
            const tx = await layer7.tripCircuitBreaker(reason);
            await tx.wait();
        }
    });
}
```

---

## 🚨 Emergency Procedures

### When to Trip Circuit Breaker

Use ONLY in these scenarios:
1. **Active exploit detected** (e.g., draining of funds)
2. **Critical anomaly** (threat score > 90)
3. **Oracle manipulation** (price feeds compromised)
4. **Infrastructure failure** (multiple critical components down)
5. **Governance emergency decision**

### How to Trip

```javascript
// Via transaction
const tx = await layer7Security.tripCircuitBreaker("Emergency reason");
await tx.wait();

// System will automatically:
// - Pause all operations
// - Block new transactions
// - Emit events
// - Alert monitors
```

### Recovery Process

1. **Assess situation** - Determine root cause
2. **Fix underlying issue** - Deploy patch if needed
3. **Multi-sig approval** - Get required signatures
4. **Resume operations** - Call `resumeOperations()`
5. **Monitor closely** - Watch for recurrence

---

## 📊 Threat Levels

| Level | Score Range | Action |
|-------|-------------|--------|
| NONE | 0-30 | Normal operations |
| LOW | 31-50 | Increased monitoring |
| MEDIUM | 51-70 | Enhanced scrutiny |
| HIGH | 71-90 | Restrictive measures |
| CRITICAL | 91-100 | Circuit breaker trip |

---

## 🔧 Configuration

### Initial Setup

```javascript
const Layer7Security = await ethers.getContractFactory("Layer7Security");
const layer7 = await Layer7Security.deploy(
    adminAddress,           // DEFAULT_ADMIN_ROLE
    pauserAddress,          // PAUSER_ROLE  
    operatorAddress,        // OPERATOR_ROLE
    securityControllerAddr, // SecurityController reference
    anomalyDetectorAddr     // AnomalyDetector reference
);
await layer7.waitForDeployment();
```

### Update Parameters

```javascript
// Enable/disable auto-response
await layer7.setAutoResponseEnabled(true);

// Update threat thresholds
await layer7.updateThreatThresholds(30, 50, 70, 90);

// Set cooldown period (seconds)
await layer7.setCircuitBreakerCooldown(3600); // 1 hour
```

---

## 📈 Monitoring

### Key Events to Watch

```solidity
// Circuit breaker tripped
event CircuitBreakerTripped(address indexed account, string reason, uint256 timestamp);

// Operations resumed
event OperationsResumed(uint256 timestamp);

// Threat level changed
event ThreatLevelChanged(ThreatLevel oldLevel, ThreatLevel newLevel);

// Emergency pause activated
event EmergencyPauseActivated(address indexed account, uint256 timestamp);
```

### Monitoring Script

```javascript
// Listen for events
layer7.on("CircuitBreakerTripped", (account, reason, timestamp) => {
    console.log(`🚨 CIRCUIT BREAKER TRIPPED!`);
    console.log(`By: ${account}`);
    console.log(`Reason: ${reason}`);
    console.log(`Time: ${new Date(timestamp * 1000)}`);
    
    // Send alerts
    sendTelegramAlert(`🚨 Emergency: ${reason}`);
});
```

---

## 🔐 Security Considerations

### Access Control

- ✅ Only `PAUSER_ROLE` can trip circuit breaker
- ✅ Only `DEFAULT_ADMIN_ROLE` can resume operations
- ✅ Multi-sig recommended for admin role
- ✅ Timelock on sensitive operations

### Best Practices

1. **Limit PAUSER_ROLE** - Only give to trusted addresses
2. **Use multi-sig** - For DEFAULT_ADMIN_ROLE
3. **Set up monitoring** - Real-time alerts essential
4. **Test regularly** - Run emergency drills
5. **Document incidents** - Keep detailed records

---

## 🧩 Related Contracts

Layer 7 integrates with:

- **SecurityController** - Threat detection and scoring
- **AnomalyDetector** - Real-time anomaly monitoring
- **EconomicDefenseLayer** - Economic attack prevention
- **InfrastructureSecurity** - Infrastructure health checks

---

## 📖 Additional Resources

- **Full Security Guide**: `/COMPLETE_SECURITY_SYSTEMS_GUIDE.md`
- **Implementation Summary**: `/IMPLEMENTATION_COMPLETE_SUMMARY.md`
- **Attack Simulations**: `/test/attacks/`
- **Monitoring System**: `/monitoring/anomaly-detector.js`

---

## 🎯 Deployment Checklist

- [ ] Deploy Layer7Security contract
- [ ] Configure roles (admin, pauser, operator)
- [ ] Set SecurityController address
- [ ] Set AnomalyDetector address
- [ ] Test circuit breaker functionality
- [ ] Test emergency pause
- [ ] Test recovery process
- [ ] Set up event monitoring
- [ ] Configure alert channels
- [ ] Document emergency procedures
- [ ] Train operations team

---

**Status**: ✅ Deployed and Tested  
**Security Level**: Production Ready  
**Last Updated**: March 31, 2026
