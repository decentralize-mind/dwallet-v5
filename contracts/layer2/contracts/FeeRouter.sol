// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../SecurityGated.sol";

/**
 * @title FeeRouter
 * @notice Routes swap fees with tiered discount system for Layer 2 DEX
 * @dev Handles fee collection, discount tiers, and distribution to treasury/LPs
 *      Gated by Layer 7 Protocol-wide pause state.
 */
contract FeeRouter is Ownable, ReentrancyGuard, SecurityGated {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────
    uint256 public constant BASIS_POINTS = 10_000;
    uint256 public constant MAX_FEE_BPS  = 300;   // 3% absolute cap
    uint256 public constant MAX_DISCOUNT  = 8_000; // 80% max discount

    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────
    address public treasury;
    address public liquidityPool;
    address public governanceToken; // token used for discount tiers

    /// @notice Base fee in basis points (default 30 bps = 0.30%)
    uint256 public baseFeeBps = 30;

    /// @notice Share of fees sent to LPs vs treasury (in bps, rest goes to treasury)
    uint256 public lpShareBps = 7_000; // 70% to LPs

    struct DiscountTier {
        uint256 minTokenBalance; // min governance token balance
        uint256 discountBps;     // discount in basis points
    }

    DiscountTier[] public discountTiers;

    // Accumulated fees per token
    mapping(address => uint256) public pendingTreasuryFees;
    mapping(address => uint256) public pendingLpFees;

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

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────
    constructor(
        address _treasury,
        address _liquidityPool,
        address _governanceToken,
        address _securityController,
        address _owner
    ) Ownable(_owner) SecurityGated(_securityController) {
        require(_treasury      != address(0), "FeeRouter: zero treasury");
        require(_liquidityPool != address(0), "FeeRouter: zero lp");
        require(_governanceToken != address(0), "FeeRouter: zero gov token");

        treasury        = _treasury;
        liquidityPool   = _liquidityPool;
        governanceToken = _governanceToken;

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
     */
    function collectFee(
        address token,
        address payer,
        uint256 amount
    ) external nonReentrant whenProtocolNotPaused returns (uint256 feeCharged) {
        uint256 discountBps = _getDiscount(payer);
        uint256 effectiveFeeBps = baseFeeBps * (BASIS_POINTS - discountBps) / BASIS_POINTS;
        feeCharged = amount * effectiveFeeBps / BASIS_POINTS;

        if (feeCharged == 0) return 0;

        IERC20(token).safeTransferFrom(msg.sender, address(this), feeCharged);

        uint256 lpFee       = feeCharged * lpShareBps / BASIS_POINTS;
        uint256 treasuryFee = feeCharged - lpFee;

        pendingLpFees[token]       += lpFee;
        pendingTreasuryFees[token] += treasuryFee;

        emit FeeCollected(token, payer, feeCharged, lpFee, treasuryFee, discountBps);
    }

    /**
     * @notice Distribute accumulated fees.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function distributeFees(address token) external nonReentrant whenProtocolNotPaused {
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
    // Admin Functions
    // ─────────────────────────────────────────────

    function setBaseFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "FeeRouter: fee too high");
        emit BaseFeeBpsUpdated(baseFeeBps, newFeeBps);
        baseFeeBps = newFeeBps;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "FeeRouter: zero address");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function setLpShareBps(uint256 newShareBps) external onlyOwner {
        require(newShareBps <= BASIS_POINTS, "FeeRouter: exceeds 100%");
        emit LpShareUpdated(lpShareBps, newShareBps);
        lpShareBps = newShareBps;
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

    function getDiscountTiers() external view returns (DiscountTier[] memory) {
        return discountTiers;
    }
}
