// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  LendingMarket
 * @notice Borrow against DWT (governance / utility token) as collateral.
 *
 *         Roles:
 *           • Lenders   — deposit stablecoins (USDC/DAI) to earn interest.
 *           • Borrowers — lock DWT as collateral, borrow up to LTV × collateral value.
 *
 *         Interest model: simple per-block linear accrual (upgradeable to JumpRate).
 *         Liquidation: if position health < 1.0, any caller can liquidate for a bonus.
 *
 *         Price feed: Chainlink-compatible oracle interface (swappable).
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../SecurityGated.sol";

// ── Chainlink-compatible price feed interface ─────────────────────────────────
interface IPriceFeed {
    function latestRoundData()
        external
        view
        returns (
            uint80  roundId,
            int256  answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80  answeredInRound
        );
    function decimals() external view returns (uint8);
}

// ─────────────────────────────────────────────────────────────────────────────
contract LendingMarket is ReentrancyGuard, Pausable, AccessControl, SecurityGated {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    bytes32 public constant LAYER_ID      = keccak256("LAYER_9_SETTLEMENT");

    // ── Errors ────────────────────────────────────────────────────────────────
    error ZeroAmount();
    error ZeroAddress();
    error InsufficientCollateral();
    error InsufficientLiquidity();
    error PositionHealthy();
    error StalePrice();
    error InvalidLTV();
    error NothingToRepay();
    error ExceedsBalance();
    error ExceedsMaxRate();

    // ── Events ────────────────────────────────────────────────────────────────
    event Deposited(address indexed lender, uint256 amount, uint256 shares);
    event Withdrawn(address indexed lender, uint256 amount, uint256 shares);
    event CollateralDeposited(address indexed borrower, uint256 amount);
    event CollateralWithdrawn(address indexed borrower, uint256 amount);
    event Borrowed(address indexed borrower, uint256 amount);
    event Repaid(address indexed borrower, uint256 amount, uint256 interest);
    event Liquidated(
        address indexed liquidator,
        address indexed borrower,
        uint256 repaid,
        uint256 collateralSeized
    );
    event InterestRateUpdated(uint256 newRatePerBlock);
    event LTVUpdated(uint256 newLTV);
    event LiquidationBonusUpdated(uint256 newBonus);

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant PRECISION        = 1e18;
    uint256 public constant MAX_LTV          = 80e16;  // 80 %
    uint256 public constant LIQ_THRESHOLD    = 85e16;  // 85 %
    uint256 public constant STALE_PRICE_DELAY = 3600;  // 1 hour
    uint256 public constant MAX_INTEREST_RATE = 1e11; // 100% per block? 

    // ── Action IDs for Rate Limiting ─────────────────────────────────────────
    bytes32 public constant ACTION_BORROW   = keccak256("ACTION_BORROW");
    bytes32 public constant ACTION_WITHDRAW = keccak256("ACTION_WITHDRAW");

    // ── Immutables ────────────────────────────────────────────────────────────
    IERC20 public immutable dwtToken;        // collateral token
    IERC20 public immutable borrowToken;     // stable (USDC / DAI)
    IPriceFeed public immutable dwtPriceFeed; // DWT / USD
    IPriceFeed public immutable stablePriceFeed; // stable / USD
    uint8  public immutable dwtDecimals;
    uint8  public immutable stableDecimals;

    // ── Parameters (governable) ───────────────────────────────────────────────
    uint256 public ltv               = 70e16;   // 70 % default LTV
    uint256 public liquidationBonus  = 5e16;    // 5  % bonus for liquidators
    uint256 public interestRatePerBlock = 1e9;  // ~2 % APY at 12s blocks

    // ── Lending pool state ────────────────────────────────────────────────────
    uint256 public totalShares;       // lp shares outstanding
    uint256 public totalDeposits;     // principal deposited
    uint256 public totalBorrowed;     // outstanding principal
    uint256 public accruedProtocolFees;

    uint256 public lastAccrualBlock;
    uint256 public accInterestPerShare; // scaled 1e18

    // ── Per-account lending positions ────────────────────────────────────────
    mapping(address => uint256) public shares; // lender → share balance

    // ── Per-account borrow positions ─────────────────────────────────────────
    struct BorrowPosition {
        uint256 collateral;    // DWT locked (DWT decimals)
        uint256 principal;     // borrow token owed
        uint256 interestDebt;  // accInterestPerShare at last update
        uint256 lastBlock;
    }
    mapping(address => BorrowPosition) public positions;

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(
        address _dwtToken,
        address _borrowToken,
        address _dwtPriceFeed,
        address _stablePriceFeed,
        uint8   _dwtDecimals,
        uint8   _stableDecimals,
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
        dwtToken          = IERC20(_dwtToken);
        borrowToken       = IERC20(_borrowToken);
        dwtPriceFeed      = IPriceFeed(_dwtPriceFeed);
        stablePriceFeed   = IPriceFeed(_stablePriceFeed);
        dwtDecimals       = _dwtDecimals;
        stableDecimals    = _stableDecimals;
        lastAccrualBlock  = block.number;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);
        _grantRole(GUARDIAN_ROLE,      _guardian);

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /**
     * @notice Update LTV. Requires Committee Multi-Sig.
     */
    function setLTV(uint256 newLTV, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    {
        if (newLTV == 0 || newLTV > MAX_LTV) revert InvalidLTV();
        ltv = newLTV;
        emit LTVUpdated(newLTV);
    }

    /**
     * @notice Update liquidation bonus. Requires Committee Multi-Sig.
     */
    function setLiquidationBonus(uint256 bonus, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    {
        liquidationBonus = bonus;
        emit LiquidationBonusUpdated(bonus);
    }

    /**
     * @notice Update interest rate. Requires Committee Multi-Sig.
     */
    function setInterestRate(uint256 ratePerBlock, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    {
        if (ratePerBlock > MAX_INTEREST_RATE) revert ExceedsMaxRate();
        _accrueInterest();
        interestRatePerBlock = ratePerBlock;
        emit InterestRateUpdated(ratePerBlock);
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(GOVERNOR_ROLE) { _unpause(); }

    /**
     * @notice Withdraw protocol fees. Requires Committee Multi-Sig.
     */
    function withdrawProtocolFees(address to, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    {
        uint256 amt = accruedProtocolFees;
        accruedProtocolFees = 0;
        borrowToken.safeTransfer(to, amt);
    }

    // ── Interest accrual ──────────────────────────────────────────────────────
    function _accrueInterest() internal {
        uint256 blocks = block.number - lastAccrualBlock;
        if (blocks == 0 || totalBorrowed == 0) {
            lastAccrualBlock = block.number;
            return;
        }
        // Simple linear: interest = principal × rate × blocks
        uint256 interest = (totalBorrowed * interestRatePerBlock * blocks) / PRECISION;
        uint256 protocolCut = interest / 10; // 10% to protocol
        uint256 lenderShare = interest - protocolCut;

        accruedProtocolFees     += protocolCut;
        totalDeposits           += lenderShare;
        accInterestPerShare     += (lenderShare * PRECISION) / (totalBorrowed == 0 ? 1 : totalBorrowed);
        lastAccrualBlock         = block.number;
    }

    // ── Oracle helpers ────────────────────────────────────────────────────────
    function _getDWTPrice() internal view returns (uint256) {
        (, int256 price,, uint256 updatedAt,) = dwtPriceFeed.latestRoundData();
        if (block.timestamp - updatedAt > STALE_PRICE_DELAY) revert StalePrice();
        return uint256(price); // 8-decimal USD price
    }

    /// @dev Returns collateral value in borrow-token units (stableDecimals)
    function _collateralValue(uint256 dwtAmount) internal view returns (uint256) {
        uint256 price = _getDWTPrice(); // 8 decimals
        // value = dwtAmount × price / 10^(dwtDecimals + 8 - stableDecimals)
        return (dwtAmount * price) / (10 ** (uint256(dwtDecimals) + 8 - uint256(stableDecimals)));
    }

    function _healthFactor(address borrower) internal view returns (uint256) {
        BorrowPosition storage pos = positions[borrower];
        if (pos.principal == 0) return type(uint256).max;
        uint256 collateralVal = _collateralValue(pos.collateral);
        uint256 liqValue      = (collateralVal * LIQ_THRESHOLD) / PRECISION;
        return (liqValue * PRECISION) / pos.principal;
    }

    // ── Lender functions ──────────────────────────────────────────────────────

    /**
     * @notice Deposit borrow token (stablecoin) to earn interest.
     * @param amount Amount of borrow token to deposit
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused whenProtocolNotPaused {
        if (amount == 0) revert ZeroAmount();
        _accrueInterest();

        uint256 newShares;
        if (totalShares == 0 || totalDeposits == 0) {
            newShares = amount;
        } else {
            newShares = (amount * totalShares) / totalDeposits;
        }

        totalShares   += newShares;
        totalDeposits += amount;
        shares[msg.sender] += newShares;

        borrowToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount, newShares);
    }

    /**
     * @notice Withdraw stablecoin liquidity (redeems shares).
     * @param shareAmount Number of lp shares to redeem
     */
    function withdraw(uint256 shareAmount) 
        external 
        nonReentrant 
        whenNotPaused 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withRateLimit(ACTION_WITHDRAW, (shareAmount * totalDeposits) / totalShares)
    {
        if (shareAmount == 0) revert ZeroAmount();
        if (shares[msg.sender] < shareAmount) revert ExceedsBalance();
        _accrueInterest();

        uint256 amount = (shareAmount * totalDeposits) / totalShares;
        uint256 available = borrowToken.balanceOf(address(this)) - accruedProtocolFees;
        if (amount > available) revert InsufficientLiquidity();

        totalShares   -= shareAmount;
        totalDeposits -= amount;
        shares[msg.sender] -= shareAmount;

        borrowToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, shareAmount);
    }

    // ── Borrower functions ────────────────────────────────────────────────────

    /**
     * @notice Deposit DWT as collateral.
     * @param amount DWT amount to lock
     */
    function depositCollateral(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        if (amount == 0) revert ZeroAmount();
        positions[msg.sender].collateral += amount;
        dwtToken.safeTransferFrom(msg.sender, address(this), amount);
        emit CollateralDeposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw excess collateral that keeps position healthy.
     * @param amount DWT amount to withdraw
     */
    function withdrawCollateral(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        if (amount == 0) revert ZeroAmount();
        BorrowPosition storage pos = positions[msg.sender];
        if (pos.collateral < amount) revert ExceedsBalance();

        pos.collateral -= amount;

        if (pos.principal > 0) {
            uint256 maxBorrowAmount = (_collateralValue(pos.collateral) * ltv) / PRECISION;
            if (pos.principal > maxBorrowAmount) revert InsufficientCollateral();
        }

        dwtToken.safeTransfer(msg.sender, amount);
        emit CollateralWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Borrow stablecoin against locked DWT collateral.
     * @param amount Amount to borrow
     */
    function borrow(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withRateLimit(ACTION_BORROW, amount)
    {
        if (amount == 0) revert ZeroAmount();
        _accrueInterest();

        BorrowPosition storage pos = positions[msg.sender];
        uint256 maxBorrowAmount = (_collateralValue(pos.collateral) * ltv) / PRECISION;
        if (pos.principal + amount > maxBorrowAmount) revert InsufficientCollateral();

        uint256 available = borrowToken.balanceOf(address(this)) - accruedProtocolFees;
        if (amount > available) revert InsufficientLiquidity();

        pos.principal   += amount;
        pos.interestDebt = accInterestPerShare;
        pos.lastBlock    = block.number;
        totalBorrowed   += amount;

        borrowToken.safeTransfer(msg.sender, amount);
        emit Borrowed(msg.sender, amount);
    }

    /**
     * @notice Repay outstanding debt (principal + accrued interest).
     * @param amount Amount of borrow token to repay (use type(uint256).max to repay all)
     */
    function repay(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        _accrueInterest();
        BorrowPosition storage pos = positions[msg.sender];
        if (pos.principal == 0) revert NothingToRepay();

        // Calculate accrued interest for this position
        uint256 accrued = (pos.principal * (accInterestPerShare - pos.interestDebt)) / PRECISION;
        uint256 totalOwed = pos.principal + accrued;

        if (amount == type(uint256).max) amount = totalOwed;
        if (amount > totalOwed) amount = totalOwed;

        uint256 interestPaid = amount >= accrued ? accrued : amount;
        uint256 principalPaid = amount - interestPaid;

        pos.principal   -= principalPaid;
        pos.interestDebt = accInterestPerShare;
        totalBorrowed   -= principalPaid;

        borrowToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Repaid(msg.sender, principalPaid, interestPaid);
    }

    // ── Liquidation ───────────────────────────────────────────────────────────

    /**
     * @notice Liquidate an undercollateralised position.
     *         Caller repays debt and receives collateral + bonus.
     * @param borrower   Address of the position to liquidate
     * @param repayAmount Amount of borrow token to repay on behalf of borrower
     */
    function liquidate(address borrower, uint256 repayAmount)
        external
        nonReentrant
        whenProtocolNotPaused
        withStateGuard(LAYER_ID)
    {
        if (_healthFactor(borrower) >= PRECISION) revert PositionHealthy();
        _accrueInterest();

        BorrowPosition storage pos = positions[borrower];
        uint256 accrued    = (pos.principal * (accInterestPerShare - pos.interestDebt)) / PRECISION;
        uint256 totalOwed  = pos.principal + accrued;
        if (repayAmount > totalOwed) repayAmount = totalOwed;

        uint256 interestPaid  = repayAmount >= accrued ? accrued : repayAmount;
        uint256 principalPaid = repayAmount - interestPaid;

        // Collateral to seize: repayValue × (1 + bonus) in DWT
        uint256 dwtPrice      = _getDWTPrice();
        uint256 seizeValue    = (repayAmount * (PRECISION + liquidationBonus)) / PRECISION;
        // seizeValue is in stableDecimals; convert to DWT
        uint256 collateralSeized = (seizeValue * (10 ** (uint256(dwtDecimals) + 8 - uint256(stableDecimals)))) / dwtPrice;
        if (collateralSeized > pos.collateral) collateralSeized = pos.collateral;

        pos.principal   -= principalPaid;
        pos.interestDebt = accInterestPerShare;
        pos.collateral  -= collateralSeized;
        totalBorrowed   -= principalPaid;

        borrowToken.safeTransferFrom(msg.sender, address(this), repayAmount);
        dwtToken.safeTransfer(msg.sender, collateralSeized);

        emit Liquidated(msg.sender, borrower, repayAmount, collateralSeized);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function healthFactor(address borrower) external view returns (uint256) {
        return _healthFactor(borrower);
    }

    function maxBorrow(address borrower) external view returns (uint256) {
        return (_collateralValue(positions[borrower].collateral) * ltv) / PRECISION;
    }

    function shareValue(address lender) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[lender] * totalDeposits) / totalShares;
    }
}
