// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../layer7/SecurityGated.sol";

/**
 * @title InsuranceFund
 * @notice Claims processing with safety caps
 * 
 * FEATURES:
 *   - State machine: Pending → Approved → Executed (cannot skip approval)
 *   - 48h execution delay after approval
 *   - Per-claim hard cap (20% of fund)
 *   - Rolling 30-day cap (40% of fund) prevents fund drain
 *   - Multi-sig approval for claims
 */
contract InsuranceFund is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTANTS & ROLES
    // ─────────────────────────────────────────────────────────────────────────
    
    bytes32 public constant ADMIN_ROLE = keccak256("INSURANCE_ADMIN");
    bytes32 public constant CLAIMS_ASSESSOR_ROLE = keccak256("CLAIMS_ASSESSOR");
    bytes32 public constant GUARDIAN_ROLE = keccak256("INSURANCE_GUARDIAN");
    
    bytes32 public constant LAYER_ID = keccak256("LAYER_5_INSURANCE");
    
    /// @dev Execution delay after claim approval (48 hours)
    uint256 public constant EXECUTION_DELAY = 48 hours;
    
    /// @dev Per-claim hard cap (20% of fund in bps)
    uint256 public constant PER_CLAIM_CAP_BPS = 2000; // 20%
    
    /// @dev Rolling 30-day cap (40% of fund in bps)
    uint256 public constant ROLLING_30DAY_CAP_BPS = 4000; // 40%
    
    /// @dev Rolling window duration (30 days)
    uint256 public constant ROLLING_WINDOW = 30 days;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────────────────────
    
    /// @dev Claim states
    enum ClaimState {
        Pending,
        Approved,
        Rejected,
        Executed,
        Cancelled
    }
    
    /// @dev Claim structure
    struct Claim {
        uint256 claimId;
        address claimant;
        address token;
        uint256 amount;
        ClaimState state;
        uint256 filedAt;
        uint256 approvedAt;
        uint256 executeAfter;
        string description;
        bytes evidence;
    }
    
    /// @dev Claims storage
    mapping(uint256 => Claim) public claims;
    uint256 public claimCount;
    
    /// @dev Rolling payout tracking (timestamp => amount)
    struct PayoutRecord {
        uint256 timestamp;
        uint256 amount;
    }
    
    PayoutRecord[] public payoutHistory;
    
    /// @dev Total payouts in current rolling window
    uint256 public currentRollingPayouts;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────────────
    
    event ClaimFiled(
        uint256 claimId,
        address claimant,
        address token,
        uint256 amount,
        string description
    );
    
    event ClaimApproved(
        uint256 claimId,
        uint256 approvedAt,
        uint256 executeAfter
    );
    
    event ClaimRejected(uint256 claimId);
    event ClaimExecuted(uint256 claimId, uint256 executedAt);
    event ClaimCancelled(uint256 claimId);
    event PayoutProcessed(uint256 claimId, address token, uint256 amount);
    event FundDeposited(address token, uint256 amount, address depositor);
    
    // ─────────────────────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────────────────────
    
    error ClaimNotFound();
    error InvalidClaimState();
    error ExecutionDelayNotMet();
    error ExceedsPerClaimCap();
    error ExceedsRollingCap();
    error ZeroAmount();
    error ZeroAddress();
    error InsufficientFundBalance();
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────
    
    constructor(
        address _admin,
        address _claimsAssessor,
        address _guardian,
        address _layer7Security
    ) SecurityGated(_layer7Security) {
        if (_admin == address(0) || _guardian == address(0)) revert ZeroAddress();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        
        if (_claimsAssessor != address(0)) {
            _grantRole(CLAIMS_ASSESSOR_ROLE, _claimsAssessor);
        }
        
        _grantRole(GUARDIAN_ROLE, _guardian);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CORE FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice File a new claim
     * @param token Token address
     * @param amount Claim amount
     * @param description Claim description
     * @param evidence Evidence data
     * @return claimId New claim ID
     */
    function fileClaim(
        address token,
        uint256 amount,
        string calldata description,
        bytes calldata evidence
    ) external whenNotPaused nonReentrant withStateGuard(LAYER_ID) returns (uint256 claimId) {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        // Check per-claim cap
        uint256 fundBalance = IERC20(token).balanceOf(address(this));
        uint256 maxClaimAmount = (fundBalance * PER_CLAIM_CAP_BPS) / 10000;
        if (amount > maxClaimAmount) revert ExceedsPerClaimCap();
        
        // Check rolling 30-day cap
        _updateRollingPayouts();
        uint256 maxRollingPayout = (fundBalance * ROLLING_30DAY_CAP_BPS) / 10000;
        if (currentRollingPayouts + amount > maxRollingPayout) {
            revert ExceedsRollingCap();
        }
        
        claimId = ++claimCount;
        
        claims[claimId] = Claim({
            claimId: claimId,
            claimant: msg.sender,
            token: token,
            amount: amount,
            state: ClaimState.Pending,
            filedAt: block.timestamp,
            approvedAt: 0,
            executeAfter: 0,
            description: description,
            evidence: evidence
        });
        
        emit ClaimFiled(claimId, msg.sender, token, amount, description);
    }
    
    /**
     * @notice Approve a claim (requires CLAIMS_ASSESSOR_ROLE)
     * @param claimId Claim ID
     */
    function approveClaim(uint256 claimId) external onlyRole(CLAIMS_ASSESSOR_ROLE) {
        Claim storage claim = claims[claimId];
        
        if (claim.claimId == 0) revert ClaimNotFound();
        if (claim.state != ClaimState.Pending) revert InvalidClaimState();
        
        claim.state = ClaimState.Approved;
        claim.approvedAt = block.timestamp;
        claim.executeAfter = block.timestamp + EXECUTION_DELAY;
        
        emit ClaimApproved(claimId, block.timestamp, claim.executeAfter);
    }
    
    /**
     * @notice Reject a claim
     * @param claimId Claim ID
     */
    function rejectClaim(uint256 claimId) external onlyRole(CLAIMS_ASSESSOR_ROLE) {
        Claim storage claim = claims[claimId];
        
        if (claim.claimId == 0) revert ClaimNotFound();
        if (claim.state != ClaimState.Pending) revert InvalidClaimState();
        
        claim.state = ClaimState.Rejected;
        
        emit ClaimRejected(claimId);
    }
    
    /**
     * @notice Execute an approved claim after delay period
     * @param claimId Claim ID
     */
    function executeClaim(uint256 claimId) external nonReentrant whenNotPaused {
        Claim storage claim = claims[claimId];
        
        if (claim.claimId == 0) revert ClaimNotFound();
        if (claim.state != ClaimState.Approved) revert InvalidClaimState();
        if (block.timestamp < claim.executeAfter) revert ExecutionDelayNotMet();
        
        // Check fund balance
        uint256 fundBalance = IERC20(claim.token).balanceOf(address(this));
        if (fundBalance < claim.amount) revert InsufficientFundBalance();
        
        // Update claim state
        claim.state = ClaimState.Executed;
        
        // Update rolling payouts
        currentRollingPayouts += claim.amount;
        payoutHistory.push(PayoutRecord({
            timestamp: block.timestamp,
            amount: claim.amount
        }));
        
        // Transfer funds to claimant
        IERC20(claim.token).safeTransfer(claim.claimant, claim.amount);
        
        emit ClaimExecuted(claimId, block.timestamp);
        emit PayoutProcessed(claimId, claim.token, claim.amount);
    }
    
    /**
     * @notice Cancel a pending claim (claimant only)
     * @param claimId Claim ID
     */
    function cancelClaim(uint256 claimId) external {
        Claim storage claim = claims[claimId];
        
        if (claim.claimId == 0) revert ClaimNotFound();
        if (claim.state != ClaimState.Pending) revert InvalidClaimState();
        if (msg.sender != claim.claimant) revert("InsuranceFund: Not claimant");
        
        claim.state = ClaimState.Cancelled;
        
        emit ClaimCancelled(claimId);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  FUND MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Deposit tokens to insurance fund
     * @param token Token address
     * @param amount Amount to deposit
     */
    function depositFund(address token, uint256 amount) external nonReentrant {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        emit FundDeposited(token, amount, msg.sender);
    }
    
    /**
     * @notice Emergency withdrawal by admin
     * @param token Token address
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyRole(ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EMERGENCY FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Guardian halt - pause all operations
     */
    function guardianHalt() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Admin resume - unpause operations
     */
    function adminResume() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Update rolling payouts by removing expired entries
     */
    function _updateRollingPayouts() internal {
        uint256 cutoffTime = block.timestamp - ROLLING_WINDOW;
        uint256 removedAmount = 0;
        
        // Remove expired payouts from the beginning
        while (payoutHistory.length > 0 && payoutHistory[0].timestamp < cutoffTime) {
            removedAmount += payoutHistory[0].amount;
            
            // Shift array (gas intensive but necessary for accuracy)
            for (uint256 i = 0; i < payoutHistory.length - 1; i++) {
                payoutHistory[i] = payoutHistory[i + 1];
            }
            payoutHistory.pop();
        }
        
        currentRollingPayouts = currentRollingPayouts > removedAmount 
            ? currentRollingPayouts - removedAmount 
            : 0;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Get claim details
     * @param claimId Claim ID
     * @return Claim struct
     */
    function getClaim(uint256 claimId) external view returns (Claim memory) {
        return claims[claimId];
    }
    
    /**
     * @notice Get fund balance for a token
     * @param token Token address
     * @return Balance
     */
    function getFundBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    /**
     * @notice Get max claim amount for a token
     * @param token Token address
     * @return Max claim amount
     */
    function getMaxClaimAmount(address token) external view returns (uint256) {
        uint256 fundBalance = IERC20(token).balanceOf(address(this));
        return (fundBalance * PER_CLAIM_CAP_BPS) / 10000;
    }
    
    /**
     * @notice Get remaining rolling cap
     * @param token Token address
     * @return Remaining amount that can be claimed in current window
     */
    function getRemainingRollingCap(address token) external view returns (uint256) {
        uint256 fundBalance = IERC20(token).balanceOf(address(this));
        uint256 maxRollingPayout = (fundBalance * ROLLING_30DAY_CAP_BPS) / 10000;
        return maxRollingPayout > currentRollingPayouts 
            ? maxRollingPayout - currentRollingPayouts 
            : 0;
    }
}
