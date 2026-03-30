// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  Launchpad
 * @notice IDO (Initial DEX Offering) with DWT-tier allocation system.
 *
 *         Tiers (mirrors NFTMembership tiers):
 *           0 — Bronze   — guaranteed allocation × 1
 *           1 — Silver   — guaranteed allocation × 3
 *           2 — Gold     — guaranteed allocation × 8
 *           3 — Platinum — guaranteed allocation × 20
 *
 *         Sale phases:
 *           1. Whitelist phase: only DWT holders above minDWT can commit
 *           2. Public phase:    anyone can commit (first-come-first-served)
 *           3. Claim phase:     winners claim their IDO tokens
 *           4. Refund phase:    over-subscribed participants withdraw excess
 *
 *         The IDO token is vested: initial TGE unlock + linear cliff/vesting.
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./NFTMembership.sol";
import "../SecurityGated.sol";

// ── IDO token vesting schedule stored per participant ─────────────────────────
struct VestingSchedule {
    uint256 total;          // total IDO tokens allocated
    uint256 claimed;        // tokens already claimed
    uint256 tgeUnlock;      // tokens available at TGE
    uint256 vestingStart;   // unix timestamp
    uint256 vestingDuration;// seconds
}

contract Launchpad is ReentrancyGuard, Pausable, AccessControl, SecurityGated {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    bytes32 public constant LAYER_ID      = keccak256("LAYER_9_SETTLEMENT");

    // ── Errors ────────────────────────────────────────────────────────────────
    error SaleNotOpen();
    error SaleAlreadyFinalized();
    error SaleNotFinalized();
    error HardCapReached();
    error BelowMinCommit();
    error AboveMaxCommit();
    error InsufficientDWT();
    error InsufficientTierForPhase();
    error AlreadyClaimed();
    error NothingToRefund();
    error ClaimNotOpen();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidPhase();
    error ArrayLengthMismatch();

    // ── Events ────────────────────────────────────────────────────────────────
    event IDOCreated(uint256 indexed idoId, address idoToken, uint256 hardCap, uint256 price);
    event Committed(uint256 indexed idoId, address indexed participant, uint256 amount, uint8 tier);
    event Finalized(uint256 indexed idoId, uint256 totalRaised, uint256 tokensSold);
    event Claimed(uint256 indexed idoId, address indexed participant, uint256 tgeAmount);
    event VestedClaimed(uint256 indexed idoId, address indexed participant, uint256 amount);
    event Refunded(uint256 indexed idoId, address indexed participant, uint256 amount);
    event TierMultiplierUpdated(uint8 tier, uint256 multiplier);

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant PRECISION = 1e18;

    // ── IDO config ────────────────────────────────────────────────────────────
    struct IDOConfig {
        IERC20  idoToken;           // token being sold
        IERC20  raiseToken;         // token used to commit (e.g. USDC)
        uint256 price;              // raiseToken per idoToken (PRECISION-scaled)
        uint256 hardCap;            // max raiseToken to accept
        uint256 softCap;            // min raiseToken for success
        uint256 minCommit;          // per-wallet minimum
        uint256 maxCommitPublic;    // per-wallet max in public phase
        uint256 minDWTForWhitelist; // DWT held to enter whitelist phase
        uint256 whitelistStart;     // unix timestamp
        uint256 publicStart;        // unix timestamp
        uint256 saleEnd;            // unix timestamp
        uint256 claimStart;         // unix timestamp (TGE)
        uint256 tgePercent;         // % unlocked at TGE (PRECISION = 100%)
        uint256 vestingDuration;    // seconds after TGE for linear vesting
        bool    finalized;
        bool    cancelled;
        uint256 totalRaised;
        uint256 totalTokensSold;
    }

    // ── State ─────────────────────────────────────────────────────────────────
    IERC20         public immutable dwtToken;
    NFTMembership  public immutable membershipNFT;
    address        public treasury;

    uint256 public idoCount;
    mapping(uint256 => IDOConfig) public idos;

    /// @dev idoId → participant → committed amount
    mapping(uint256 => mapping(address => uint256)) public committed;

    /// @dev idoId → participant → vesting schedule
    mapping(uint256 => mapping(address => VestingSchedule)) public vestings;

    /// @dev idoId → participant → refund claimed?
    mapping(uint256 => mapping(address => bool)) public refundClaimed;

    /// @dev Tier → allocation multiplier (Bronze=1x, Silver=3x, Gold=8x, Platinum=20x)
    mapping(uint8 => uint256) public tierMultiplier;

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(
        address _dwtToken, 
        address _membershipNFT, 
        address _admin,
        address _governor,
        address _guardian,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    ) SecurityGated(_securityController) {
        if (_dwtToken     == address(0)) revert ZeroAddress();
        if (_membershipNFT == address(0)) revert ZeroAddress();
        dwtToken      = IERC20(_dwtToken);
        membershipNFT = NFTMembership(payable(_membershipNFT));

        tierMultiplier[0] = 1;   // Bronze
        tierMultiplier[1] = 3;   // Silver
        tierMultiplier[2] = 8;   // Gold
        tierMultiplier[3] = 20;  // Platinum
        treasury = _admin;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);
        _grantRole(GUARDIAN_ROLE,      _guardian);

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setTierMultiplier(uint8 tier, uint256 mult) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
    {
        tierMultiplier[tier] = mult;
        emit TierMultiplierUpdated(tier, mult);
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(GOVERNOR_ROLE) { _unpause(); }

    /**
     * @notice Set treasury address. Requires Committee Multi-Sig.
     */
    function setTreasury(address _treasury, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }

    // ── IDO creation ──────────────────────────────────────────────────────────

    /**
     * @notice Create a new IDO pool.
     */
    function createIDO(
        address idoToken,
        address raiseToken,
        uint256 price,
        uint256 hardCap,
        uint256 softCap,
        uint256 minCommit,
        uint256 maxCommitPublic,
        uint256 minDWTForWhitelist,
        uint256 whitelistStart,
        uint256 publicStart,
        uint256 saleEnd,
        uint256 claimStart,
        uint256 tgePercent,
        uint256 vestingDuration
    ) external onlyRole(GOVERNOR_ROLE) whenProtocolNotPaused returns (uint256 idoId) {
        if (idoToken   == address(0)) revert ZeroAddress();
        if (raiseToken == address(0)) revert ZeroAddress();

        idoId = ++idoCount;
        IDOConfig storage ido = idos[idoId];
        ido.idoToken            = IERC20(idoToken);
        ido.raiseToken          = IERC20(raiseToken);
        ido.price               = price;
        ido.hardCap             = hardCap;
        ido.softCap             = softCap;
        ido.minCommit           = minCommit;
        ido.maxCommitPublic     = maxCommitPublic;
        ido.minDWTForWhitelist  = minDWTForWhitelist;
        ido.whitelistStart      = whitelistStart;
        ido.publicStart         = publicStart;
        ido.saleEnd             = saleEnd;
        ido.claimStart          = claimStart;
        ido.tgePercent          = tgePercent;
        ido.vestingDuration     = vestingDuration;

        emit IDOCreated(idoId, idoToken, hardCap, price);
    }

    /**
     * @notice Fund the IDO with IDO tokens before the sale starts.
     */
    function fundIDO(uint256 idoId, uint256 amount) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        IDOConfig storage ido = idos[idoId];
        ido.idoToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    // ── Commit ────────────────────────────────────────────────────────────────

    /**
     * @notice Commit raise tokens to participate in an IDO.
     *         Whitelist phase: requires minDWT balance and/or NFT pass.
     *         Tier determines per-wallet allocation multiplier.
     * @param idoId  IDO to participate in
     * @param amount Raise token amount to commit
     */
    function commit(uint256 idoId, uint256 amount)
        external
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
        withStateGuard(LAYER_ID)
    {
        if (amount == 0) revert ZeroAmount();
        IDOConfig storage ido = idos[idoId];
        if (ido.finalized || ido.cancelled) revert SaleAlreadyFinalized();

        bool inWhitelist = block.timestamp >= ido.whitelistStart && block.timestamp < ido.publicStart;
        bool inPublic    = block.timestamp >= ido.publicStart    && block.timestamp <= ido.saleEnd;
        if (!inWhitelist && !inPublic) revert SaleNotOpen();

        // Whitelist phase gating
        if (inWhitelist) {
            if (dwtToken.balanceOf(msg.sender) < ido.minDWTForWhitelist)
                revert InsufficientDWT();
        }

        // Per-wallet cap based on tier
        uint256 maxAllowed = _maxCommitForUser(msg.sender, ido);
        uint256 newTotal   = committed[idoId][msg.sender] + amount;
        if (newTotal < ido.minCommit)    revert BelowMinCommit();
        if (newTotal > maxAllowed)       revert AboveMaxCommit();

        // Hard cap check
        if (ido.totalRaised + amount > ido.hardCap) revert HardCapReached();

        committed[idoId][msg.sender] = newTotal;
        ido.totalRaised             += amount;

        uint8 tier = _userTier(msg.sender);
        ido.raiseToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Committed(idoId, msg.sender, amount, tier);
    }

    // ── Finalization ──────────────────────────────────────────────────────────

    /**
     * @notice Finalize the IDO after saleEnd.
     *         If softCap met: calculates token allocations, transfers raised funds to owner.
     *         If softCap not met: marks cancelled for full refunds.
     */
    /**
     * @notice Finalize the IDO after saleEnd. Requires Committee Multi-Sig.
     */
    function finalizeIDO(uint256 idoId, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    {
        IDOConfig storage ido = idos[idoId];
        if (ido.finalized || ido.cancelled) revert SaleAlreadyFinalized();
        if (block.timestamp <= ido.saleEnd) revert SaleNotOpen();

        if (ido.totalRaised < ido.softCap) {
            ido.cancelled = true;
            return;
        }

        ido.finalized       = true;
        ido.totalTokensSold = (ido.totalRaised * PRECISION) / ido.price;

        // Transfer raised funds to treasury
        ido.raiseToken.safeTransfer(treasury, ido.totalRaised);

        emit Finalized(idoId, ido.totalRaised, ido.totalTokensSold);
    }

    // ── Claim ─────────────────────────────────────────────────────────────────

    /**
     * @notice Claim TGE allocation of IDO tokens.
     *         Sets up vesting schedule for the remainder.
     * @param idoId IDO to claim from
     */
    function claim(uint256 idoId) 
        external 
        nonReentrant 
        whenNotPaused 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        IDOConfig storage ido = idos[idoId];
        if (!ido.finalized)                          revert SaleNotFinalized();
        if (block.timestamp < ido.claimStart)        revert ClaimNotOpen();

        uint256 userCommit = committed[idoId][msg.sender];
        if (userCommit == 0)                         revert ZeroAmount();

        VestingSchedule storage vs = vestings[idoId][msg.sender];
        if (vs.total > 0)                            revert AlreadyClaimed();

        // Pro-rata allocation
        uint256 userTokens = (userCommit * ido.totalTokensSold) / ido.totalRaised;
        uint256 tgeAmount  = (userTokens * ido.tgePercent) / PRECISION;
        uint256 vestAmount = userTokens - tgeAmount;

        vs.total           = userTokens;
        vs.tgeUnlock       = tgeAmount;
        vs.vestingStart    = ido.claimStart;
        vs.vestingDuration = ido.vestingDuration;

        if (tgeAmount > 0) {
            vs.claimed = tgeAmount;
            ido.idoToken.safeTransfer(msg.sender, tgeAmount);
        }

        emit Claimed(idoId, msg.sender, tgeAmount);
    }

    /**
     * @notice Claim linearly vested IDO tokens.
     * @param idoId IDO to claim vested tokens from
     */
    function claimVested(uint256 idoId) 
        external 
        nonReentrant 
        whenNotPaused 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        VestingSchedule storage vs = vestings[idoId][msg.sender];
        if (vs.total == 0) revert ZeroAmount();

        uint256 vested  = _vestedAmount(vs);
        uint256 claimable = vested - vs.claimed;
        if (claimable == 0) revert ZeroAmount();

        vs.claimed += claimable;
        idos[idoId].idoToken.safeTransfer(msg.sender, claimable);

        emit VestedClaimed(idoId, msg.sender, claimable);
    }

    function _vestedAmount(VestingSchedule storage vs) internal view returns (uint256) {
        if (block.timestamp < vs.vestingStart) return vs.tgeUnlock;
        if (vs.vestingDuration == 0)           return vs.total;
        uint256 elapsed = block.timestamp - vs.vestingStart;
        if (elapsed >= vs.vestingDuration)     return vs.total;
        uint256 vestable = vs.total - vs.tgeUnlock;
        return vs.tgeUnlock + (vestable * elapsed) / vs.vestingDuration;
    }

    // ── Refunds ───────────────────────────────────────────────────────────────

    /**
     * @notice Claim full refund if IDO was cancelled (softCap not met).
     * @param idoId IDO to refund from
     */
    function refund(uint256 idoId) external nonReentrant whenProtocolNotPaused {
        IDOConfig storage ido = idos[idoId];
        if (!ido.cancelled) revert SaleNotFinalized();

        uint256 amount = committed[idoId][msg.sender];
        if (amount == 0)                           revert NothingToRefund();
        if (refundClaimed[idoId][msg.sender])      revert AlreadyClaimed();

        refundClaimed[idoId][msg.sender] = true;
        committed[idoId][msg.sender]     = 0;

        ido.raiseToken.safeTransfer(msg.sender, amount);
        emit Refunded(idoId, msg.sender, amount);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _userTier(address user) internal view returns (uint8) {
        uint8 tier = membershipNFT.activeTier(user);
        return tier == type(uint8).max ? 0 : tier;
    }

    function _maxCommitForUser(address user, IDOConfig storage ido)
        internal
        view
        returns (uint256)
    {
        uint8   tier  = _userTier(user);
        uint256 mult  = tierMultiplier[tier];
        return ido.maxCommitPublic * mult;
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function pendingVested(uint256 idoId, address user) external view returns (uint256) {
        VestingSchedule storage vs = vestings[idoId][user];
        if (vs.total == 0) return 0;
        return _vestedAmount(vs) - vs.claimed;
    }

    function idoPhase(uint256 idoId) external view returns (string memory) {
        IDOConfig storage ido = idos[idoId];
        if (ido.cancelled)                              return "cancelled";
        if (ido.finalized)                              return "ended";
        if (block.timestamp < ido.whitelistStart)       return "pending";
        if (block.timestamp < ido.publicStart)          return "whitelist";
        if (block.timestamp <= ido.saleEnd)             return "public";
        return "finalization";
    }
}
