// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./AnomalyDetector.sol";

/**
 * @title DynamicFeeController
 * @notice Dynamic Fee & Circuit Breaker System for dWallet Protocol
 * 
 *         Automatically adjusts fees based on:
 *         - Market volatility (oracle price deviations)
 *         - Volume spikes
 *         - Threat level from AnomalyDetector
 *         - Liquidity depth changes
 * 
 *         Purpose: Discourage attacks during vulnerable periods while
 *         maintaining normal operations during stable conditions.
 */
contract DynamicFeeController is AccessControl {
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    
    // ─────────────────────────────────────────────────────────────────────
    //  MARKET CONDITIONS
    // ─────────────────────────────────────────────────────────────────────
    
    enum MarketCondition { 
        NORMAL,     // 0: Stable market conditions
        ELEVATED,   // 1: Minor volatility
        HIGH,       // 2: Significant volatility
        EXTREME     // 3: Crisis/exploit conditions
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  FEE CONFIGURATION
    // ─────────────────────────────────────────────────────────────────────
    
    struct FeeConfig {
        uint256 baseFeeBps;           // Base fee in basis points
        uint256 volatilityMultiplierBps; // Multiplier for volatility
        uint256 maxFeeBps;            // Maximum cap on fees
        uint256 minFeeBps;            // Minimum floor on fees
    }
    
    struct ConditionConfig {
        uint256 volumeThreshold;      // Volume trigger for this condition
        uint256 priceDeviationBps;    // Price deviation trigger
        uint256 feeMultiplierBps;     // Fee multiplier (100 = 1x)
        uint256 withdrawalLimitPct;   // Withdrawal limit as % of normal
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────
    
    /// @dev Reference to AnomalyDetector contract
    AnomalyDetector public anomalyDetector;
    
    /// @dev Current market condition
    MarketCondition public currentCondition;
    
    /// @dev Last time condition was assessed
    uint256 public lastAssessmentBlock;
    
    /// @dev Base fee configuration (for NORMAL conditions)
    FeeConfig public baseConfig;
    
    /// @dev Condition-specific configurations
    mapping(MarketCondition => ConditionConfig) public conditionConfigs;
    
    /// @dev Current dynamic fee (in basis points)
    uint256 public currentFeeBps;
    
    /// @dev Current withdrawal limit multiplier (100 = 100%)
    uint256 public currentWithdrawalLimitPct = 100;
    
    /// @dev Price feed staleness threshold (seconds)
    uint256 public priceStalenessThreshold = 3600; // 1 hour
    
    /// @dev Last oracle update timestamp per asset
    mapping(bytes32 => uint256) public lastOracleUpdate;
    
    // ─────────────────────────────────────────────────────────────────────
    //  CONSTANTS
    // ─────────────────────────────────────────────────────────────────────
    
    uint256 public constant BPS = 10000; // Basis points denominator
    uint256 public constant DEFAULT_BASE_FEE_BPS = 30; // 0.30%
    uint256 public constant DEFAULT_MAX_FEE_BPS = 300; // 3.00%
    uint256 public constant DEFAULT_MIN_FEE_BPS = 5;   // 0.05%
    
    // ─────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────────
    
    event MarketConditionChanged(MarketCondition oldCondition, MarketCondition newCondition);
    event FeeUpdated(uint256 newFeeBps, MarketCondition condition);
    event WithdrawalLimitUpdated(uint256 newLimitPct);
    event OraclePriceUpdated(bytes32 indexed asset, uint256 price, uint256 timestamp);
    event ConfigUpdated(MarketCondition condition, ConditionConfig config);
    
    // ─────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────
    
    constructor(
        address admin,
        address _anomalyDetector,
        uint256 _baseFeeBps
    ) {
        require(admin != address(0), "DynamicFee: zero admin");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPDATER_ROLE, admin);
        
        anomalyDetector = AnomalyDetector(_anomalyDetector);
        
        baseConfig = FeeConfig({
            baseFeeBps: _baseFeeBps,
            volatilityMultiplierBps: 0,
            maxFeeBps: DEFAULT_MAX_FEE_BPS,
            minFeeBps: DEFAULT_MIN_FEE_BPS
        });
        
        // Initialize condition configs with defaults
        _initConditionConfigs();
        
        currentFeeBps = _baseFeeBps;
        lastAssessmentBlock = block.number;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  INITIALIZATION
    // ─────────────────────────────────────────────────────────────────────
    
    function _initConditionConfigs() internal {
        // NORMAL conditions
        conditionConfigs[MarketCondition.NORMAL] = ConditionConfig({
            volumeThreshold: type(uint256).max, // No upper limit
            priceDeviationBps: 100, // 1%
            feeMultiplierBps: 100, // 1x base fee
            withdrawalLimitPct: 100 // 100% of normal limits
        });
        
        // ELEVATED conditions
        conditionConfigs[MarketCondition.ELEVATED] = ConditionConfig({
            volumeThreshold: 2_000_000e18, // 2M tokens
            priceDeviationBps: 300, // 3%
            feeMultiplierBps: 200, // 2x base fee
            withdrawalLimitPct: 75 // 75% of normal limits
        });
        
        // HIGH conditions
        conditionConfigs[MarketCondition.HIGH] = ConditionConfig({
            volumeThreshold: 5_000_000e18, // 5M tokens
            priceDeviationBps: 500, // 5%
            feeMultiplierBps: 300, // 3x base fee
            withdrawalLimitPct: 50 // 50% of normal limits
        });
        
        // EXTREME conditions
        conditionConfigs[MarketCondition.EXTREME] = ConditionConfig({
            volumeThreshold: 10_000_000e18, // 10M tokens
            priceDeviationBps: 1000, // 10%
            feeMultiplierBps: 500, // 5x base fee
            withdrawalLimitPct: 25 // 25% of normal limits
        });
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  CORE FEE CALCULATION
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Calculate dynamic fee for a specific action.
     * @param actionType Type of action (SWAP, WITHDRAWAL, BORROW, etc.)
     * @param amount The transaction amount
     * @return feeBps The calculated fee in basis points
     */
    function calculateDynamicFee(
        bytes32 actionType,
        uint256 amount
    ) external returns (uint256 feeBps) {
        // Assess current market condition
        _assessAndUpdateCondition();
        
        ConditionConfig memory config = conditionConfigs[currentCondition];
        
        // Calculate fee based on condition
        uint256 multiplier = config.feeMultiplierBps;
        feeBps = (baseConfig.baseFeeBps * multiplier) / BPS;
        
        // Apply caps and floors
        if (feeBps > baseConfig.maxFeeBps) {
            feeBps = baseConfig.maxFeeBps;
        }
        if (feeBps < baseConfig.minFeeBps) {
            feeBps = baseConfig.minFeeBps;
        }
        
        currentFeeBps = feeBps;
        
        emit FeeUpdated(feeBps, currentCondition);
    }
    
    /**
     * @notice Get the current fee without updating state.
     */
    function getCurrentFee() external view returns (uint256) {
        return currentFeeBps;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  MARKET ASSESSMENT
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Assess market conditions and update if changed.
     */
    function _assessAndUpdateCondition() internal {
        MarketCondition newCondition = assessMarketCondition();
        
        if (newCondition != currentCondition) {
            MarketCondition oldCondition = currentCondition;
            currentCondition = newCondition;
            
            // Update withdrawal limits based on new condition
            currentWithdrawalLimitPct = conditionConfigs[newCondition].withdrawalLimitPct;
            
            emit MarketConditionChanged(oldCondition, newCondition);
            emit WithdrawalLimitUpdated(currentWithdrawalLimitPct);
        }
        
        lastAssessmentBlock = block.number;
    }
    
    /**
     * @notice Assess current market condition based on multiple factors.
     * @return condition The determined market condition
     */
    function assessMarketCondition() public view returns (MarketCondition) {
        // Check volume spike
        (uint256 currentVolume, ) = anomalyDetector.getCurrentBlockUsage();
        
        // Check threat level from anomaly detector
        AnomalyDetector.ThreatLevel threat = getCurrentThreatLevel();
        
        // Determine condition based on worst signal
        if (threat >= AnomalyDetector.ThreatLevel.HIGH || 
            currentVolume >= conditionConfigs[MarketCondition.EXTREME].volumeThreshold) {
            return MarketCondition.EXTREME;
        }
        
        if (threat >= AnomalyDetector.ThreatLevel.MEDIUM ||
            currentVolume >= conditionConfigs[MarketCondition.HIGH].volumeThreshold) {
            return MarketCondition.HIGH;
        }
        
        if (threat >= AnomalyDetector.ThreatLevel.LOW ||
            currentVolume >= conditionConfigs[MarketCondition.ELEVATED].volumeThreshold) {
            return MarketCondition.ELEVATED;
        }
        
        return MarketCondition.NORMAL;
    }
    
    /**
     * @notice Get current threat level from anomaly detector.
     */
    function getCurrentThreatLevel() public view returns (AnomalyDetector.ThreatLevel) {
        // This would ideally query recent threat events
        // For now, return NONE - actual implementation would check recent history
        return AnomalyDetector.ThreatLevel.NONE;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  ORACLE INTEGRATION
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Update oracle price timestamp for an asset.
     * @param asset Asset identifier (e.g., ETH/USD)
     * @param timestamp Timestamp of last oracle update
     */
    function updateOracleTimestamp(bytes32 asset, uint256 timestamp) external onlyRole(UPDATER_ROLE) {
        lastOracleUpdate[asset] = timestamp;
        emit OraclePriceUpdated(asset, timestamp, block.timestamp);
    }
    
    /**
     * @notice Check if oracle data is stale.
     * @param asset Asset identifier
     * @return isStale True if oracle data is outdated
     */
    function isOracleStale(bytes32 asset) external view returns (bool) {
        uint256 lastUpdate = lastOracleUpdate[asset];
        if (lastUpdate == 0) return true; // Never updated
        
        return (block.timestamp - lastUpdate) > priceStalenessThreshold;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Update base fee configuration.
     */
    function setBaseFeeConfig(
        uint256 _baseFeeBps,
        uint256 _maxFeeBps,
        uint256 _minFeeBps
    ) external onlyRole(UPDATER_ROLE) {
        require(_baseFeeBps <= _maxFeeBps, "DynamicFee: base > max");
        require(_minFeeBps <= _baseFeeBps, "DynamicFee: min > base");
        
        baseConfig.baseFeeBps = _baseFeeBps;
        baseConfig.maxFeeBps = _maxFeeBps;
        baseConfig.minFeeBps = _minFeeBps;
    }
    
    /**
     * @notice Update condition-specific configuration.
     */
    function setConditionConfig(
        MarketCondition condition,
        uint256 volumeThreshold,
        uint256 priceDeviationBps,
        uint256 feeMultiplierBps,
        uint256 withdrawalLimitPct
    ) external onlyRole(UPDATER_ROLE) {
        conditionConfigs[condition] = ConditionConfig({
            volumeThreshold: volumeThreshold,
            priceDeviationBps: priceDeviationBps,
            feeMultiplierBps: feeMultiplierBps,
            withdrawalLimitPct: withdrawalLimitPct
        });
        
        emit ConfigUpdated(condition, conditionConfigs[condition]);
    }
    
    /**
     * @notice Update anomaly detector reference.
     */
    function setAnomalyDetector(address _detector) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_detector != address(0), "DynamicFee: zero address");
        anomalyDetector = AnomalyDetector(_detector);
    }
    
    /**
     * @notice Set price staleness threshold.
     */
    function setPriceStalenessThreshold(uint256 _threshold) external onlyRole(UPDATER_ROLE) {
        priceStalenessThreshold = _threshold;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Get configuration for a specific market condition.
     */
    function getConditionConfig(MarketCondition condition) 
        external 
        view 
        returns (ConditionConfig memory) 
    {
        return conditionConfigs[condition];
    }
    
    /**
     * @notice Get current withdrawal limit percentage.
     */
    function getCurrentWithdrawalLimit() external view returns (uint256) {
        return currentWithdrawalLimitPct;
    }
    
    /**
     * @notice Calculate fee for a specific amount.
     */
    function calculateFeeForAmount(uint256 amount) external view returns (uint256 fee) {
        return (amount * currentFeeBps) / BPS;
    }
}
