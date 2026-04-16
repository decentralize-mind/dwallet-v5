# 📁 Layer 7 - Root Security Layer Quick Reference

## ✅ Complete Layer 7 Components

### Contracts Folder
```
contracts/layer7/
├── Layer7Security.sol              # Core entry gate & circuit breaker (596 lines)
├── SecurityController.sol          # Threat detection engine (539 lines)
├── SecurityGated.sol               # Base for gated operations (114 lines)
├── EconomicDefenseLayer.sol        # Economic protections (385 lines)
├── README.md                       # Comprehensive guide
└── LAYER7_QUICKREF.md             # This quick reference
```

### Test Folder
```
test/layer7/
└── Layer7Integration.test.cjs      # Integration tests (207 lines)
```

---

## 🚀 Quick Commands

### Run Tests
```bash
npx hardhat test test/layer7/Layer7Integration.test.cjs
```

### View Contract
```bash
cat contracts/layer7/Layer7Security.sol
```

### Read Documentation
```bash
cat contracts/layer7/README.md
```

---

## 📊 What Layer 7 Does

**Role**: ROOT LAYER / ENTRY GATE - Controls EVERYTHING

**Key Functions**:
1. 🔐 **Access Control** - Who can call what
2. 🚨 **Emergency Pause/Shutdown** - Stop all operations
3. ⚡ **Rate Limiting** - Anti-exploit protection
4. 💰 **Economic Defense** - Anti-drain mechanisms
5. 🧠 **Threat Detection** - Real-time scoring (0-100)
6. 🔒 **Circuit Breaker** - Auto-trip on critical threats
7. 👁️ **Monitoring** - User behavior tracking
8. 🛡️ **Validation Gate** - Every transaction must pass

---

## 🔗 How It Works

### Every Transaction Flow:

```
User → Layer7Security.validate() → SecurityController.detect() 
     → EconomicDefense.check() → Execute (if all pass)
```

### Code Example:

```solidity
contract MyProtocol {
    function deposit(address user, uint256 amount) external {
        // Layer 7 checks FIRST
        layer7.validateTransaction(LAYER_ID, user, amount);
        
        // Check threat level
        (ThreatLevel threat,) = securityController.detectAnomaly(
            LAYER_ID, user, amount
        );
        require(threat < ThreatLevel.HIGH, "High threat");
        
        // Check economic limits
        require(econDefense.checkVolumeLimit(user, amount), "Limit exceeded");
        
        // Calculate fee
        uint256 fee = econDefense.calculateDynamicFee(amount);
        
        // Execute
        _processDeposit(user, amount - fee);
    }
}
```

---

## 📁 Complete Layer Structure

Your dWallet v5 now has organized folders for each layer:

```
contracts/
├── layer7/                    ← NEWLY ORGANIZED
│   ├── Layer7Security.sol
│   └── README.md
├── EconomicDefenseLayer.sol   ← NEW
├── InfrastructureSecurity.sol ← NEW
├── SecurityController.sol
├── AnomalyDetector.sol
└── ... (other layers)

test/
├── layer7/                    ← NEWLY ORGANIZED
│   └── Layer7Integration.test.cjs
├── economic/                  ← NEW
├── infrastructure/            ← NEW
├── attacks/
└── ... (other tests)
```

---

## 🎯 Next Steps

1. ✅ Review Layer7Security.sol implementation
2. ✅ Run integration tests
3. ✅ Read README.md for deployment guide
4. ✅ Configure roles and parameters
5. ✅ Set up monitoring alerts
6. ✅ Train team on emergency procedures

---

**Status**: ✅ Organized and Documented  
**Date**: March 31, 2026
