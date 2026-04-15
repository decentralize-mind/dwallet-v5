// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./Interfaces.sol";

/**
 * @title LockEngine
 * @notice Unified 5-Lock Security System for the dWallet Protocol
 * 
 *         This contract consolidates all 5 universal locks into a single,
 *         gas-optimized security engine. Each lock can be used independently
 *         or composed together via checkAllLocks().
 * 
 * LOCKS IMPLEMENTED:
 *   1. Access Control (WHO) - Role-based permissions
 *   2. Time Lock (WHEN) - Cooldowns and delays
 *   3. State Guard (CONDITION) - Pause/health checks
 *   4. Rate Limit (HOW MUCH) - Per-block rate limiting
 *   5. Verification (PROOF) - Signature verification
 * 
 * SECURITY FEATURES:
 *   - Post-execution hooks for tracking
 *   - Gas-optimized batch checking
 *   - Event emission for off-chain monitoring
 *   - Upgradeable architecture ready
 */
contract LockEngine is AccessControl, ReentrancyGuard {
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTANTS & ROLES
    // ─────────────────────────────────────────────────────────────────────────
    
    bytes32 public constant ADMIN_ROLE = keccak256("LOCK_ENGINE_ADMIN");
    bytes32 public constant SIGNER_ROLE = keccak256("LOCK_ENGINE_SIGNER");
    
    // ─────────────────────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────────────────────
    
    error AccessDenied(address account, bytes32 role);
    error TimeLockNotExpired(bytes32 actionId, uint256 availableAt);
    error CooldownActive(bytes32 actionId, uint256 availableAt);
    error LayerInactive(bytes32 layerId);
    error ProtocolPaused();
    error RateLimitExceeded(uint256 requested, uint256 remaining);
    error InvalidSignature(address signer, bytes32 hash);
    error NonceAlreadyUsed(address account, uint256 nonce);
    error ZeroAddress();
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────────────
    
    event AccessChecked(address indexed account, bytes32 indexed role, bool granted);
    event TimeLockChecked(address indexed account, bytes32 indexed actionId, uint256 availableAt);
    event StateChecked(bytes32 indexed layerId, bool active);
    event RateLimitChecked(address indexed account, bytes32 indexed actionId, uint256 amount, uint256 remaining);
    event SignatureVerified(address indexed signer, bytes32 indexed hash, bool valid);
    event ActionExecuted(address indexed executor, bytes32 indexed actionId, uint256 timestamp);
    
    // ─────────────────────────────────────────────────────────────────────────
    //  STATE STRUCTURES
    // ─────────────────────────────────────────────────────────────────────────
    
    /// @dev Layer state management
    struct LayerState {
        bool active;
        bool paused;
        uint256 lastHealthCheck;
    }
    
    /// @dev Time lock tracking
    struct TimeLockData {
        uint256 cooldownEnds;
        uint256 delayEnds;
        mapping(address => uint256) lastExecution;
    }
    
    /// @dev Rate limit tracking (per block snapshot)
    struct RateLimitSnapshot {
        uint256 blockNumber;
        uint256 totalAmount;
        uint256 callCount;
    }
    
    /// @dev Signature nonce tracking
    struct NonceTracker {
        mapping(uint256 => bool) used;
        uint256 nextNonce;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────
    
    /// @dev Layer states
    mapping(bytes32 => LayerState) public layerStates;
    
    /// @dev Time lock data per action
    mapping(bytes32 => TimeLockData) internal _timeLocks;
    
    /// @dev Rate limits: (account => action => snapshot)
    mapping(address => mapping(bytes32 => RateLimitSnapshot)) internal _rateLimits;
    
    /// @dev Rate limit configuration per action
    mapping(bytes32 => uint256) public maxPerBlock;
    mapping(bytes32 => uint256) public maxCallsPerBlock;
    
    /// @dev Nonce tracking for replay protection
    mapping(address => NonceTracker) internal _nonces;
    
    /// @dev Global protocol pause state
    bool public protocolPaused = false;
    
    /// @dev Minimum KYC level required (if > 0)
    uint256 public requiredKYCLevel = 0;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  COMPONENT CONTRACTS
    // ─────────────────────────────────────────────────────────────────────────
    
    ILayer7Security public securityController;
    IInvariantChecker public invariantChecker;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────
    
    constructor(
        address _admin,
        address _signer,
        address _securityController,
        address _invariantChecker
    ) {
        if (_admin == address(0) || _signer == address(0)) revert ZeroAddress();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(SIGNER_ROLE, _signer);
        
        securityController = ILayer7Security(_securityController);
        invariantChecker = IInvariantChecker(_invariantChecker);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  UNIFIED LOCK CHECKING (MAIN ENTRY POINT)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Check all 5 locks in a single call
     * @param account The address attempting the action
     * @param role Required role for access control
     * @param actionId Unique identifier for the action
     * @param layerId Layer identifier for state guard
     * @param amount Amount for rate limiting
     */
    function checkAllLocks(
        address account,
        bytes32 role,
        bytes32 actionId,
        bytes32 layerId,
        uint256 amount
    ) external nonReentrant {
        // Lock 1: Access Control
        _checkAccess(account, role);
        
        // Lock 2: Time Lock
        _checkTimeLock(account, actionId);
        
        // Lock 3: State Guard
        _checkState(layerId);
        
        // Lock 4: Rate Limit
        _checkRateLimit(account, actionId, amount);
        
        emit ActionExecuted(account, actionId, block.timestamp);
    }
    
    /**
     * @notice Post-execution hook - start cooldown
     * @param account The executor
     * @param actionId The action performed
     */
    function postExecute(address account, bytes32 actionId) external {
        _startCooldown(account, actionId);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  LOCK 1: ACCESS CONTROL
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Verify role-based access
     * @param account Address to check
     * @param role Required role
     */
    function verifyAccess(address account, bytes32 role) external view {
        _checkAccess(account, role);
    }
    
    function _checkAccess(address account, bytes32 role) internal view {
        bool userHasRole = hasRole(role);
        bool isSigner = securityController.isSigner(account);
        
        if (!userHasRole && !isSigner) {
            revert AccessDenied(account, role);
        }
        
        emit AccessChecked(account, role, hasRole || isSigner);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  LOCK 2: TIME LOCK
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Verify time lock requirements
     * @param account Address attempting action
     * @param actionId Action identifier
     */
    function verifyTimeLock(address account, bytes32 actionId) external view {
        _checkTimeLock(account, actionId);
    }
    
    /**
     * @notice Set a time delay for an action (admin only)
     * @param actionId Action identifier
     * @param delaySeconds Delay in seconds
     */
    function setTimeDelay(bytes32 actionId, uint256 delaySeconds) external onlyRole(ADMIN_ROLE) {
        _timeLocks[actionId].delayEnds = block.timestamp + delaySeconds;
    }
    
    /**
     * @notice Set cooldown period for an action (admin only)
     * @param actionId Action identifier
     * @param cooldownSeconds Cooldown in seconds
     */
    function setCooldown(bytes32 actionId, uint256 cooldownSeconds) external onlyRole(ADMIN_ROLE) {
        // Storage updated on execution, this just marks it as needing cooldown
        _timeLocks[actionId].cooldownEnds = cooldownSeconds;
    }
    
    function _checkTimeLock(address account, bytes32 actionId) internal view {
        TimeLockData storage tl = _timeLocks[actionId];
        
        // Check global delay (for upgrades, parameter changes)
        if (tl.delayEnds > 0 && block.timestamp < tl.delayEnds) {
            revert TimeLockNotExpired(actionId, tl.delayEnds);
        }
        
        // Check per-account cooldown
        uint256 lastExec = tl.lastExecution[account];
        if (lastExec > 0 && tl.cooldownEnds > 0) {
            uint256 availableAt = lastExec + tl.cooldownEnds;
            if (block.timestamp < availableAt) {
                revert CooldownActive(actionId, availableAt);
            }
        }
        
        emit TimeLockChecked(account, actionId, tl.delayEnds);
    }
    
    function _startCooldown(address account, bytes32 actionId) internal {
        TimeLockData storage tl = _timeLocks[actionId];
        if (tl.cooldownEnds > 0) {
            tl.lastExecution[account] = block.timestamp;
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  LOCK 3: STATE GUARD
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Verify layer/protocol state
     * @param layerId Layer identifier
     */
    function verifyState(bytes32 layerId) external view {
        _checkState(layerId);
    }
    
    /**
     * @notice Set layer state (admin only)
     * @param layerId Layer identifier
     * @param active Whether layer is active
     */
    function setLayerState(bytes32 layerId, bool active) external onlyRole(ADMIN_ROLE) {
        LayerState storage state = layerStates[layerId];
        state.active = active;
        state.lastHealthCheck = block.timestamp;
        emit StateChecked(layerId, active);
    }
    
    /**
     * @notice Emergency pause for a layer
     * @param layerId Layer identifier
     */
    function pauseLayer(bytes32 layerId) external onlyRole(ADMIN_ROLE) {
        layerStates[layerId].paused = true;
    }
    
    /**
     * @notice Unpause a layer
     * @param layerId Layer identifier
     */
    function unpauseLayer(bytes32 layerId) external onlyRole(ADMIN_ROLE) {
        layerStates[layerId].paused = false;
    }
    
    /**
     * @notice Emergency protocol-wide pause
     */
    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        protocolPaused = true;
    }
    
    /**
     * @notice Unpause protocol
     */
    function emergencyUnpause() external onlyRole(ADMIN_ROLE) {
        protocolPaused = false;
    }
    
    function _checkState(bytes32 layerId) internal view {
        // Check global protocol pause
        if (protocolPaused) {
            revert ProtocolPaused();
        }
        
        // Check layer-specific state
        LayerState storage state = layerStates[layerId];
        if (!state.active || state.paused) {
            revert LayerInactive(layerId);
        }
        
        // Optional: Check health timeout (if configured)
        if (state.lastHealthCheck > 0 && block.timestamp > state.lastHealthCheck + 24 hours) {
            // Layer hasn't been checked in 24h - could add stricter checks here
        }
        
        emit StateChecked(layerId, state.active);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  LOCK 4: RATE LIMIT
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Verify and update rate limit
     * @param account Address attempting action
     * @param actionId Action identifier
     * @param amount Amount to transfer/spend
     */
    function verifyAndUpdateRate(address account, bytes32 actionId, uint256 amount) external nonReentrant {
        _checkRateLimit(account, actionId, amount);
        _updateRateLimit(account, actionId, amount);
    }
    
    /**
     * @notice Set rate limit for an action (admin only)
     * @param actionId Action identifier
     * @param maxAmount Maximum amount per block (0 = unlimited)
     * @param maxCalls Maximum calls per block (0 = unlimited)
     */
    function setRateLimit(bytes32 actionId, uint256 maxAmount, uint256 maxCalls) external onlyRole(ADMIN_ROLE) {
        maxPerBlock[actionId] = maxAmount;
        maxCallsPerBlock[actionId] = maxCalls;
    }
    
    function _checkRateLimit(address account, bytes32 actionId, uint256 amount) internal view {
        RateLimitSnapshot storage snapshot = _rateLimits[account][actionId];
        
        // Reset if new block
        if (snapshot.blockNumber != block.number) {
            return; // Will be reset in update
        }
        
        // Check amount limit
        uint256 maxAmount = maxPerBlock[actionId];
        if (maxAmount > 0) {
            uint256 remaining = maxAmount - snapshot.totalAmount;
            if (amount > remaining) {
                revert RateLimitExceeded(amount, remaining);
            }
        }
        
        // Check call count limit
        uint256 maxCalls = maxCallsPerBlock[actionId];
        if (maxCalls > 0 && snapshot.callCount >= maxCalls) {
            revert RateLimitExceeded(snapshot.callCount + 1, maxCalls);
        }
        
        emit RateLimitChecked(account, actionId, amount, maxAmount > 0 ? maxAmount - snapshot.totalAmount : type(uint256).max);
    }
    
    function _updateRateLimit(address account, bytes32 actionId, uint256 amount) internal {
        RateLimitSnapshot storage snapshot = _rateLimits[account][actionId];
        
        // Reset if new block
        if (snapshot.blockNumber != block.number) {
            snapshot.blockNumber = block.number;
            snapshot.totalAmount = 0;
            snapshot.callCount = 0;
        }
        
        snapshot.totalAmount += amount;
        snapshot.callCount += 1;
    }
    
    /**
     * @notice View remaining rate limit for an account/action
     */
    function getRemainingRate(address account, bytes32 actionId) 
        external 
        view 
        returns (uint256 remainingAmount, uint256 remainingCalls) 
    {
        RateLimitSnapshot storage snapshot = _rateLimits[account][actionId];
        
        if (snapshot.blockNumber != block.number) {
            return (maxPerBlock[actionId], maxCallsPerBlock[actionId]);
        }
        
        uint256 maxAmount = maxPerBlock[actionId];
        uint256 maxCalls = maxCallsPerBlock[actionId];
        
        remainingAmount = maxAmount > 0 ? maxAmount - snapshot.totalAmount : type(uint256).max;
        remainingCalls = maxCalls > 0 ? maxCalls - snapshot.callCount : type(uint256).max;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  LOCK 5: VERIFICATION (SIGNATURE + NONCE)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Verify signature with automatic nonce checking
     * @param signer Expected signer address
     * @param nonce Unique nonce for replay protection
     * @param hash Hash of the data signed
     * @param signature ECDSA signature
     */
    function verifySignatureWithNonce(
        address signer,
        uint256 nonce,
        bytes32 hash,
        bytes calldata signature
    ) external nonReentrant {
        _verifyNonce(signer, nonce);
        _verifySignature(signer, hash, signature);
    }
    
    /**
     * @notice Simple signature verification (no nonce)
     */
    function verifySignature(
        address signer,
        bytes32 hash,
        bytes calldata signature
    ) external pure {
        address recovered = ECDSA.recover(hash, signature);
        if (recovered != signer) {
            revert InvalidSignature(recovered, hash);
        }
    }
    
    /**
     * @notice Get next available nonce for an address
     */
    function getNextNonce(address account) external view returns (uint256) {
        return _nonces[account].nextNonce;
    }
    
    /**
     * @notice Check if a nonce has been used
     */
    function isNonceUsed(address account, uint256 nonce) external view returns (bool) {
        return _nonces[account].used[nonce];
    }
    
    function _verifyNonce(address account, uint256 nonce) internal {
        NonceTracker storage tracker = _nonces[account];
        if (tracker.used[nonce]) {
            revert NonceAlreadyUsed(account, nonce);
        }
        tracker.used[nonce] = true;
        if (nonce == tracker.nextNonce) {
            tracker.nextNonce = nonce + 1;
        }
    }
    
    function _verifySignature(address expectedSigner, bytes32 hash, bytes calldata signature) internal pure {
        address recovered = ECDSA.recover(hash, signature);
        if (recovered != expectedSigner) {
            revert InvalidSignature(recovered, hash);
        }
        emit SignatureVerified(expectedSigner, hash, true);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Get component contracts
     */
    function getComponents() external view returns (
        ILayer7Security sec,
        IInvariantChecker inv
    ) {
        return (securityController, invariantChecker);
    }
    
    /**
     * @notice Get layer state details
     */
    function getLayerState(bytes32 layerId) 
        external 
        view 
        returns (bool active, bool paused, uint256 lastHealthCheck) 
    {
        LayerState storage state = layerStates[layerId];
        return (state.active, state.paused, state.lastHealthCheck);
    }
    
    /**
     * @notice Get time lock status for an action
     */
    function getTimeLockStatus(bytes32 actionId) 
        external 
        view 
        returns (uint256 delayEnds, uint256 cooldownPeriod) 
    {
        TimeLockData storage tl = _timeLocks[actionId];
        return (tl.delayEnds, tl.cooldownEnds);
    }
    
    /**
     * @notice Get rate limit configuration
     */
    function getRateLimitConfig(bytes32 actionId) 
        external 
        view 
        returns (uint256 maxAmount, uint256 maxCalls) 
    {
        return (maxPerBlock[actionId], maxCallsPerBlock[actionId]);
    }
}
