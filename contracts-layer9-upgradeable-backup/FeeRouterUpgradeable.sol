// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../layer7/SecurityGated.sol";

/**
 * @title FeeRouter - Upgradeable Version
 * @notice Routes swap fees with tiered discount system for Layer 2 DEX
 * @dev Handles fee collection, discount tiers, and distribution to treasury/LPs
 *      Gated by Layer 7 Protocol-wide pause state.
 */
contract FeeRouterUpgradeable is OwnableUpgradeable, ReentrancyGuardUpgradeable, SecurityGated {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────
    uint256 public constant BASIS_POINTS = 10_000;
    uint256 public constant MAX_FEE_BPS  = 300;   // 3% absolute cap
    uint256 public constant MAX_DISCOUNT  = 8_000; // 80% max discount
    
    /// @notice Minimum fee amount to prevent dust spam (configurable per token)
    uint256 public constant MIN_FEE_AMOUNT = 1e6; // 1 unit (adjusts for decimals)
    
    /// @notice Auto-distribute threshold (when pending fees exceed this)
    uint256 public autoDistributeThreshold; // 1 token default
    
    /// @notice Timelock delay for admin changes (48 hours)
    uint256 public constant TIMELOCK_DELAY = 2 days;
    
    /// @notice Blocks required to hold tokens for discount (anti-flash loan)
    uint256 public constant DISCOUNT_HOLD_BLOCKS = 10; // ~2 minutes on Base

    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────
    address public treasury;
    address public liquidityPool;
    address public governanceToken; // token used for discount tiers

    /// @notice Base fee in basis points (default 30 bps = 0.30%)
    uint256 public baseFeeBps;

    /// @notice Share of fees sent to LPs vs treasury (in bps, rest goes to treasury)
    uint256 public lpShareBps;

    struct DiscountTier {
        uint256 minTokenBalance; // min governance token balance
        uint256 discountBps;     // discount in basis points
    }

    DiscountTier[] public discountTiers;

    // Accumulated fees per token
    mapping(address => uint256) public pendingTreasuryFees;
    mapping(address => uint256) public pendingLpFees;
    
    // Timelock for admin changes
    struct Timelock {
        uint256 executeTime;
        bool executed;
        uint256 value;
    }
    
    mapping(bytes32 => Timelock) public timelocks;
    
    // Discount eligibility tracking (anti-gaming)
    mapping(address => uint256) public discountEligibleBlock;
    
    // Fee history for analytics
    struct FeeRecord {
        address token;
        address payer;
        uint256 amount;
        uint256 fee;
        uint256 discount;
        uint256 timestamp;
    }
    
    FeeRecord[] public feeHistory;
    uint256 public constant MAX_FEE_HISTORY = 1000; // Keep last 1000 records

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────
    event FeeCollected(
        address indexed token,
        address indexed payer,
        uint256 totalFee,
        uint256 lpFee,
        uint256 treasuryFee,
        uint256 discountApplied
    );
    event FeeDistributed(address indexed token, uint256 lpAmount, uint256 treasuryAmount);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event LpShareUpdated(uint256 oldShare, uint256 newShare);
    event BaseFeeBpsUpdated(uint256 oldFee, uint256 newFee);
    event DiscountTierAdded(uint256 minBalance, uint256 discountBps);
    event DiscountTiersCleared();
    event TokensRescued(address indexed token, address indexed to, uint256 amount);
    event TimelockCreated(bytes32 changeId, uint256 executeTime);
    event TimelockExecuted(bytes32 changeId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ─────────────────────────────────────────────
    // Initializer
    // ─────────────────────────────────────────────
    function initialize(
        address _treasury,
        address _liquidityPool,
        address _governanceToken,
        address _securityController,
        address _owner
    ) external initializer {
        require(_treasury      != address(0), "FeeRouter: zero treasury");
        require(_liquidityPool != address(0), "FeeRouter: zero lp");
        require(_governanceToken != address(0), "FeeRouter: zero gov token");

        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __SecurityGated_init(_securityController);

        treasury        = _treasury;
        liquidityPool   = _liquidityPool;
        governanceToken = _governanceToken;
        
        autoDistributeThreshold = 1e18; // 1 token default
        baseFeeBps = 30; // 0.30%
        lpShareBps = 7_000; // 70% to LPs

        // Default discount tiers
        discountTiers.push(DiscountTier({minTokenBalance: 100e18,  discountBps: 1_000})); // 10%
        discountTiers.push(DiscountTier({minTokenBalance: 1_000e18, discountBps: 2_500})); // 25%
        discountTiers.push(DiscountTier({minTokenBalance: 10_000e18,discountBps: 5_000})); // 50%
        discountTiers.push(DiscountTier({minTokenBalance: 100_000e18,discountBps: 8_000}));// 80%
    }

    // ─────────────────────────────────────────────
    // Core Logic
    // ─────────────────────────────────────────────

    function calculateFee(address user, uint256 amount)
        external
        view
        returns (uint256 feeAmount, uint256 discountBps)
    {
        discountBps = _getDiscount(user);
        uint256 effectiveFeeBps = baseFeeBps * (BASIS_POINTS - discountBps) / BASIS_POINTS;
        feeAmount = amount * effectiveFeeBps / BASIS_POINTS;
    }

    /**
     * @notice Collect fee from caller.
     * @dev Gated by Protocol-wide pause via Layer 7.
     * @param token The token address for fee collection
     * @param payer The user address (for discount calculation)
     * @param amount The amount to calculate fee on
     * @return feeCharged The actual fee amount collected
     */
    function collectFee(
        address token,
        address payer,
        uint256 amount
    ) external nonReentrant whenProtocolNotPaused returns (uint256 feeCharged) {
        // Input validation
        require(token != address(0), "FeeRouter: zero token");
        require(payer != address(0), "FeeRouter: zero payer");
        require(amount > 0, "FeeRouter: zero amount");
        
        uint256 discountBps = _getDiscount(payer);
        uint256 effectiveFeeBps = baseFeeBps * (BASIS_POINTS - discountBps) / BASIS_POINTS;
        feeCharged = amount * effectiveFeeBps / BASIS_POINTS;
        
        // Prevent dust spam
        if (feeCharged < MIN_FEE_AMOUNT) {
            return 0;
        }

        // Transfer fee from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), feeCharged);

        uint256 lpFee       = feeCharged * lpShareBps / BASIS_POINTS;
        uint256 treasuryFee = feeCharged - lpFee;

        pendingLpFees[token]       += lpFee;
        pendingTreasuryFees[token] += treasuryFee;
        
        // Record fee history
        if (feeHistory.length < MAX_FEE_HISTORY) {
            feeHistory.push(FeeRecord({
                token: token,
                payer: payer,
                amount: amount,
                fee: feeCharged,
                discount: discountBps,
                timestamp: block.timestamp
            }));
        }

        emit FeeCollected(token, payer, feeCharged, lpFee, treasuryFee, discountBps);
        
        // Auto-distribute if threshold reached
        if (pendingLpFees[token] + pendingTreasuryFees[token] >= autoDistributeThreshold) {
            distributeFees(token);
        }
    }

    /**
     * @notice Distribute accumulated fees.
     * @dev Gated by Protocol-wide pause via Layer 7.
     * @param token The token to distribute fees for
     */
    function distributeFees(address token) public nonReentrant whenProtocolNotPaused {
        require(token != address(0), "FeeRouter: zero token");
        
        uint256 lpAmt  = pendingLpFees[token];
        uint256 trsAmt = pendingTreasuryFees[token];

        require(lpAmt + trsAmt > 0, "FeeRouter: nothing to distribute");

        pendingLpFees[token]       = 0;
        pendingTreasuryFees[token] = 0;

        if (lpAmt  > 0) IERC20(token).safeTransfer(liquidityPool, lpAmt);
        if (trsAmt > 0) IERC20(token).safeTransfer(treasury, trsAmt);

        emit FeeDistributed(token, lpAmt, trsAmt);
    }

    // ─────────────────────────────────────────────
    // Internal Helpers
    // ─────────────────────────────────────────────

    function _getDiscount(address user) internal view returns (uint256 bestDiscount) {
        // Anti-gaming: Check if user has held tokens for required blocks
        if (block.number < discountEligibleBlock[user]) {
            return 0; // Not eligible yet
        }
        
        uint256 balance = IERC20(governanceToken).balanceOf(user);
        for (uint256 i = discountTiers.length; i > 0; i--) {
            DiscountTier memory tier = discountTiers[i - 1];
            if (balance >= tier.minTokenBalance) {
                return tier.discountBps;
            }
        }
        return 0;
    }

    // ─────────────────────────────────────────────
    // Admin Functions (with Timelock)
    // ─────────────────────────────────────────────

    /**
     * @notice Queue fee change (requires timelock)
     */
    function queueBaseFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "FeeRouter: fee too high");
        bytes32 changeId = keccak256("baseFeeBps");
        timelocks[changeId] = Timelock({
            executeTime: block.timestamp + TIMELOCK_DELAY,
            executed: false,
            value: newFeeBps
        });
        emit TimelockCreated(changeId, block.timestamp + TIMELOCK_DELAY);
    }
    
    /**
     * @notice Execute queued fee change
     */
    function executeBaseFeeBps() external onlyOwner {
        bytes32 changeId = keccak256("baseFeeBps");
        Timelock storage timelock = timelocks[changeId];
        require(!timelock.executed, "FeeRouter: already executed");
        require(block.timestamp >= timelock.executeTime, "FeeRouter: timelock not ready");
        
        uint256 oldFee = baseFeeBps;
        baseFeeBps = timelock.value;
        timelock.executed = true;
        
        emit BaseFeeBpsUpdated(oldFee, baseFeeBps);
        emit TimelockExecuted(changeId);
    }

    /**
     * @notice Queue LP share change (requires timelock)
     */
    function queueLpShareBps(uint256 newShareBps) external onlyOwner {
        require(newShareBps <= BASIS_POINTS, "FeeRouter: exceeds 100%");
        bytes32 changeId = keccak256("lpShareBps");
        timelocks[changeId] = Timelock({
            executeTime: block.timestamp + TIMELOCK_DELAY,
            executed: false,
            value: newShareBps
        });
        emit TimelockCreated(changeId, block.timestamp + TIMELOCK_DELAY);
    }
    
    /**
     * @notice Execute queued LP share change
     */
    function executeLpShareBps() external onlyOwner {
        bytes32 changeId = keccak256("lpShareBps");
        Timelock storage timelock = timelocks[changeId];
        require(!timelock.executed, "FeeRouter: already executed");
        require(block.timestamp >= timelock.executeTime, "FeeRouter: timelock not ready");
        
        uint256 oldShare = lpShareBps;
        lpShareBps = timelock.value;
        timelock.executed = true;
        
        emit LpShareUpdated(oldShare, lpShareBps);
        emit TimelockExecuted(changeId);
    }
    
    /**
     * @notice Set treasury (no timelock needed for address changes)
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "FeeRouter: zero address");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function setDiscountTiers(
        uint256[] calldata minBalances,
        uint256[] calldata discounts
    ) external onlyOwner {
        require(minBalances.length == discounts.length, "FeeRouter: length mismatch");
        delete discountTiers;
        emit DiscountTiersCleared();
        for (uint256 i = 0; i < minBalances.length; i++) {
            require(discounts[i] <= MAX_DISCOUNT, "FeeRouter: discount too high");
            discountTiers.push(DiscountTier({
                minTokenBalance: minBalances[i],
                discountBps:     discounts[i]
            }));
            emit DiscountTierAdded(minBalances[i], discounts[i]);
        }
    }
    
    /**
     * @notice Rescue stuck tokens (emergency only)
     * @dev Can only rescue tokens that are NOT part of pending fees
     */
    function rescueTokens(address token, address to) external onlyOwner {
        require(token != address(0), "FeeRouter: zero token");
        require(to != address(0), "FeeRouter: zero recipient");
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 pending = pendingTreasuryFees[token] + pendingLpFees[token];
        
        require(balance > pending, "FeeRouter: cannot rescue pending fees");
        uint256 amount = balance - pending;
        
        IERC20(token).safeTransfer(to, amount);
        emit TokensRescued(token, to, amount);
    }
    
    /**
     * @notice Update discount eligibility block (called on token transfer)
     * @dev Users must call this after receiving governance tokens to start the clock
     */
    function updateDiscountEligibility() external {
        discountEligibleBlock[msg.sender] = block.number + DISCOUNT_HOLD_BLOCKS;
    }

    // ─────────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────────
    
    /**
     * @notice Get pending fees for a token
     */
    function getPendingFees(address token) external view returns (
        uint256 lpFees,
        uint256 treasuryFees,
        uint256 total
    ) {
        lpFees = pendingLpFees[token];
        treasuryFees = pendingTreasuryFees[token];
        total = lpFees + treasuryFees;
    }
    
    /**
     * @notice Get fee history count
     */
    function getFeeHistoryLength() external view returns (uint256) {
        return feeHistory.length;
    }
    
    /**
     * @notice Get recent fee history (last N records)
     */
    function getRecentFeeHistory(uint256 count) external view returns (FeeRecord[] memory) {
        uint256 length = feeHistory.length;
        uint256 start = count > length ? 0 : length - count;
        uint256 resultCount = length - start;
        
        FeeRecord[] memory result = new FeeRecord[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = feeHistory[start + i];
        }
        return result;
    }
    
    /**
     * @notice Check if user is eligible for discount
     */
    function isDiscountEligible(address user) external view returns (bool) {
        return block.number >= discountEligibleBlock[user];
    }
    
    /**
     * @notice Get blocks remaining until discount eligibility
     */
    function getDiscountEligibilityRemaining(address user) external view returns (uint256) {
        if (block.number >= discountEligibleBlock[user]) {
            return 0;
        }
        return discountEligibleBlock[user] - block.number;
    }

    function getDiscountTiers() external view returns (DiscountTier[] memory) {
        return discountTiers;
    }
}
