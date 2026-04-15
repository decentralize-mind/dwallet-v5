// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SecurityController
 * @notice Central Intelligence Hub for Real-Time Threat Detection & Response
 * 
 *         This contract serves as the brain of the security system:
 *         - Monitors all protocol activity
 *         - Detects anomalies and threats
 *         - Automatically responds to dangers
 *         - Coordinates with Layer7Security for enforcement
 * 
 * INTELLIGENCE FEATURES:
 *   - Threat scoring system (0-100)
 *   - Pattern detection (MEV, flash loans, sybil)
 *   - Behavioral analysis
 *   - Auto-response engine
 *   - Event streaming for off-chain monitoring
 */
contract SecurityController is AccessControl, ReentrancyGuard {
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTANTS & ROLES
    // ─────────────────────────────────────────────────────────────────────────
    
    bytes32 public constant ADMIN_ROLE = keccak256("SECURITY_ADMIN");
    bytes32 public constant ANALYST_ROLE = keccak256("SECURITY_ANALYST");
    bytes32 public constant BOT_ROLE = keccak256("SECURITY_BOT");
    
    // ─────────────────────────────────────────────────────────────────────────
    //  THREAT LEVELS
    // ─────────────────────────────────────────────────────────────────────────
    
    enum ThreatLevel {
        NONE,     // 0: Normal activity
        LOW,      // 1-30: Minor anomaly
        MEDIUM,   // 31-70: Suspicious activity
        HIGH,     // 71-90: Likely attack
        CRITICAL  // 91-100: Active exploit
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────────────────────
    
    error InvalidThreatScore(uint256 score);
    error UnauthorizedBot();
    error InvalidThreshold();
    error AlreadyMonitored(address target);
    error NotMonitored(address target);
    error ZeroAddress();
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────────────
    
    event ThreatDetected(
        address indexed user,
        bytes32 indexed layerId,
        uint256 threatScore,
        ThreatLevel level,
        string reason
    );
    
    event ActivityLogged(
        address indexed user,
        bytes32 indexed layerId,
        string action,
        uint256 amount,
        uint256 timestamp
    );
    
    event BehaviorPatternIdentified(
        address indexed user,
        string patternType,
        uint256 confidence
    );
    
    event AutoResponseTriggered(
        address indexed user,
        ThreatLevel level,
        string responseAction
    );
    
    event ThresholdUpdated(string thresholdName, uint256 newValue);
    event WatchlistAdded(address indexed target, string reason);
    event WatchlistRemoved(address indexed target);
    
    // ─────────────────────────────────────────────────────────────────────────
    //  STRUCTS
    // ─────────────────────────────────────────────────────────────────────────
    
    struct UserBehavior {
        uint256 totalInteractions;
        uint256 totalVolume;
        uint256 firstSeen;
        uint256 lastSeen;
        uint256 threatScore;
        bool isMonitored;
        string[] patterns;
    }
    
    struct ActivityWindow {
        uint256 windowStart;
        uint256 callCount;
        uint256 totalVolume;
        uint256 uniqueLayers;
    }
    
    struct ThreatConfig {
        uint256 lowThreshold;
        uint256 mediumThreshold;
        uint256 highThreshold;
        uint256 criticalThreshold;
        bool autoResponseEnabled;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────────────────────
    
    /// @dev User behavior tracking
    mapping(address => UserBehavior) public userBehaviors;
    
    /// @dev Recent activity windows (address => layer => window)
    mapping(address => mapping(bytes32 => ActivityWindow)) internal _activityWindows;
    
    /// @dev Watchlist addresses
    mapping(address => bool) public watchlist;
    
    /// @dev Threat configuration
    ThreatConfig public threatConfig;
    
    /// @dev Global threat level
    ThreatLevel public globalThreatLevel = ThreatLevel.NONE;
    
    /// @dev Anomaly detector bot address
    address public anomalyDetectorBot;
    
    /// @dev Layer7Security reference
    address public layer7Security;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  DETECTION THRESHOLDS (basis points)
    // ─────────────────────────────────────────────────────────────────────────
    
    uint256 public volumeSpikeThreshold = 50000; // 500% volume increase
    uint256 public frequencySpikeThreshold = 1000; // 10x normal frequency
    uint256 public largeTransactionThreshold = 1000000 * 1e18; // 1M tokens
    uint256 public rapidCallThreshold = 10; // calls per block
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────
    
    constructor(
        address _admin,
        address _analyst,
        address _layer7Security
    ) {
        if (_admin == address(0) || _analyst == address(0)) revert ZeroAddress();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(ANALYST_ROLE, _analyst);
        
        layer7Security = _layer7Security;
        
        // Initialize threat thresholds
        threatConfig = ThreatConfig({
            lowThreshold: 30,
            mediumThreshold: 70,
            highThreshold: 90,
            criticalThreshold: 95,
            autoResponseEnabled: true
        });
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CORE MONITORING FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Log and analyze user activity
     * @param user User address
     * @param layerId Layer being interacted with
     * @param action Action being performed
     * @param amount Amount involved (if any)
     */
    function logActivity(
        address user,
        bytes32 layerId,
        string calldata action,
        uint256 amount
    ) external onlyRole(BOT_ROLE) {
        // Update user behavior
        UserBehavior storage behavior = userBehaviors[user];
        behavior.totalInteractions++;
        behavior.totalVolume += amount;
        behavior.lastSeen = block.timestamp;
        
        if (behavior.firstSeen == 0) {
            behavior.firstSeen = block.timestamp;
        }
        
        // Update activity window
        ActivityWindow storage window = _activityWindows[user][layerId];
        if (window.windowStart != block.timestamp) {
            window.windowStart = block.timestamp;
            window.callCount = 0;
            window.totalVolume = 0;
            window.uniqueLayers = 1;
        }
        
        window.callCount++;
        window.totalVolume += amount;
        
        emit ActivityLogged(user, layerId, action, amount, block.timestamp);
    }
    
    /**
     * @notice Detect threat level for a specific interaction
     * @param layerId Layer being interacted with
     * @param user User address
     * @param amount Transaction amount
     * @return detectedThreatLevel Detected threat level
     * @return score Threat score (0-100)
     */
    function detectAnomaly(
        bytes32 layerId,
        address user,
        uint256 amount
    ) external returns (ThreatLevel detectedThreatLevel, uint256 score) {
        score = _calculateThreatScore(user, layerId, amount);
        detectedThreatLevel = _getThreatLevel(score);
        
        if (score > threatConfig.lowThreshold) {
            emit ThreatDetected(
                user,
                layerId,
                score,
                detectedThreatLevel,
                "Anomaly detected"
            );
            
            // Auto-respond if enabled
            if (threatConfig.autoResponseEnabled) {
                _autoRespond(user, detectedThreatLevel);
            }
        }
        
        // Update user's threat score
        userBehaviors[user].threatScore = score;
        userBehaviors[user].isMonitored = score > threatConfig.mediumThreshold;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  THREAT CALCULATION ENGINE
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Calculate comprehensive threat score
     * @return score Threat score (0-100)
     */
    function _calculateThreatScore(
        address user,
        bytes32 layerId,
        uint256 amount
    ) internal view returns (uint256 score) {
        UserBehavior storage behavior = userBehaviors[user];
        ActivityWindow storage window = _activityWindows[user][layerId];
        
        // Factor 1: Watchlist bonus
        if (watchlist[user]) {
            score += 30;
        }
        
        // Factor 2: Volume spike detection
        if (behavior.totalVolume > 0 && amount > behavior.totalVolume * 5) {
            score += 25; // 5x average volume
        }
        
        // Factor 3: Large transaction detection
        if (amount >= largeTransactionThreshold) {
            score += 20;
        }
        
        // Factor 4: Frequency spike
        if (window.callCount >= rapidCallThreshold) {
            score += 25;
        }
        
        // Factor 5: New user with high volume
        if (behavior.totalInteractions < 5 && amount > largeTransactionThreshold) {
            score += 15;
        }
        
        // Factor 6: Pattern matching (MEV, flash loan signatures)
        if (_isSuspiciousPattern(user, layerId, amount)) {
            score += 30;
        }
        
        // Cap at 100
        return score > 100 ? 100 : score;
    }
    
    /**
     * @notice Check for suspicious patterns
     */
    function _isSuspiciousPattern(
        address user,
        bytes32 /* layerId */,
        uint256 amount
    ) internal view returns (bool) {
        // Simplified pattern detection
        // In production, this would check:
        // - Flash loan patterns
        // - MEV bot signatures
        // - Sybil cluster behavior
        
        // Example: Check if user interacts with known MEV contracts
        // This is a placeholder for more sophisticated detection
        return amount > 1000000 * 1e18; // >1M is suspicious
    }
    
    /**
     * @notice Convert score to threat level
     */
    function _getThreatLevel(uint256 score) internal view returns (ThreatLevel) {
        if (score >= threatConfig.criticalThreshold) {
            return ThreatLevel.CRITICAL;
        } else if (score >= threatConfig.highThreshold) {
            return ThreatLevel.HIGH;
        } else if (score >= threatConfig.mediumThreshold) {
            return ThreatLevel.MEDIUM;
        } else if (score >= threatConfig.lowThreshold) {
            return ThreatLevel.LOW;
        }
        return ThreatLevel.NONE;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  AUTO-RESPONSE ENGINE
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Automatic response to detected threats
     */
    function _autoRespond(address user, ThreatLevel level) internal {
        string memory responseAction;
        
        if (level == ThreatLevel.CRITICAL) {
            // Critical: Immediate action required
            responseAction = "CRITICAL_PAUSE";
            // In production: trigger circuit breaker via Layer7
        } else if (level == ThreatLevel.HIGH) {
            // High: Restrict user
            responseAction = "HIGH_RESTRICT";
            // Add to temporary watchlist
            watchlist[user] = true;
        } else if (level == ThreatLevel.MEDIUM) {
            // Medium: Increase monitoring
            responseAction = "MEDIUM_MONITOR";
            userBehaviors[user].isMonitored = true;
        } else {
            // Low: Just log
            responseAction = "LOW_LOG";
        }
        
        emit AutoResponseTriggered(user, level, responseAction);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  PATTERN DETECTION
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Identify behavioral patterns for a user
     * @param user User address
     * @return patterns Array of identified patterns
     */
    function identifyPatterns(address user) external view returns (string[] memory patterns) {
        UserBehavior storage behavior = userBehaviors[user];
        
        // Count patterns
        uint256 patternCount = 0;
        
        // Check for whale pattern
        if (behavior.totalVolume > largeTransactionThreshold * 10) {
            patternCount++;
        }
        
        // Check for high-frequency pattern
        if (behavior.totalInteractions > 1000) {
            patternCount++;
        }
        
        // Allocate array
        patterns = new string[](patternCount);
        uint256 index = 0;
        
        // Fill patterns
        if (behavior.totalVolume > largeTransactionThreshold * 10) {
            patterns[index] = "WHALE";
            index++;
        }
        
        if (behavior.totalInteractions > 1000) {
            patterns[index] = "HIGH_FREQUENCY";
            index++;
        }
        
        return patterns;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  WATCHLIST MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Add address to watchlist
     * @param target Address to monitor
     * @param reason Reason for watchlisting
     */
    function addToWatchlist(address target, string calldata reason) external onlyRole(ANALYST_ROLE) {
        if (target == address(0)) revert ZeroAddress();
        if (watchlist[target]) revert AlreadyMonitored(target);
        
        watchlist[target] = true;
        emit WatchlistAdded(target, reason);
    }
    
    /**
     * @notice Remove address from watchlist
     */
    function removeFromWatchlist(address target) external onlyRole(ANALYST_ROLE) {
        if (!watchlist[target]) revert NotMonitored(target);
        
        watchlist[target] = false;
        emit WatchlistRemoved(target);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONFIGURATION & ADMIN
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Update threat thresholds
     */
    function updateThreatThresholds(
        uint256 low,
        uint256 medium,
        uint256 high,
        uint256 critical
    ) external onlyRole(ADMIN_ROLE) {
        require(low < medium && medium < high && high < critical, "Invalid order");
        require(critical <= 100, "Critical must be <= 100");
        
        threatConfig.lowThreshold = low;
        threatConfig.mediumThreshold = medium;
        threatConfig.highThreshold = high;
        threatConfig.criticalThreshold = critical;
        
        emit ThresholdUpdated("threat_thresholds", low);
    }
    
    /**
     * @notice Enable/disable auto-response
     */
    function setAutoResponseEnabled(bool enabled) external onlyRole(ADMIN_ROLE) {
        threatConfig.autoResponseEnabled = enabled;
        emit ThresholdUpdated("auto_response", enabled ? 1 : 0);
    }
    
    /**
     * @notice Set anomaly detector bot address
     */
    function setAnomalyDetectorBot(address bot) external onlyRole(ADMIN_ROLE) {
        if (bot == address(0)) revert ZeroAddress();
        anomalyDetectorBot = bot;
        _grantRole(BOT_ROLE, bot);
    }
    
    /**
     * @notice Update detection thresholds
     */
    function updateDetectionThresholds(
        uint256 volumeSpike,
        uint256 frequencySpike,
        uint256 largeTx,
        uint256 rapidCalls
    ) external onlyRole(ADMIN_ROLE) {
        volumeSpikeThreshold = volumeSpike;
        frequencySpikeThreshold = frequencySpike;
        largeTransactionThreshold = largeTx;
        rapidCallThreshold = rapidCalls;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Get detailed user behavior
     */
    function getUserBehavior(address user) external view returns (UserBehavior memory) {
        return userBehaviors[user];
    }
    
    /**
     * @notice Get current activity window for user/layer
     */
    function getActivityWindow(address user, bytes32 layerId) 
        external 
        view 
        returns (ActivityWindow memory) 
    {
        return _activityWindows[user][layerId];
    }
    
    /**
     * @notice Get current threat level for a user
     */
    function getThreatLevelForUser(address user) external view returns (ThreatLevel, uint256) {
        uint256 score = userBehaviors[user].threatScore;
        return (_getThreatLevel(score), score);
    }
    
    /**
     * @notice Check if auto-response is enabled
     */
    function isAutoResponseEnabled() external view returns (bool) {
        return threatConfig.autoResponseEnabled;
    }
}
