// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AnomalyDetector
 * @notice Real-Time Anomaly Detection System for dWallet Protocol
 * 
 *         This contract monitors protocol activity and detects suspicious patterns:
 *         - Volume spikes (unusual transaction amounts)
 *         - Transaction frequency anomalies
 *         - Price deviation alerts
 *         - Whale activity monitoring
 *         - Unusual user behavior patterns
 * 
 *         Integration: Works with Layer7Security to auto-trigger circuit breakers
 */
contract AnomalyDetector is AccessControl {
    
    bytes32 public constant MONITOR_ROLE = keccak256("MONITOR_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    
    // ─────────────────────────────────────────────────────────────────────
    //  THREAT LEVELS
    // ─────────────────────────────────────────────────────────────────────
    
    enum ThreatLevel { 
        NONE,      // 0: Normal activity
        LOW,       // 1: Minor anomaly (monitoring only)
        MEDIUM,    // 2: Suspicious activity (increased scrutiny)
        HIGH,      // 3: Likely attack (restrictive measures)
        CRITICAL   // 4: Active exploit (emergency response)
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  ACTIVITY METRICS
    // ─────────────────────────────────────────────────────────────────────
    
    struct ActivityMetrics {
        uint256 volumeLastBlock;
        uint256 txCountLastBlock;
        uint256 uniqueUsersLastHour;
        uint256 avgTransactionSize;
        uint256 priceDeviationBps;
        uint256 largeTxCount;
        uint256 failedTxCount;
    }
    
    struct UserMetrics {
        uint256 txCount;
        uint256 totalVolume;
        uint256 lastActivityBlock;
        bool isNewUser;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  THRESHOLDS & CONFIGURATION
    // ─────────────────────────────────────────────────────────────────────
    
    /// @dev Volume thresholds (in token decimals)
    uint256 public maxVolumePerBlock;
    uint256 public normalVolumePerBlock;
    
    /// @dev Transaction count thresholds
    uint256 public maxTxPerBlock;
    uint256 public normalTxPerBlock;
    
    /// @dev Price deviation threshold (in basis points, 100 = 1%)
    uint256 public maxPriceDeviationBps;
    
    /// @dev Large transaction threshold
    uint256 public largeTxThreshold;
    
    /// @dev Dynamic baseline multipliers (percentage-based, 100 = 1x)
    uint256 public volumeSpikeMultiplier = 500;  // 5x normal volume
    uint256 public txSpikeMultiplier = 300;      // 3x normal tx count
    
    /// @dev Auto-pause threat level threshold
    ThreatLevel public autoPauseThreshold = ThreatLevel.CRITICAL;
    
    // ─────────────────────────────────────────────────────────────────────
    //  HISTORICAL DATA STORAGE
    // ─────────────────────────────────────────────────────────────────────
    
    /// @dev Block-by-block volume tracking
    mapping(uint256 => uint256) public volumeByBlock;
    
    /// @dev Block-by-block transaction count
    mapping(uint256 => uint256) public txCountByBlock;
    
    /// @dev Per-user activity tracking
    mapping(address => UserMetrics) public userMetrics;
    
    /// @dev Layer-specific metrics (layerId => metrics)
    mapping(bytes32 => ActivityMetrics) public layerMetrics;
    
    /// @dev Historical baselines (updated every 100 blocks)
    uint256 public baselineVolume;
    uint256 public baselineTxCount;
    uint256 public baselineAvgTxSize;
    uint256 public lastBaselineUpdateBlock;
    
    /// @dev Recent threat history
    struct ThreatEvent {
        uint256 timestamp;
        ThreatLevel level;
        bytes32 layerId;
        address user;
        uint256 amount;
        string reason;
    }
    
    ThreatEvent[] public threatHistory;
    
    // ─────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────────
    
    event AnomalyDetected(
        bytes32 indexed layerId,
        address indexed user,
        uint256 amount,
        ThreatLevel level,
        string reason
    );
    
    event ThresholdsUpdated(
        uint256 maxVolume,
        uint256 maxTxCount,
        uint256 maxPriceDeviation
    );
    
    event BaselinesUpdated(
        uint256 newBaselineVolume,
        uint256 newBaselineTxCount,
        uint256 newBaselineAvgTxSize
    );
    
    event MetricsRecorded(
        uint256 blockNumber,
        uint256 volume,
        uint256 txCount
    );
    
    // ─────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────
    
    constructor(
        address admin,
        uint256 _maxVolumePerBlock,
        uint256 _maxTxPerBlock,
        uint256 _maxPriceDeviationBps,
        uint256 _largeTxThreshold
    ) {
        require(admin != address(0), "AnomalyDetector: zero admin");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MONITOR_ROLE, admin);
        _grantRole(UPDATER_ROLE, admin);
        
        maxVolumePerBlock = _maxVolumePerBlock;
        maxTxPerBlock = _maxTxPerBlock;
        maxPriceDeviationBps = _maxPriceDeviationBps;
        largeTxThreshold = _largeTxThreshold;
        
        normalVolumePerBlock = _maxVolumePerBlock / 2;  // Start at 50% of max
        normalTxPerBlock = _maxTxPerBlock / 2;
        
        lastBaselineUpdateBlock = block.number;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  CORE DETECTION LOGIC
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Detect anomalies in real-time for a specific action.
     * @param layerId The layer being interacted with
     * @param user The user address
     * @param amount The transaction amount
     * @return detected ThreatLevel indicating severity
     */
    function detectAnomaly(
        bytes32 layerId,
        address user,
        uint256 amount
    ) external returns (ThreatLevel) {
        uint256 currentBlock = block.number;
        
        // Record metrics
        _recordMetrics(layerId, user, amount, currentBlock);
        
        ThreatLevel detected = ThreatLevel.NONE;
        string memory reason = "";
        
        // Check 1: Volume spike detection
        (ThreatLevel volumeThreat, string memory volumeReason) = 
            _checkVolumeSpike(layerId, amount, currentBlock);
        if (volumeThreat > detected) {
            detected = volumeThreat;
            reason = volumeReason;
        }
        
        // Check 2: Transaction frequency
        (ThreatLevel freqThreat, string memory freqReason) = 
            _checkTxFrequency(currentBlock);
        if (freqThreat > detected) {
            detected = freqThreat;
            reason = freqReason;
        }
        
        // Check 3: Large transaction monitoring
        (ThreatLevel largeThreat, string memory largeReason) = 
            _checkLargeTransaction(user, amount);
        if (largeThreat > detected) {
            detected = largeThreat;
            reason = largeReason;
        }
        
        // Check 4: User behavior anomaly
        (ThreatLevel userThreat, string memory userReason) = 
            _checkUserBehavior(user, currentBlock);
        if (userThreat > detected) {
            detected = userThreat;
            reason = userReason;
        }
        
        // Emit event if anomaly detected
        if (detected != ThreatLevel.NONE) {
            emit AnomalyDetected(layerId, user, amount, detected, reason);
            
            // Store in threat history
            threatHistory.push(ThreatEvent({
                timestamp: block.timestamp,
                level: detected,
                layerId: layerId,
                user: user,
                amount: amount,
                reason: reason
            }));
        }
        
        return detected;
    }
    
    /**
     * @notice Check if price deviation indicates manipulation.
     * @param currentPrice Current oracle price
     * @param baselinePrice Baseline/expected price
     * @return ThreatLevel based on deviation severity
     */
    function checkPriceDeviation(
        uint256 currentPrice,
        uint256 baselinePrice
    ) external view returns (ThreatLevel) {
        if (baselinePrice == 0) return ThreatLevel.NONE;
        
        uint256 deviation = currentPrice > baselinePrice
            ? currentPrice - baselinePrice
            : baselinePrice - currentPrice;
        
        uint256 deviationBps = (deviation * 10000) / baselinePrice;
        
        if (deviationBps >= maxPriceDeviationBps * 2) {
            return ThreatLevel.HIGH;
        } else if (deviationBps >= maxPriceDeviationBps) {
            return ThreatLevel.MEDIUM;
        } else if (deviationBps >= maxPriceDeviationBps / 2) {
            return ThreatLevel.LOW;
        }
        
        return ThreatLevel.NONE;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  INTERNAL DETECTION HELPERS
    // ─────────────────────────────────────────────────────────────────────
    
    function _checkVolumeSpike(
        bytes32 layerId,
        uint256 amount,
        uint256 currentBlock
    ) internal view returns (ThreatLevel, string memory) {
        uint256 currentVolume = volumeByBlock[currentBlock] + amount;
        
        // Check against absolute max
        if (currentVolume > maxVolumePerBlock) {
            return (ThreatLevel.HIGH, "VOLUME_EXCEEDS_ABSOLUTE_MAX");
        }
        
        // Check against dynamic baseline
        uint256 spikeThreshold = (baselineVolume * volumeSpikeMultiplier) / 100;
        if (currentVolume > spikeThreshold && baselineVolume > 0) {
            return (ThreatLevel.MEDIUM, "VOLUME_SPIKE_DETECTED");
        }
        
        return (ThreatLevel.NONE, "");
    }
    
    function _checkTxFrequency(
        uint256 currentBlock
    ) internal view returns (ThreatLevel, string memory) {
        uint256 currentTxCount = txCountByBlock[currentBlock];
        
        if (currentTxCount >= maxTxPerBlock) {
            return (ThreatLevel.HIGH, "TX_COUNT_EXCEEDS_MAX");
        }
        
        uint256 spikeThreshold = (baselineTxCount * txSpikeMultiplier) / 100;
        if (currentTxCount > spikeThreshold && baselineTxCount > 0) {
            return (ThreatLevel.MEDIUM, "TX_FREQUENCY_SPIKE");
        }
        
        return (ThreatLevel.NONE, "");
    }
    
    function _checkLargeTransaction(
        address user,
        uint256 amount
    ) internal view returns (ThreatLevel, string memory) {
        if (amount >= largeTxThreshold) {
            UserMetrics memory metrics = userMetrics[user];
            
            // Extra scrutiny for new users making large transactions
            if (metrics.isNewUser || metrics.txCount < 3) {
                return (ThreatLevel.MEDIUM, "LARGE_TX_NEW_USER");
            }
            
            return (ThreatLevel.LOW, "LARGE_TRANSACTION");
        }
        
        return (ThreatLevel.NONE, "");
    }
    
    function _checkUserBehavior(
        address user,
        uint256 currentBlock
    ) internal view returns (ThreatLevel, string memory) {
        UserMetrics memory metrics = userMetrics[user];
        
        // Check for rapid-fire transactions (same block)
        if (metrics.lastActivityBlock == currentBlock && metrics.txCount > 5) {
            return (ThreatLevel.MEDIUM, "RAPID_FIRE_TRANSACTIONS");
        }
        
        return (ThreatLevel.NONE, "");
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  METRICS RECORDING
    // ─────────────────────────────────────────────────────────────────────
    
    function _recordMetrics(
        bytes32 layerId,
        address user,
        uint256 amount,
        uint256 currentBlock
    ) internal {
        // Update block-level metrics
        volumeByBlock[currentBlock] += amount;
        txCountByBlock[currentBlock]++;
        
        // Update layer-specific metrics
        ActivityMetrics storage lm = layerMetrics[layerId];
        lm.volumeLastBlock = volumeByBlock[currentBlock];
        lm.txCountLastBlock = txCountByBlock[currentBlock];
        
        if (amount >= largeTxThreshold) {
            lm.largeTxCount++;
        }
        
        // Update user metrics
        UserMetrics storage um = userMetrics[user];
        um.txCount++;
        um.totalVolume += amount;
        um.lastActivityBlock = currentBlock;
        
        if (um.txCount == 1) {
            um.isNewUser = true;
        }
        
        // Emit recording event every 10 blocks
        if (currentBlock % 10 == 0) {
            emit MetricsRecorded(currentBlock, volumeByBlock[currentBlock], txCountByBlock[currentBlock]);
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  BASELINE MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Update baselines based on recent historical data.
     *         Called automatically every 100 blocks.
     */
    function updateBaselines() external {
        require(block.number % 100 == 0 || hasRole(UPDATER_ROLE, msg.sender), 
            "AnomalyDetector: can only update every 100 blocks");
        
        uint256 sumVolume = 0;
        uint256 sumTxCount = 0;
        uint256 validBlocks = 0;
        
        // Calculate moving average from last 100 blocks
        for (uint256 i = 1; i <= 100; i++) {
            uint256 blockNum = block.number - i;
            uint256 vol = volumeByBlock[blockNum];
            uint256 txs = txCountByBlock[blockNum];
            
            // Skip outlier blocks (already flagged as anomalous)
            if (vol <= maxVolumePerBlock && txs <= maxTxPerBlock) {
                sumVolume += vol;
                sumTxCount += txs;
                validBlocks++;
            }
        }
        
        if (validBlocks > 0) {
            baselineVolume = sumVolume / validBlocks;
            baselineTxCount = sumTxCount / validBlocks;
            baselineAvgTxSize = validBlocks > 0 
                ? sumVolume / sumTxCount 
                : 0;
            
            lastBaselineUpdateBlock = block.number;
            
            emit BaselinesUpdated(baselineVolume, baselineTxCount, baselineAvgTxSize);
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Update detection thresholds.
     */
    function setThresholds(
        uint256 _maxVolumePerBlock,
        uint256 _maxTxPerBlock,
        uint256 _maxPriceDeviationBps,
        uint256 _largeTxThreshold
    ) external onlyRole(UPDATER_ROLE) {
        maxVolumePerBlock = _maxVolumePerBlock;
        maxTxPerBlock = _maxTxPerBlock;
        maxPriceDeviationBps = _maxPriceDeviationBps;
        largeTxThreshold = _largeTxThreshold;
        
        normalVolumePerBlock = _maxVolumePerBlock / 2;
        normalTxPerBlock = _maxTxPerBlock / 2;
        
        emit ThresholdsUpdated(_maxVolumePerBlock, _maxTxPerBlock, _maxPriceDeviationBps);
    }
    
    /**
     * @notice Update dynamic spike multipliers.
     */
    function setSpikeMultipliers(
        uint256 _volumeSpikeMultiplier,
        uint256 _txSpikeMultiplier
    ) external onlyRole(UPDATER_ROLE) {
        volumeSpikeMultiplier = _volumeSpikeMultiplier;
        txSpikeMultiplier = _txSpikeMultiplier;
    }
    
    /**
     * @notice Set the threat level that triggers auto-pause.
     */
    function setAutoPauseThreshold(ThreatLevel _threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        autoPauseThreshold = _threshold;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Get comprehensive metrics for a specific layer.
     */
    function getLayerMetrics(bytes32 layerId) external view returns (ActivityMetrics memory) {
        return layerMetrics[layerId];
    }
    
    /**
     * @notice Get metrics for a specific user.
     */
    function getUserMetrics(address user) external view returns (UserMetrics memory) {
        return userMetrics[user];
    }
    
    /**
     * @notice Get current block usage.
     */
    function getCurrentBlockUsage() external view returns (uint256 volume, uint256 txCount) {
        return (volumeByBlock[block.number], txCountByBlock[block.number]);
    }
    
    /**
     * @notice Get recent threat events count.
     */
    function getRecentThreatCount(uint256 lastNBlocks) external view returns (uint256) {
        uint256 count = 0;
        uint256 cutoffTime = block.timestamp - (lastNBlocks * 12); // Approximate
        
        for (uint256 i = 0; i < threatHistory.length; i++) {
            if (threatHistory[i].timestamp >= cutoffTime) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * @notice Check if current activity levels are anomalous.
     */
    function isCurrentActivityAnomalous() external view returns (bool) {
        uint256 currentVolume = volumeByBlock[block.number];
        uint256 currentTxCount = txCountByBlock[block.number];
        
        return currentVolume > (baselineVolume * volumeSpikeMultiplier) / 100 ||
               currentTxCount > (baselineTxCount * txSpikeMultiplier) / 100;
    }
}
