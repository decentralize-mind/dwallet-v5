// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../SecurityGated.sol";

/**
 * @title InsuranceFund
 * @notice Protocol insurance fund with pause gating via Layer 7.
 */
contract InsuranceFund is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE           = keccak256("ADMIN_ROLE");
    bytes32 public constant CLAIM_COMMITTEE_ROLE = keccak256("CLAIM_COMMITTEE_ROLE");
    bytes32 public constant GUARDIAN_ROLE        = keccak256("GUARDIAN_ROLE");

    IERC20 public immutable fundToken;

    enum ClaimStatus { None, Pending, Approved, Executed, Rejected }

    struct Claim {
        address   claimant;
        uint256   amount;
        string    reason;
        ClaimStatus status;
        uint256   submittedAt;
        uint256   approvedAt;
    }

    mapping(uint256 => Claim) public claims;
    uint256 public nextClaimId;

    uint256 public maxClaimBps;
    uint256 public rollingCapBps;
    uint256 public executionDelay;

    uint256 public rollingWindowStart;
    uint256 public rollingWindowPaid;
    uint256 public constant ROLLING_WINDOW = 30 days;
    uint256 public constant BPS            = 10_000;

    event ClaimSubmitted(uint256 indexed claimId, address claimant, uint256 amount, string reason);
    event ClaimApproved(uint256 indexed claimId, address committee, uint256 executeAfter);
    event ClaimExecuted(uint256 indexed claimId, address claimant, uint256 amount);
    event ClaimRejected(uint256 indexed claimId, address committee);
    event FundDeposited(address indexed from, uint256 amount);

    bytes32 public constant LAYER_ID = keccak256("LAYER_5_INSURANCE");
    bytes32 public constant CLAIM_ACTION = keccak256("CLAIM_ACTION");

    constructor(
        address _fundToken,
        uint256 _maxClaimBps,
        uint256 _rollingCapBps,
        uint256 _executionDelay,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify,
        address admin,
        address committee,
        address guardian
    ) SecurityGated(_securityController) {
        require(_fundToken     != address(0), "Insurance: zero token");
        require(_maxClaimBps   <= BPS,        "Insurance: max claim overflow");
        require(_rollingCapBps <= BPS,        "Insurance: rolling cap overflow");

        fundToken        = IERC20(_fundToken);
        maxClaimBps      = _maxClaimBps;
        rollingCapBps    = _rollingCapBps;
        executionDelay   = _executionDelay;
        rollingWindowStart = block.timestamp;

        _initSecurityModules(_access, _time, _state, _rate, _verify);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(CLAIM_COMMITTEE_ROLE, committee);
        _grantRole(GUARDIAN_ROLE,      guardian);
    }

    // ─── Claim Lifecycle ──────────────────────────────────────────────────────
    /**
     * @notice Submit a new insurance claim.
     */
    function submitClaim(uint256 amount, string calldata reason)
        external
        whenNotPaused
        whenProtocolNotPaused
        returns (uint256 claimId)
    {
        require(amount > 0, "Insurance: zero amount");

        claimId = nextClaimId++;
        claims[claimId] = Claim({
            claimant:    msg.sender,
            amount:      amount,
            reason:      reason,
            status:      ClaimStatus.Pending,
            submittedAt: block.timestamp,
            approvedAt:  0
        });

        emit ClaimSubmitted(claimId, msg.sender, amount, reason);
    }

    /**
     * @notice Approve a pending claim.
     */
    function approveClaim(uint256 claimId)
        external
        onlyRole(CLAIM_COMMITTEE_ROLE)
        whenNotPaused
        whenProtocolNotPaused
    {
        Claim storage c = claims[claimId];
        require(c.status == ClaimStatus.Pending, "Insurance: not pending");

        uint256 fundBalance = fundToken.balanceOf(address(this));
        require(
            c.amount <= (fundBalance * maxClaimBps) / BPS,
            "Insurance: exceeds per-claim cap"
        );

        c.status     = ClaimStatus.Approved;
        c.approvedAt = block.timestamp;

        emit ClaimApproved(claimId, msg.sender, block.timestamp + executionDelay);
    }

    function rejectClaim(uint256 claimId) external onlyRole(CLAIM_COMMITTEE_ROLE) {
        Claim storage c = claims[claimId];
        require(c.status == ClaimStatus.Pending || c.status == ClaimStatus.Approved,
                "Insurance: cannot reject");
        c.status = ClaimStatus.Rejected;
        emit ClaimRejected(claimId, msg.sender);
    }

    /**
     * @notice Execute an approved claim. Requires Hash + Signature + Delay.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Verification: withSignature(hash, signature)
     *      3. Time: withTimeLock(CLAIM_ACTION)
     *      4. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function executeClaim(uint256 claimId, bytes32 hash, bytes calldata signature) 
        external 
        nonReentrant 
        whenNotPaused 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withSignature(hash, signature)
        withTimeLock(CLAIM_ACTION)
    {
        Claim storage c = claims[claimId];
        require(c.status     == ClaimStatus.Approved,                     "Insurance: not approved");
        require(block.timestamp >= c.approvedAt + executionDelay,         "Insurance: delay not elapsed");

        uint256 fundBalance = fundToken.balanceOf(address(this));
        require(
            c.amount <= (fundBalance * maxClaimBps) / BPS,
            "Insurance: exceeds per-claim cap"
        );

        _updateRollingWindow();
        require(
            rollingWindowPaid + c.amount <= (fundBalance * rollingCapBps) / BPS,
            "Insurance: rolling cap exceeded"
        );

        c.status          = ClaimStatus.Executed;
        rollingWindowPaid += c.amount;

        fundToken.safeTransfer(c.claimant, c.amount);
        emit ClaimExecuted(claimId, c.claimant, c.amount);
    }

    function _updateRollingWindow() internal {
        if (block.timestamp >= rollingWindowStart + ROLLING_WINDOW) {
            rollingWindowStart = block.timestamp;
            rollingWindowPaid  = 0;
        }
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function setMaxClaimBps(uint256 bps) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(bps <= BPS, "Insurance: overflow");
        maxClaimBps = bps;
    }

    function setRollingCapBps(uint256 bps) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(bps <= BPS, "Insurance: overflow");
        rollingCapBps = bps;
    }

    function setExecutionDelay(uint256 delay) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        executionDelay = delay;
    }

    function deposit(uint256 amount) external whenNotPaused whenProtocolNotPaused {
        require(amount > 0, "Insurance: zero deposit");
        fundToken.safeTransferFrom(msg.sender, address(this), amount);
        emit FundDeposited(msg.sender, amount);
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }
}
