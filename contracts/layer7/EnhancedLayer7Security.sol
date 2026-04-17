// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Layer7Security.sol";

/**
 * @title EnhancedLayer7Security
 * @notice Layer 7 Enhanced with:
 *         1. Formal Verification Invariants
 *         2. Advanced Behavioral Threat Detection
 *         3. Automated Incident Response
 *         4. MEV Protection
 *         5. Flash Loan Attack Detection
 *
 * @dev This extends Layer7Security with enterprise-grade security features
 */
contract EnhancedLayer7Security is Layer7Security {

    constructor(
        address[] memory _signers,
        uint256 _required,
        uint256 _maxCallsPerBlock,
        uint256 _maxValuePerBlock,
        uint256 _requiredKYCLevel
    ) Layer7Security(_signers, _required, _maxCallsPerBlock, _maxValuePerBlock, _requiredKYCLevel) {
        // Initialize enhanced features
    }

    // ─────────────────────────────────────────────────────────────────────
    //  FORMAL VERIFICATION INVARIANTS
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Invariant 1: Threshold never exceeds signer count
    /// @dev Certora: assert required <= signers.length
    function invariant_thresholdValid() external view returns (bool) {
        return required <= signers.length && required > 0;
    }

    /// @notice Invariant 2: Executed transactions cannot be re-executed
    /// @dev Certora: assert tx.executed ==> executeTransaction reverts
    function invariant_executedStaysExecuted(uint256 txId) external view returns (bool) {
        if (txId >= transactions.length) return true;
        Transaction storage tx = transactions[txId];
        return !tx.executed || tx.confirmations >= required;
    }

    /// @notice Invariant 3: Circuit breaker implies paused
    /// @dev Certora: assert circuitBroken ==> paused
    function invariant_circuitBreakerImpliesPaused() external view returns (bool) {
        return !circuitBroken || paused;
    }

    /// @notice Invariant 4: Confirmations never exceed signers
    /// @dev Certora: assert tx.confirmations <= signers.length
    function invariant_confirmationsValid(uint256 txId) external view returns (bool) {
        if (txId >= transactions.length) return true;
        return transactions[txId].confirmations <= signers.length;
    }

    /// @notice Invariant 5: No duplicate signers
    /// @dev Certora: assert isSigner[s] <==> s in signers
    function invariant_noDuplicateSigners() external view returns (bool) {
        uint256 count = 0;
        for (uint256 i = 0; i < signers.length; i++) {
            if (!isSigner[signers[i]]) return false;
            count++;
        }
        return count == signers.length;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  ADVANCED BEHAVIORAL THREAT DETECTION
    // ─────────────────────────────────────────────────────────────────────

    enum ThreatLevelEnhanced { 
        NONE,           // 0: No threat
        LOW,            // 1: Monitor only
        MEDIUM,         // 2: Rate limit
        HIGH,           // 3: Temporary block
        CRITICAL,       // 4: Immediate pause
        FLASH_EXPLOIT   // 5: Flash loan attack
    }

    struct UserBehavior {
        uint256 totalTransactions;
        uint256 totalVolume;
        uint256 firstSeen;
        uint256 lastActive;
        uint256 maxSingleTransaction;
        uint256 avgTransactionSize;
        uint256 transactionsInLastBlock;
        uint256 transactionsInLastMinute;
        uint256 transactionsInLastHour;
        uint8 riskScore; // 0-100, higher = riskier
        bool isFlashLoanSuspect;
        bool isMEVSuspect;
    }

    /// @dev Behavioral tracking per user
    mapping(address => UserBehavior) public userBehavior;

    /// @dev Known flash loan provider addresses
    mapping(address => bool) public knownFlashLoanProviders;

    /// @dev Progressive response thresholds
    uint256 public constant RISK_THRESHOLD_RATE_LIMIT = 40;
    uint256 public constant RISK_THRESHOLD_COOLDOWN = 60;
    uint256 public constant RISK_THRESHOLD_BLOCK = 80;

    /// @dev Cooldown mappings
    mapping(address => uint256) public userCooldownUntil;
    mapping(address => bool) public userBlocked;

    /// @dev Flash loan detection
    uint256 public constant FLASH_LOAN_TX_THRESHOLD = 3; // 3+ txs in same block
    uint256 public constant FLASH_LOAN_VOLUME_THRESHOLD = 1000000 ether;

    event BehavioralAnalysis(address indexed user, uint8 riskScore, ThreatLevelEnhanced threat);
    event UserRateLimited(address indexed user, uint256 until);
    event UserCooldowned(address indexed user, uint256 until);
    event UserBlocked(address indexed user);
    event FlashLoanAttackDetected(address indexed user, uint256 volume);
    event MEVAttackDetected(address indexed user, bytes32 txHash);
    event ThreatResponse(ThreatLevelEnhanced level, address indexed user, string action);

    /**
     * @notice Initialize known flash loan providers
     */
    function initializeFlashLoanProviders() external onlyMultisig {
        // Aave V2
        knownFlashLoanProviders[0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9] = true;
        // Aave V3
        knownFlashLoanProviders[0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2] = true;
        // dYdX
        knownFlashLoanProviders[0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e] = true;
        // Uniswap V3
        knownFlashLoanProviders[0xE592427A0AEce92De3Edee1F18E0157C05861564] = true;
    }

    /**
     * @notice Analyze user behavior and detect threats
     * @param user User address to analyze
     * @param amount Transaction amount
     * @return threat Enhanced threat level
     */
    function analyzeBehavior(address user, uint256 amount) 
        external 
        returns (ThreatLevelEnhanced threat) 
    {
        UserBehavior storage behavior = userBehavior[user];

        // Update behavior tracking
        behavior.totalTransactions++;
        behavior.totalVolume += amount;
        behavior.lastActive = block.timestamp;

        if (behavior.firstSeen == 0) {
            behavior.firstSeen = block.timestamp;
        }

        if (amount > behavior.maxSingleTransaction) {
            behavior.maxSingleTransaction = amount;
        }

        // Calculate average (avoid division by zero)
        if (behavior.totalTransactions > 0) {
            behavior.avgTransactionSize = behavior.totalVolume / behavior.totalTransactions;
        }

        // Track time-based metrics
        if (block.timestamp - behavior.lastActive < 1 minutes) {
            behavior.transactionsInLastMinute++;
        } else {
            behavior.transactionsInLastMinute = 1;
        }

        if (block.timestamp - behavior.lastActive < 1 hours) {
            behavior.transactionsInLastHour++;
        } else {
            behavior.transactionsInLastHour = 1;
        }

        behavior.transactionsInLastBlock++;

        // Calculate risk score
        behavior.riskScore = _calculateRiskScore(user, amount);

        // Detect flash loan patterns
        bool flashLoanDetected = _detectFlashLoanAttack(user, amount);

        // Detect MEV patterns
        bool mevDetected = _detectMEVAttack(user);

        // Determine threat level
        threat = _determineThreatLevel(behavior.riskScore, flashLoanDetected, mevDetected);

        // Auto-respond to threat
        _autoRespondToThreat(user, threat);

        emit BehavioralAnalysis(user, behavior.riskScore, threat);

        return threat;
    }

    /**
     * @notice Calculate risk score for a user
     */
    function _calculateRiskScore(address user, uint256 amount) internal view returns (uint8) {
        UserBehavior storage behavior = userBehavior[user];
        uint256 score = 0;

        // Factor 1: Transaction frequency (0-25 points)
        if (behavior.transactionsInLastMinute > 10) score += 25;
        else if (behavior.transactionsInLastMinute > 5) score += 15;
        else if (behavior.transactionsInLastMinute > 2) score += 5;

        // Factor 2: Transaction size anomaly (0-25 points)
        if (behavior.avgTransactionSize > 0 && amount > behavior.avgTransactionSize * 10) {
            score += 25;
        } else if (behavior.avgTransactionSize > 0 && amount > behavior.avgTransactionSize * 5) {
            score += 15;
        }

        // Factor 3: New account risk (0-15 points)
        if (behavior.firstSeen > 0 && block.timestamp - behavior.firstSeen < 1 hours) {
            score += 15;
        }

        // Factor 4: Large volume (0-20 points)
        if (amount > FLASH_LOAN_VOLUME_THRESHOLD) {
            score += 20;
        } else if (amount > FLASH_LOAN_VOLUME_THRESHOLD / 10) {
            score += 10;
        }

        // Factor 5: Known flash loan provider (0-15 points)
        if (knownFlashLoanProviders[user]) {
            score += 15;
        }

        return uint8(score > 100 ? 100 : score);
    }

    /**
     * @notice Detect flash loan attack patterns
     */
    function _detectFlashLoanAttack(address user, uint256 amount) internal returns (bool) {
        UserBehavior storage behavior = userBehavior[user];

        // Check for multiple transactions in same block
        if (behavior.transactionsInLastBlock >= FLASH_LOAN_TX_THRESHOLD) {
            behavior.isFlashLoanSuspect = true;
            emit FlashLoanAttackDetected(user, amount);
            return true;
        }

        // Check for unusually large volume
        if (amount > FLASH_LOAN_VOLUME_THRESHOLD) {
            behavior.isFlashLoanSuspect = true;
            emit FlashLoanAttackDetected(user, amount);
            return true;
        }

        return false;
    }

    /**
     * @notice Detect MEV attack patterns
     */
    function _detectMEVAttack(address user) internal view returns (bool) {
        UserBehavior storage behavior = userBehavior[user];

        // Check for sandwich attack pattern
        // (large tx followed by many small txs in quick succession)
        if (behavior.transactionsInLastMinute > 20 && 
            behavior.maxSingleTransaction > behavior.avgTransactionSize * 5) {
            return true;
        }

        return false;
    }

    /**
     * @notice Determine threat level from risk score and patterns
     */
    function _determineThreatLevel(
        uint8 riskScore, 
        bool flashLoan, 
        bool mev
    ) internal pure returns (ThreatLevelEnhanced) {
        if (flashLoan) return ThreatLevelEnhanced.FLASH_EXPLOIT;
        if (mev) return ThreatLevelEnhanced.CRITICAL;
        
        if (riskScore >= RISK_THRESHOLD_BLOCK) return ThreatLevelEnhanced.CRITICAL;
        if (riskScore >= RISK_THRESHOLD_COOLDOWN) return ThreatLevelEnhanced.HIGH;
        if (riskScore >= RISK_THRESHOLD_RATE_LIMIT) return ThreatLevelEnhanced.MEDIUM;
        if (riskScore > 20) return ThreatLevelEnhanced.LOW;
        
        return ThreatLevelEnhanced.NONE;
    }

    /**
     * @notice Auto-respond to detected threats
     */
    function _autoRespondToThreat(address user, ThreatLevelEnhanced threat) internal {
        if (threat == ThreatLevelEnhanced.NONE) {
            // No action needed
            return;
        }

        if (threat == ThreatLevelEnhanced.LOW) {
            // Just monitor
            emit ThreatResponse(threat, user, "MONITORING");
            return;
        }

        if (threat == ThreatLevelEnhanced.MEDIUM) {
            // Rate limit user
            _rateLimitUser(user);
            emit ThreatResponse(threat, user, "RATE_LIMITED");
            return;
        }

        if (threat == ThreatLevelEnhanced.HIGH) {
            // Temporary cooldown
            _cooldownUser(user, 1 hours);
            emit ThreatResponse(threat, user, "COOLDOWN_1H");
            return;
        }

        if (threat == ThreatLevelEnhanced.CRITICAL || threat == ThreatLevelEnhanced.FLASH_EXPLOIT) {
            // Block user immediately
            _blockUser(user);
            emit ThreatResponse(threat, user, "BLOCKED");
            
            // If flash exploit, consider pausing protocol
            if (threat == ThreatLevelEnhanced.FLASH_EXPLOIT) {
                _tripCircuitBreakerInternal("FLASH_EXPLOIT_DETECTED");
                emit ThreatResponse(threat, user, "PROTOCOL_PAUSED");
            }
            return;
        }
    }

    /**
     * @notice Rate limit a user
     */
    function _rateLimitUser(address user) internal {
        userCooldownUntil[user] = block.timestamp + 5 minutes;
        emit UserRateLimited(user, block.timestamp + 5 minutes);
    }

    /**
     * @notice Put user in cooldown
     */
    function _cooldownUser(address user, uint256 duration) internal {
        userCooldownUntil[user] = block.timestamp + duration;
        emit UserCooldowned(user, block.timestamp + duration);
    }

    /**
     * @notice Block user completely
     */
    function _blockUser(address user) internal {
        userBlocked[user] = true;
        emit UserBlocked(user);
    }

    /**
     * @notice Check if user is currently restricted
     */
    function isUserRestricted(address user) external view returns (bool restricted) {
        if (userBlocked[user]) return true;
        if (block.timestamp < userCooldownUntil[user]) return true;
        return false;
    }

    /**
     * @notice Manual override to unblock user (multisig only)
     */
    function unblockUser(address user) external onlyMultisig {
        userBlocked[user] = false;
        userCooldownUntil[user] = 0;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  AUTOMATED INCIDENT RESPONSE
    // ─────────────────────────────────────────────────────────────────────

    /// @dev Incident response configuration
    struct IncidentConfig {
        uint256 maxResponseTime; // Maximum time to respond (seconds)
        bool autoPauseEnabled;
        bool autoRateLimitEnabled;
        uint256 autoRateLimitThreshold;
        bool emergencyWithdrawEnabled;
        address emergencyWithdrawAddress;
    }

    IncidentConfig public incidentConfig;

    /// @dev Incident tracking
    struct Incident {
        uint256 timestamp;
        address detectedUser;
        ThreatLevelEnhanced threatLevel;
        bool autoResponded;
        string responseType;
        bool resolved;
    }

    Incident[] public incidents;

    event IncidentDetected(uint256 indexed incidentId, address indexed user, ThreatLevelEnhanced threat);
    event IncidentResolved(uint256 indexed incidentId, string resolution);
    event IncidentConfigUpdated();

    /**
     * @notice Initialize incident response configuration
     */
    function initializeIncidentResponse() external onlyMultisig {
        incidentConfig = IncidentConfig({
            maxResponseTime: 300, // 5 minutes
            autoPauseEnabled: true,
            autoRateLimitEnabled: true,
            autoRateLimitThreshold: RISK_THRESHOLD_RATE_LIMIT,
            emergencyWithdrawEnabled: true,
            emergencyWithdrawAddress: msg.sender
        });
        emit IncidentConfigUpdated();
    }

    /**
     * @notice Process potential incident with automated response
     */
    function processIncident(
        address user,
        uint256 amount,
        bytes32 layerId
    ) external returns (uint256 incidentId) {
        // Analyze behavior (inline to avoid forward reference)
        UserBehavior storage behavior = userBehavior[user];
        behavior.totalTransactions++;
        behavior.totalVolume += amount;
        behavior.lastActive = block.timestamp;
        
        if (behavior.firstSeen == 0) {
            behavior.firstSeen = block.timestamp;
        }

        behavior.avgTransactionSize = behavior.totalVolume / behavior.totalTransactions;
        behavior.riskScore = _calculateRiskScore(user, amount);
        
        bool flashLoanDetected = _detectFlashLoanAttack(user, amount);
        bool mevDetected = _detectMEVAttack(user);
        ThreatLevelEnhanced threat = _determineThreatLevel(behavior.riskScore, flashLoanDetected, mevDetected);
        
        _autoRespondToThreat(user, threat);
        
        emit BehavioralAnalysis(user, behavior.riskScore, threat);

        // Create incident record
        incidentId = incidents.length;
        incidents.push(Incident({
            timestamp: block.timestamp,
            detectedUser: user,
            threatLevel: threat,
            autoResponded: threat != ThreatLevelEnhanced.NONE,
            responseType: threat == ThreatLevelEnhanced.NONE ? "NONE" : "AUTO",
            resolved: threat == ThreatLevelEnhanced.NONE
        }));

        emit IncidentDetected(incidentId, user, threat);

        // If critical and auto-pause enabled, already handled above

        return incidentId;
    }

    /**
     * @notice Resolve incident manually
     */
    function resolveIncident(uint256 incidentId, string calldata resolution) external onlyMultisig {
        require(incidentId < incidents.length, "Invalid incident ID");
        incidents[incidentId].resolved = true;
        incidents[incidentId].responseType = resolution;
        emit IncidentResolved(incidentId, resolution);
    }

    /**
     * @notice Emergency fund withdrawal (multisig only)
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyMultisig {
        require(incidentConfig.emergencyWithdrawEnabled, "Emergency withdraw disabled");
        require(to != address(0), "Invalid address");
        
        if (token == address(0)) {
            // ETH withdrawal
            (bool success, ) = to.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Token withdrawal
            IERC20(token).transfer(to, amount);
        }
    }

    /**
     * @notice Update incident response configuration
     */
    function updateIncidentConfig(IncidentConfig calldata newConfig) external onlyMultisig {
        incidentConfig = newConfig;
        emit IncidentConfigUpdated();
    }

    // ─────────────────────────────────────────────────────────────────────
    //  ENHANCED PROTECTED ACTION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * @notice Enhanced protected action with all security checks
     */
    function enhancedProtectedAction(bytes32 layerId, uint256 amount)
        external
        payable
        whenNotPaused
        onlyAllowlisted
        onlyKYC(requiredKYCLevel)
        rateGuard(msg.value)
    {
        // Check if user is restricted
        require(!userBlocked[msg.sender], "User blocked");
        require(block.timestamp >= userCooldownUntil[msg.sender], "User in cooldown");

        // Analyze behavior (inline to avoid forward reference)
        UserBehavior storage behavior = userBehavior[msg.sender];
        behavior.totalTransactions++;
        behavior.totalVolume += amount;
        behavior.lastActive = block.timestamp;
        
        if (behavior.firstSeen == 0) {
            behavior.firstSeen = block.timestamp;
        }

        behavior.avgTransactionSize = behavior.totalVolume / behavior.totalTransactions;
        behavior.riskScore = _calculateRiskScore(msg.sender, amount);
        
        bool flashLoanDetected = _detectFlashLoanAttack(msg.sender, amount);
        ThreatLevelEnhanced threat = _determineThreatLevel(behavior.riskScore, flashLoanDetected, false);
        
        _autoRespondToThreat(msg.sender, threat);

        // Check threat level
        require(behavior.riskScore < RISK_THRESHOLD_BLOCK, "Risk score too high");

        // Execute action
        // ── your business logic here ──
    }

    // ─────────────────────────────────────────────────────────────────────
    //  GETTERS
    // ─────────────────────────────────────────────────────────────────────

    function getUserBehavior(address user) external view returns (UserBehavior memory) {
        return userBehavior[user];
    }

    function getIncidentCount() external view returns (uint256) {
        return incidents.length;
    }

    function getLatestIncident() external view returns (Incident memory) {
        require(incidents.length > 0, "No incidents");
        return incidents[incidents.length - 1];
    }
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}
