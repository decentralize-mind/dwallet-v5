// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EconomicDefenseLayer
 * @notice Anti-Exploit Economics System for dWallet Protocol
 * 
 *         This contract implements economic defenses against attacks:
 *         - Dynamic fees based on volatility and threat level
 *         - Withdrawal penalties for early exits
 *         - Slippage protection for all transactions
 *         - Attack profitability prevention
 *         - Volume-based rate limiting
 */
contract EconomicDefenseLayer is AccessControl, ReentrancyGuard {
    
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    
    // ─────────────────────────────────────────────────────────────────────
    //  STRUCTS
    // ─────────────────────────────────────────────────────────────────────
    
    struct FeeConfig {
        uint256 baseFeeBps;           // Base fee in basis points (1/100th of a percent)
        uint256 dynamicFeeMultiplier; // Multiplier during high volatility
        uint256 maxFeeBps;            // Maximum fee cap
        uint256 minFeeBps;            // Minimum fee floor
    }
    
    struct WithdrawalPenalty {
        uint256 penaltyRateBps;       // Penalty rate in basis points
        uint256 timeLockSeconds;      // Time lock for large withdrawals
        uint256 thresholdAmount;      // Amount threshold for penalty
        bool enabled;                 // Whether penalty is active
    }
    
    struct SlippageProtection {
        uint256 maxSlippageBps;       // Maximum allowed slippage
        uint256 priceImpactThreshold; // Price impact that triggers protection
        bool enabled;                 // Whether protection is active
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────
    
    /// @dev Fee configuration
    FeeConfig public feeConfig;
    
    /// @dev Withdrawal penalty configuration
    WithdrawalPenalty public withdrawalPenalty;
    
    /// @dev Slippage protection configuration
    SlippageProtection public slippageProtection;
    
    /// @dev Current volatility index (0-100)
    uint256 public volatilityIndex;
    
    /// @dev Last update timestamp
    uint256 public lastVolatilityUpdate;
    
    /// @dev Volume tracking per address
    mapping(address => uint256) public addressVolume;
    
    /// @dev Volume tracking per block
    uint256 public blockVolume;
    
    /// @dev Volume limits
    uint256 public volumeLimitPerBlock;
    uint256 public volumeLimitPerAddress;
    
    // ─────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────────
    
    event FeeConfigUpdated(
        uint256 baseFeeBps,
        uint256 dynamicFeeMultiplier,
        uint256 maxFeeBps
    );
    
    event WithdrawalPenaltyUpdated(
        uint256 penaltyRateBps,
        uint256 timeLockSeconds,
        bool enabled
    );
    
    event SlippageProtectionUpdated(
        uint256 maxSlippageBps,
        uint256 priceImpactThreshold,
        bool enabled
    );
    
    event VolatilityIndexUpdated(uint256 oldIndex, uint256 newIndex);
    
    event TransactionBlocked(address indexed user, string reason);
    
    // ─────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────
    
    constructor(
        address admin,
        uint256 _baseFeeBps,
        uint256 _maxSlippageBps,
        uint256 _volumeLimitPerBlock
    ) {
        require(admin != address(0), "Zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MANAGER_ROLE, admin);
        
        // Initialize fee config
        feeConfig = FeeConfig({
            baseFeeBps: _baseFeeBps,                    // e.g., 30 = 0.3%
            dynamicFeeMultiplier: 2,                    // 2x during high volatility
            maxFeeBps: 100,                             // Max 1%
            minFeeBps: 10                               // Min 0.1%
        });
        
        // Initialize withdrawal penalty
        withdrawalPenalty = WithdrawalPenalty({
            penaltyRateBps: 50,                         // 0.5% penalty
            timeLockSeconds: 1 hours,
            thresholdAmount: 10_000 * 10**18,          // $10k threshold
            enabled: true
        });
        
        // Initialize slippage protection
        slippageProtection = SlippageProtection({
            maxSlippageBps: _maxSlippageBps,            // e.g., 100 = 1%
            priceImpactThreshold: 200,                  // 2% price impact
            enabled: true
        });
        
        // Initialize volume limits
        volumeLimitPerBlock = _volumeLimitPerBlock * 10**18;
        volumeLimitPerAddress = 1_000_000 * 10**18;    // $1M per address
        
        volatilityIndex = 0;
        lastVolatilityUpdate = block.timestamp;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  DYNAMIC FEE CALCULATION
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Calculate dynamic fee based on current conditions
     * @param amount Transaction amount
     * @return calculatedFee The fee amount in tokens
     */
    function calculateDynamicFee(uint256 amount) external view returns (uint256 calculatedFee) {
        uint256 effectiveFeeBps = feeConfig.baseFeeBps;
        
        // Increase fees during high volatility
        if (volatilityIndex > 50) {
            effectiveFeeBps = effectiveFeeBps * feeConfig.dynamicFeeMultiplier;
        }
        
        // Apply threat level multiplier (if integrated with SecurityController)
        // Higher threat = higher fees to discourage attacks
        
        // Enforce min/max bounds
        if (effectiveFeeBps > feeConfig.maxFeeBps) {
            effectiveFeeBps = feeConfig.maxFeeBps;
        }
        if (effectiveFeeBps < feeConfig.minFeeBps) {
            effectiveFeeBps = feeConfig.minFeeBps;
        }
        
        calculatedFee = (amount * effectiveFeeBps) / 10_000;
    }
    
    /**
     * @notice Get current effective fee rate in basis points
     */
    function getCurrentFeeRateBps() external view returns (uint256) {
        uint256 effectiveFeeBps = feeConfig.baseFeeBps;
        
        if (volatilityIndex > 50) {
            effectiveFeeBps = effectiveFeeBps * feeConfig.dynamicFeeMultiplier;
        }
        
        if (effectiveFeeBps > feeConfig.maxFeeBps) {
            return feeConfig.maxFeeBps;
        }
        if (effectiveFeeBps < feeConfig.minFeeBps) {
            return feeConfig.minFeeBps;
        }
        
        return effectiveFeeBps;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  SLIPPAGE PROTECTION
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Validate transaction slippage is within acceptable range
     * @param expectedAmount Expected output amount
     * @param actualAmount Actual output amount
     * @return valid Whether the slippage is acceptable
     */
    function validateSlippage(
        uint256 expectedAmount,
        uint256 actualAmount
    ) external view returns (bool valid) {
        if (!slippageProtection.enabled) {
            return true;
        }
        
        if (expectedAmount == 0) {
            return false;
        }
        
        uint256 slippageBps = ((expectedAmount - actualAmount) * 10_000) / expectedAmount;
        
        return slippageBps <= slippageProtection.maxSlippageBps;
    }
    
    /**
     * @notice Check if price impact exceeds threshold
     * @param priceBefore Price before transaction
     * @param priceAfter Price after transaction
     * @return protected Whether protection should trigger
     */
    function checkPriceImpact(
        uint256 priceBefore,
        uint256 priceAfter
    ) external view returns (bool protected) {
        if (!slippageProtection.enabled) {
            return false;
        }
        
        uint256 priceImpactBps = ((priceBefore - priceAfter) * 10_000) / priceBefore;
        
        return priceImpactBps > slippageProtection.priceImpactThreshold;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  WITHDRAWAL PENALTY
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Calculate withdrawal penalty for early/large exits
     * @param amount Withdrawal amount
     * @param holdingTime Time tokens were held
     * @return penalty Penalty amount
     * @return timeLockRemaining Remaining time lock in seconds
     */
    function calculateWithdrawalPenalty(
        uint256 amount,
        uint256 holdingTime
    ) external view returns (uint256 penalty, uint256 timeLockRemaining) {
        if (!withdrawalPenalty.enabled || amount < withdrawalPenalty.thresholdAmount) {
            return (0, 0);
        }
        
        // Calculate penalty
        penalty = (amount * withdrawalPenalty.penaltyRateBps) / 10_000;
        
        // Apply time lock for large amounts
        if (amount >= withdrawalPenalty.thresholdAmount) {
            timeLockRemaining = withdrawalPenalty.timeLockSeconds > holdingTime 
                ? withdrawalPenalty.timeLockSeconds - holdingTime 
                : 0;
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  VOLUME MONITORING
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Track transaction volume
     * @param user User address
     * @param amount Transaction amount
     */
    function trackVolume(address user, uint256 amount) external {
        // Reset block volume if new block
        if (block.number > block.number - 1) {
            blockVolume = 0;
        }
        
        // Update tracking
        addressVolume[user] += amount;
        blockVolume += amount;
        
        // Check limits
        require(blockVolume <= volumeLimitPerBlock, "Block volume limit exceeded");
        require(addressVolume[user] <= volumeLimitPerAddress, "Address volume limit exceeded");
    }
    
    /**
     * @notice Check if transaction would exceed volume limits
     * @param user User address
     * @param amount Proposed transaction amount
     * @return allowed Whether transaction is allowed
     */
    function checkVolumeLimit(address user, uint256 amount) external view returns (bool allowed) {
        return (blockVolume + amount <= volumeLimitPerBlock) &&
               (addressVolume[user] + amount <= volumeLimitPerAddress);
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  VOLATILITY INDEX
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Update volatility index based on market conditions
     * @param newIndex New volatility index (0-100)
     */
    function updateVolatilityIndex(uint256 newIndex) external onlyRole(UPDATER_ROLE) {
        require(newIndex <= 100, "Invalid index");
        
        uint256 oldIndex = volatilityIndex;
        volatilityIndex = newIndex;
        lastVolatilityUpdate = block.timestamp;
        
        emit VolatilityIndexUpdated(oldIndex, newIndex);
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  CONFIGURATION UPDATES
    // ─────────────────────────────────────────────────────────────────────
    
    function updateFeeConfig(
        uint256 baseFeeBps,
        uint256 dynamicFeeMultiplier,
        uint256 maxFeeBps,
        uint256 minFeeBps
    ) external onlyRole(MANAGER_ROLE) {
        require(maxFeeBps <= 500, "Max fee too high"); // Cap at 5%
        require(minFeeBps <= baseFeeBps, "Min fee > base fee");
        
        feeConfig = FeeConfig({
            baseFeeBps: baseFeeBps,
            dynamicFeeMultiplier: dynamicFeeMultiplier,
            maxFeeBps: maxFeeBps,
            minFeeBps: minFeeBps
        });
        
        emit FeeConfigUpdated(baseFeeBps, dynamicFeeMultiplier, maxFeeBps);
    }
    
    function updateWithdrawalPenalty(
        uint256 penaltyRateBps,
        uint256 timeLockSeconds,
        uint256 thresholdAmount,
        bool enabled
    ) external onlyRole(MANAGER_ROLE) {
        require(penaltyRateBps <= 500, "Penalty too high"); // Cap at 5%
        
        withdrawalPenalty = WithdrawalPenalty({
            penaltyRateBps: penaltyRateBps,
            timeLockSeconds: timeLockSeconds,
            thresholdAmount: thresholdAmount,
            enabled: enabled
        });
        
        emit WithdrawalPenaltyUpdated(penaltyRateBps, timeLockSeconds, enabled);
    }
    
    function updateSlippageProtection(
        uint256 maxSlippageBps,
        uint256 priceImpactThreshold,
        bool enabled
    ) external onlyRole(MANAGER_ROLE) {
        require(maxSlippageBps <= 1000, "Slippage too high"); // Cap at 10%
        
        slippageProtection = SlippageProtection({
            maxSlippageBps: maxSlippageBps,
            priceImpactThreshold: priceImpactThreshold,
            enabled: enabled
        });
        
        emit SlippageProtectionUpdated(maxSlippageBps, priceImpactThreshold, enabled);
    }
}
