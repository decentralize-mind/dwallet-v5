// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../../SecurityGated.sol";

/**
 * @title FeeSplitter
 * @notice Automatically routes incoming protocol fee tokens from
 *         DWalletFeeRouter to Treasury, RewardDistributor, and
 *         BuybackAndBurn according to governance-set percentages.
 *
 * ─────────────────────────────────────────────────────────────────
 * Architecture:
 *
 *   DWalletFeeRouter
 *       │  (sends fee tokens here instead of directly to Treasury)
 *       ▼
 *   FeeSplitter   ◄── accumulates fees between splits
 *       ├── treasuryShare  →  Treasury.sol
 *       ├── rewardShare    →  RewardDistributor.sol
 *       └── buybackShare   →  BuybackAndBurn.sol
 *
 * Splitting is lazy (pull model):
 *   Tokens accumulate here until split() is triggered. This batches
 *   many small inbound fee transfers into fewer, larger outbound
 *   transfers, saving significant gas for recipients.
 *
 * ─────────────────────────────────────────────────────────────────
 * Split model:
 *
 *   Default split  — applies to all registered tokens unless overridden
 *   Per-token split — can override the default for specific tokens
 *                     e.g. "all USDC goes 100% to Treasury"
 *                          "all DWT goes 60% buyback, 40% rewards"
 *
 *   All splits must sum to exactly BPS (10,000 = 100%).
 *
 * ─────────────────────────────────────────────────────────────────
 * Automation:
 *
 *   splitAll()    — anyone can call (permissionless, costs gas)
 *   splitToken()  — split a single token (permissionless)
 *   autoSplit()   — KEEPER_ROLE only, includes minimum balance check
 *                   to avoid wasting gas on dust amounts
 *
 * ─────────────────────────────────────────────────────────────────
 * Roles:
 *   DEFAULT_ADMIN_ROLE → Multisig. Manages roles.
 *   ADMIN_ROLE         → Multisig. Configures splits, tokens, destinations.
 *   GOVERNOR_ROLE      → TimelockController. Can update default split.
 *   KEEPER_ROLE        → Bot. Triggers autoSplit() on schedule.
 *   GUARDIAN_ROLE      → Security bot. Can pause only.
 */
contract FeeSplitter is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────
    // Roles
    // ─────────────────────────────────────────────────────────────

    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant KEEPER_ROLE   = keccak256("KEEPER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint256 public constant BPS = 10_000;

    // ─────────────────────────────────────────────────────────────
    // Split configuration
    // ─────────────────────────────────────────────────────────────

    struct Split {
        uint256 treasuryBps;  // share going to Treasury
        uint256 rewardBps;    // share going to RewardDistributor
        uint256 buybackBps;   // share going to BuybackAndBurn
    }

    /// @notice Default split applied to all tokens without a specific override
    Split public defaultSplit;

    /// @notice Per-token split overrides
    mapping(address => Split) public tokenSplits;
    mapping(address => bool)  public hasTokenSplit;

    // ─────────────────────────────────────────────────────────────
    // Destination contracts
    // ─────────────────────────────────────────────────────────────

    address public treasury;
    address public rewardDistributor;
    address public buybackAndBurn;

    // ─────────────────────────────────────────────────────────────
    // Registered fee tokens
    // ─────────────────────────────────────────────────────────────

    struct FeeToken {
        address token;
        uint256 minSplitAmount; // minimum balance before split is worth triggering
        bool    active;
    }

    FeeToken[] public feeTokens;
    mapping(address => uint256) public tokenIndex;   // token => index+1 (0 = not registered)
    mapping(address => bool)    public isRegistered;

    // ─────────────────────────────────────────────────────────────
    // Accounting
    // ─────────────────────────────────────────────────────────────

    /// @notice Cumulative amount split per token per destination
    mapping(address => mapping(address => uint256)) public totalSplit;
    // token => destination => cumulative amount

    uint256 public lastSplitTimestamp;
    uint256 public totalSplitCount;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event TokenSplit(
        address indexed token,
        uint256 toTreasury,
        uint256 toRewards,
        uint256 toBuyback,
        uint256 timestamp
    );
    event DefaultSplitUpdated(uint256 treasuryBps, uint256 rewardBps, uint256 buybackBps);
    event TokenSplitSet(address indexed token, uint256 treasuryBps, uint256 rewardBps, uint256 buybackBps);
    event TokenSplitCleared(address indexed token);
    event FeeTokenRegistered(address indexed token, uint256 minSplitAmount);
    event FeeTokenDeactivated(address indexed token);
    event DestinationsUpdated(address treasury, address rewardDistributor, address buybackAndBurn);
    event DustRecovered(address indexed token, address indexed to, uint256 amount);

    // ─────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────

    /**
     * @param _treasury           Treasury contract
     * @param _rewardDistributor  RewardDistributor contract
     * @param _buybackAndBurn     BuybackAndBurn contract (can be address(0) if not yet deployed)
     * @param _treasuryBps        Default treasury share in bps
     * @param _rewardBps          Default reward share in bps
     * @param _buybackBps         Default buyback share in bps (must make total = 10000)
     * @param _admin              Admin multisig
     * @param _governor           Governance timelock
     * @param _keeper             Automation keeper bot
     * @param _guardian           Security guardian
     * @param _securityController Layer 7 Security Controller
     */
    bytes32 public constant LAYER_ID = keccak256("LAYER_6_BUSINESS");
    bytes32 public constant SPLIT_ACTION = keccak256("SPLIT_ACTION");

    /**
     * @param _treasury           Treasury contract
     * @param _rewardDistributor  RewardDistributor contract
     * @param _buybackAndBurn     BuybackAndBurn contract (can be address(0) if not yet deployed)
     * @param _treasuryBps        Default treasury share in bps
     * @param _rewardBps          Default reward share in bps
     * @param _buybackBps         Default buyback share in bps (must make total = 10000)
     * @param _admin              Admin multisig
     * @param _governor           Governance timelock
     * @param _keeper             Automation keeper bot
     * @param _guardian           Security guardian
     * @param _securityController Layer 7 Security Controller
     */
    constructor(
        address _treasury,
        address _rewardDistributor,
        address _buybackAndBurn,
        uint256 _treasuryBps,
        uint256 _rewardBps,
        uint256 _buybackBps,
        address _admin,
        address _governor,
        address _keeper,
        address _guardian,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    ) SecurityGated(_securityController) {
        require(_treasury          != address(0), "FS: zero treasury");
        require(_rewardDistributor != address(0), "FS: zero rewardDistributor");
        require(_treasuryBps + _rewardBps + _buybackBps == BPS, "FS: split must sum to 10000");

        treasury          = _treasury;
        rewardDistributor = _rewardDistributor;
        buybackAndBurn    = _buybackAndBurn;

        defaultSplit = Split(_treasuryBps, _rewardBps, _buybackBps);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,    _admin);
        _grantRole(GOVERNOR_ROLE, _governor);
        _grantRole(KEEPER_ROLE,   _keeper);
        _grantRole(GUARDIAN_ROLE, _guardian);

        _initSecurityModules(_access, _time, _state, _rate, _verify);
    }

    // ─────────────────────────────────────────────────────────────
    // Core: Split execution
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Split ALL registered active fee tokens.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Access: withAccessLock(KEEPER_ROLE)
     *      3. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function splitAll() 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withAccessLock(KEEPER_ROLE)
    {
        for (uint256 i = 0; i < feeTokens.length; i++) {
            FeeToken storage ft = feeTokens[i];
            if (!ft.active) continue;
            uint256 bal = IERC20(ft.token).balanceOf(address(this));
            if (bal >= ft.minSplitAmount) {
                _splitToken(ft.token, bal);
            }
        }
        lastSplitTimestamp = block.timestamp;
        totalSplitCount++;
    }

    /**
     * @notice Split a single registered token.
     *         Permissionless — anyone can call.
     * @param token  Token address to split
     */
    function splitToken(address token) external nonReentrant whenNotPaused whenProtocolNotPaused {
        require(isRegistered[token], "FS: token not registered");
        uint256 bal = IERC20(token).balanceOf(address(this));
        require(bal > 0, "FS: zero balance");
        _splitToken(token, bal);
        lastSplitTimestamp = block.timestamp;
    }

    /**
     * @notice Keeper-triggered split. Only runs if at least one token
     *         exceeds its minSplitAmount threshold.
     *         Reverts if nothing to split (prevents wasted keeper gas).
     */
    function autoSplit() external onlyRole(KEEPER_ROLE) nonReentrant whenNotPaused whenProtocolNotPaused {
        bool anySplit = false;
        for (uint256 i = 0; i < feeTokens.length; i++) {
            FeeToken storage ft = feeTokens[i];
            if (!ft.active) continue;
            uint256 bal = IERC20(ft.token).balanceOf(address(this));
            if (bal >= ft.minSplitAmount) {
                _splitToken(ft.token, bal);
                anySplit = true;
            }
        }
        require(anySplit, "FS: nothing to split");
        lastSplitTimestamp = block.timestamp;
        totalSplitCount++;
    }

    // ─────────────────────────────────────────────────────────────
    // Internal split logic
    // ─────────────────────────────────────────────────────────────

    function _splitToken(address token, uint256 bal) internal {
        Split memory s = hasTokenSplit[token] ? tokenSplits[token] : defaultSplit;

        uint256 toTreasury = (bal * s.treasuryBps) / BPS;
        uint256 toRewards  = (bal * s.rewardBps)   / BPS;
        // Remainder goes to buyback to avoid dust accumulation from rounding
        uint256 toBuyback  = bal - toTreasury - toRewards;

        if (toTreasury > 0) {
            IERC20(token).safeTransfer(treasury, toTreasury);
            totalSplit[token][treasury] += toTreasury;
        }

        if (toRewards > 0) {
            IERC20(token).safeTransfer(rewardDistributor, toRewards);
            totalSplit[token][rewardDistributor] += toRewards;
        }

        if (toBuyback > 0) {
            address bb = buybackAndBurn;
            if (bb != address(0)) {
                IERC20(token).safeTransfer(bb, toBuyback);
                totalSplit[token][bb] += toBuyback;
            } else {
                // Buyback not yet deployed — redirect to treasury
                IERC20(token).safeTransfer(treasury, toBuyback);
                totalSplit[token][treasury] += toBuyback;
                toBuyback = 0; // for event accuracy
            }
        }

        emit TokenSplit(token, toTreasury, toRewards, toBuyback, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────
    // Token registration
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Register a new fee token to be included in splits.
     * @param token          ERC-20 token address
     * @param minSplitAmount Minimum balance before split is triggered (prevents dust waste)
     */
    function registerFeeToken(address token, uint256 minSplitAmount)
        external
        onlyRole(ADMIN_ROLE)
        whenProtocolNotPaused
    {
        require(token != address(0), "FS: zero token");
        require(!isRegistered[token], "FS: already registered");

        tokenIndex[token] = feeTokens.length + 1;
        feeTokens.push(FeeToken({
            token:          token,
            minSplitAmount: minSplitAmount,
            active:         true
        }));
        isRegistered[token] = true;

        emit FeeTokenRegistered(token, minSplitAmount);
    }

    /**
     * @notice Update minimum split threshold for a registered token.
     */
    function setMinSplitAmount(address token, uint256 minAmount)
        external
        onlyRole(ADMIN_ROLE)
        whenProtocolNotPaused
    {
        require(isRegistered[token], "FS: not registered");
        uint256 idx = tokenIndex[token] - 1;
        feeTokens[idx].minSplitAmount = minAmount;
    }

    /**
     * @notice Deactivate a fee token (stops it being included in splitAll).
     *         Does NOT remove it — existing balance can still be split manually.
     */
    function deactivateFeeToken(address token)
        external
        onlyRole(ADMIN_ROLE)
        whenProtocolNotPaused
    {
        require(isRegistered[token], "FS: not registered");
        uint256 idx = tokenIndex[token] - 1;
        feeTokens[idx].active = false;
        emit FeeTokenDeactivated(token);
    }

    // ─────────────────────────────────────────────────────────────
    // Split configuration
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Update the default split. Requires GOVERNOR_ROLE (governance vote).
     */
    function setDefaultSplit(
        uint256 treasuryBps,
        uint256 rewardBps,
        uint256 buybackBps
    )
        external
        onlyRole(GOVERNOR_ROLE)
        whenProtocolNotPaused
    {
        require(treasuryBps + rewardBps + buybackBps == BPS, "FS: must sum to 10000");
        defaultSplit = Split(treasuryBps, rewardBps, buybackBps);
        emit DefaultSplitUpdated(treasuryBps, rewardBps, buybackBps);
    }

    /**
     * @notice Set a per-token split override. Requires ADMIN_ROLE.
     *         e.g. Route all USDC to Treasury (10000, 0, 0).
     */
    function setTokenSplit(
        address token,
        uint256 treasuryBps,
        uint256 rewardBps,
        uint256 buybackBps
    )
        external
        onlyRole(ADMIN_ROLE)
        whenProtocolNotPaused
    {
        require(treasuryBps + rewardBps + buybackBps == BPS, "FS: must sum to 10000");
        tokenSplits[token]  = Split(treasuryBps, rewardBps, buybackBps);
        hasTokenSplit[token] = true;
        emit TokenSplitSet(token, treasuryBps, rewardBps, buybackBps);
    }

    /**
     * @notice Remove a per-token split override (reverts to default split).
     */
    function clearTokenSplit(address token)
        external
        onlyRole(ADMIN_ROLE)
        whenProtocolNotPaused
    {
        delete tokenSplits[token];
        hasTokenSplit[token] = false;
        emit TokenSplitCleared(token);
    }

    /**
     * @notice Update destination addresses. Requires ADMIN_ROLE.
     *         Used when upgrading a destination contract.
     */
    function setDestinations(
        address _treasury,
        address _rewardDistributor,
        address _buybackAndBurn
    )
        external
        onlyRole(ADMIN_ROLE)
        whenProtocolNotPaused
    {
        require(_treasury          != address(0), "FS: zero treasury");
        require(_rewardDistributor != address(0), "FS: zero rewardDistributor");
        treasury          = _treasury;
        rewardDistributor = _rewardDistributor;
        buybackAndBurn    = _buybackAndBurn;
        emit DestinationsUpdated(_treasury, _rewardDistributor, _buybackAndBurn);
    }

    // ─────────────────────────────────────────────────────────────
    // Dust recovery
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Recover any unregistered token accidentally sent here.
     *         Cannot recover registered fee tokens (use splitToken instead).
     */
    function recoverDust(address token, address to)
        external
        onlyRole(ADMIN_ROLE)
        whenProtocolNotPaused
    {
        require(!isRegistered[token], "FS: use splitToken for fee tokens");
        require(to != address(0),     "FS: zero recipient");
        uint256 bal = IERC20(token).balanceOf(address(this));
        require(bal > 0, "FS: zero balance");
        IERC20(token).safeTransfer(to, bal);
        emit DustRecovered(token, to, bal);
    }

    // ─────────────────────────────────────────────────────────────
    // Pause
    // ─────────────────────────────────────────────────────────────

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }

    // ─────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────

    function feeTokenCount()
        external view returns (uint256)
    {
        return feeTokens.length;
    }

    function allFeeTokens()
        external view returns (FeeToken[] memory)
    {
        return feeTokens;
    }

    /**
     * @notice Preview what a split would yield for a given token balance.
     */
    function previewSplit(address token, uint256 amount)
        external
        view
        returns (uint256 toTreasury, uint256 toRewards, uint256 toBuyback)
    {
        Split memory s = hasTokenSplit[token] ? tokenSplits[token] : defaultSplit;
        toTreasury = (amount * s.treasuryBps) / BPS;
        toRewards  = (amount * s.rewardBps)   / BPS;
        toBuyback  = amount - toTreasury - toRewards;
    }

    /**
     * @notice Get current pending balances for all registered tokens.
     */
    function pendingBalances()
        external
        view
        returns (address[] memory tokens, uint256[] memory balances)
    {
        tokens   = new address[](feeTokens.length);
        balances = new uint256[](feeTokens.length);
        for (uint256 i = 0; i < feeTokens.length; i++) {
            tokens[i]   = feeTokens[i].token;
            balances[i] = IERC20(feeTokens[i].token).balanceOf(address(this));
        }
    }
}
