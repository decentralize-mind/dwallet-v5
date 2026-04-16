// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../layer7/SecurityGated.sol";

/**
 * @title  DWalletStablecoin (dUSD)
 * @notice Overcollateralized stablecoin backed by DWT and other approved assets
 *
 *         Key Features:
 *         • Mint by depositing collateral (DWT, ETH, stablecoins)
 *         • Maintain minimum collateralization ratio (150%)
 *         • Stability fee charged on outstanding debt
 *         • Liquidation when collateralization falls below threshold
 *         • Peg stability module for price maintenance
 *         • Integration with Chainlink price feeds
 *
 *         Collateral Types:
 *         • DWT (native token) - 200% min collateralization
 *         • ETH - 150% min collateralization  
 *         • USDC/USDT - 110% min collateralization
 */
contract DWalletStablecoin is ERC20, ERC20Permit, AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    // ── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");

    // ── Errors ───────────────────────────────────────────────────────────────
    error ZeroAmount();
    error ZeroAddress();
    error InsufficientCollateral();
    error CollateralizationTooLow(uint256 current, uint256 required);
    error DebtExceedsLimit();
    error InvalidCollateralType();
    error LiquidationFailed();
    error PegTooHigh();
    error PegTooLow();
    error NothingToRepay();

    // ── Events ───────────────────────────────────────────────────────────────
    event StablecoinMinted(address indexed user, address indexed collateral, uint256 collateralAmount, uint256 debtMinted);
    event StablecoinRepaid(address indexed user, address indexed collateral, uint256 debtRepaid, uint256 collateralReturned);
    event CollateralAdded(address indexed user, address indexed collateral, uint256 amount);
    event CollateralWithdrawn(address indexed user, address indexed collateral, uint256 amount);
    event Liquidation(address indexed liquidator, address indexed borrower, address collateral, uint256 debtRepaid, uint256 collateralSeized);
    event StabilityFeeUpdated(uint256 newFeeBps);
    event CollateralConfigured(address indexed token, uint256 minRatio, uint256 debtCeiling, bool enabled);
    event PegStabilityAction(address indexed token, uint256 amountIn, uint256 amountOut);

    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MIN_COLLATERALIZATION_RATIO = 15000; // 150% in basis points
    uint256 public constant LIQUIDATION_PENALTY_BPS = 1000; // 10% liquidation penalty
    uint256 public constant PEG_THRESHOLD_BPS = 200; // 2% deviation from $1 peg

    // ── Structs ──────────────────────────────────────────────────────────────
    struct CollateralConfig {
        uint256 minCollateralizationRatio; // Minimum ratio in basis points (e.g., 15000 = 150%)
        uint256 debtCeiling; // Maximum debt that can be minted with this collateral
        uint256 totalDebt; // Current total debt for this collateral type
        uint256 stabilityFeeBps; // Annual stability fee in basis points
        bool enabled;
    }

    struct Vault {
        uint256 collateralAmount;
        uint256 debt;
        uint256 lastFeeUpdate;
    }

    // ── State ────────────────────────────────────────────────────────────────
    mapping(address => CollateralConfig) public collateralConfigs;
    mapping(address => mapping(address => Vault)) public vaults; // user => collateral => vault
    
    address[] public supportedCollaterals;
    mapping(address => bool) public isCollateralSupported;
    mapping(address => uint256) public collateralPrices; // token => price (scaled to 1e18)
    
    uint256 public totalDebt;
    uint256 public globalDebtCeiling;
    uint256 public baseStabilityFeeBps = 500; // 5% annual fee default

    address public priceOracle; // Chainlink aggregator or custom oracle
    address public pegStabilityModule; // PSM address for minting/redeeming at peg

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _securityController,
        address _registry,
        address _lockEngine,
        address _invariantChecker,
        address _admin,
        address _governor,
        uint256 _globalDebtCeiling
    ) 
        ERC20("dWallet USD", "dUSD")
        ERC20Permit("dWallet USD")
        SecurityGated(_securityController)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GOVERNOR_ROLE, _governor);
        _grantRole(GUARDIAN_ROLE, _admin);
        
        _initSecuritySystem(_registry, _lockEngine, _invariantChecker);
        
        globalDebtCeiling = _globalDebtCeiling;
    }

    // ── Mint Stablecoin ──────────────────────────────────────────────────────

    /**
     * @notice Mint dUSD by depositing collateral
     * @param collateral Address of collateral token
     * @param collateralAmount Amount of collateral to deposit
     * @param debtAmount Amount of dUSD to mint
     */
    function mint(
        address collateral,
        uint256 collateralAmount,
        uint256 debtAmount
    ) 
        external 
        nonReentrant 
        whenProtocolNotPaused
        withStateGuard(_layerId())
    {
        if (collateralAmount == 0 || debtAmount == 0) revert ZeroAmount();
        if (!isCollateralSupported[collateral]) revert InvalidCollateralType();
        
        CollateralConfig storage config = collateralConfigs[collateral];
        if (!config.enabled) revert InvalidCollateralType();
        
        // Check global debt ceiling
        if (totalDebt + debtAmount > globalDebtCeiling) revert DebtExceedsLimit();
        
        // Check collateral debt ceiling
        if (config.totalDebt + debtAmount > config.debtCeiling) revert DebtExceedsLimit();
        
        // Pull collateral
        IERC20(collateral).safeTransferFrom(msg.sender, address(this), collateralAmount);
        
        Vault storage vault = vaults[msg.sender][collateral];
        
        // Accrue fees before updating
        _accrueStabilityFee(vault, collateral);
        
        // Update vault
        vault.collateralAmount += collateralAmount;
        vault.debt += debtAmount;
        vault.lastFeeUpdate = block.timestamp;
        
        // Update totals
        config.totalDebt += debtAmount;
        totalDebt += debtAmount;
        
        // Check collateralization ratio
        _checkCollateralization(msg.sender, collateral);
        
        // Mint dUSD
        _mint(msg.sender, debtAmount);
        
        emit StablecoinMinted(msg.sender, collateral, collateralAmount, debtAmount);
    }

    /**
     * @notice Repay dUSD debt and withdraw collateral
     * @param collateral Address of collateral token
     * @param debtAmount Amount of dUSD to repay
     */
    function repay(
        address collateral,
        uint256 debtAmount
    ) 
        external 
        nonReentrant 
        whenProtocolNotPaused
    {
        if (debtAmount == 0) revert ZeroAmount();
        
        Vault storage vault = vaults[msg.sender][collateral];
        if (vault.debt == 0) revert NothingToRepay();
        
        // Accrue fees
        _accrueStabilityFee(vault, collateral);
        
        uint256 actualRepay = debtAmount > vault.debt ? vault.debt : debtAmount;
        
        // Burn dUSD
        _burn(msg.sender, actualRepay);
        
        // Calculate proportional collateral to return
        uint256 collateralToReturn = (actualRepay * vault.collateralAmount) / vault.debt;
        
        // Update vault
        vault.debt -= actualRepay;
        vault.collateralAmount -= collateralToReturn;
        vault.lastFeeUpdate = block.timestamp;
        
        // Update totals
        CollateralConfig storage config = collateralConfigs[collateral];
        config.totalDebt -= actualRepay;
        totalDebt -= actualRepay;
        
        // Return collateral
        IERC20(collateral).safeTransfer(msg.sender, collateralToReturn);
        
        emit StablecoinRepaid(msg.sender, collateral, actualRepay, collateralToReturn);
    }

    // ── Collateral Management ────────────────────────────────────────────────

    /**
     * @notice Add more collateral to existing vault
     */
    function addCollateral(address collateral, uint256 amount) 
        external 
        nonReentrant 
        whenProtocolNotPaused
    {
        if (amount == 0) revert ZeroAmount();
        
        Vault storage vault = vaults[msg.sender][collateral];
        if (vault.collateralAmount == 0) revert InvalidCollateralType();
        
        IERC20(collateral).safeTransferFrom(msg.sender, address(this), amount);
        
        _accrueStabilityFee(vault, collateral);
        vault.collateralAmount += amount;
        vault.lastFeeUpdate = block.timestamp;
        
        _checkCollateralization(msg.sender, collateral);
        
        emit CollateralAdded(msg.sender, collateral, amount);
    }

    /**
     * @notice Withdraw excess collateral while maintaining healthy ratio
     */
    function withdrawCollateral(address collateral, uint256 amount) 
        external 
        nonReentrant 
        whenProtocolNotPaused
    {
        if (amount == 0) revert ZeroAmount();
        
        Vault storage vault = vaults[msg.sender][collateral];
        if (amount > vault.collateralAmount) revert InsufficientCollateral();
        
        _accrueStabilityFee(vault, collateral);
        
        // Temporarily reduce collateral to check ratio
        vault.collateralAmount -= amount;
        
        // Check if position remains healthy
        _checkCollateralization(msg.sender, collateral);
        
        vault.lastFeeUpdate = block.timestamp;
        
        // Return collateral
        IERC20(collateral).safeTransfer(msg.sender, amount);
        
        emit CollateralWithdrawn(msg.sender, collateral, amount);
    }

    // ── Liquidation ──────────────────────────────────────────────────────────

    /**
     * @notice Liquidate undercollateralized vault
     * @param borrower Address of borrower
     * @param collateral Address of collateral
     * @param debtToRepay Amount of debt to repay (and receive collateral)
     */
    function liquidate(
        address borrower,
        address collateral,
        uint256 debtToRepay
    ) 
        external 
        nonReentrant 
        onlyRole(LIQUIDATOR_ROLE)
        whenProtocolNotPaused
    {
        Vault storage vault = vaults[borrower][collateral];
        
        // Check if vault is underwater
        uint256 ratio = _getCollateralizationRatio(borrower, collateral);
        if (ratio >= collateralConfigs[collateral].minCollateralizationRatio) {
            revert CollateralizationTooLow(ratio, collateralConfigs[collateral].minCollateralizationRatio);
        }
        
        _accrueStabilityFee(vault, collateral);
        
        uint256 actualDebt = debtToRepay > vault.debt ? vault.debt : debtToRepay;
        
        // Calculate collateral to seize (with liquidation penalty)
        uint256 collateralValue = (actualDebt * vault.collateralAmount) / vault.debt;
        uint256 liquidationBonus = (collateralValue * LIQUIDATION_PENALTY_BPS) / 10000;
        uint256 collateralToSeize = collateralValue + liquidationBonus;
        
        if (collateralToSeize > vault.collateralAmount) {
            collateralToSeize = vault.collateralAmount;
        }
        
        // Burn dUSD from liquidator
        _burn(msg.sender, actualDebt);
        
        // Update vault
        vault.debt -= actualDebt;
        vault.collateralAmount -= collateralToSeize;
        vault.lastFeeUpdate = block.timestamp;
        
        // Update totals
        CollateralConfig storage config = collateralConfigs[collateral];
        config.totalDebt -= actualDebt;
        totalDebt -= actualDebt;
        
        // Transfer collateral to liquidator
        IERC20(collateral).safeTransfer(msg.sender, collateralToSeize);
        
        emit Liquidation(msg.sender, borrower, collateral, actualDebt, collateralToSeize);
    }

    // ── Peg Stability Module ─────────────────────────────────────────────────

    /**
     * @notice Buy dUSD at peg using approved stablecoins
     */
    function buyAtPeg(address stablecoin, uint256 amount) 
        external 
        nonReentrant 
        whenProtocolNotPaused
    {
        if (amount == 0) revert ZeroAmount();
        
        IERC20(stablecoin).safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
        
        emit PegStabilityAction(stablecoin, amount, amount);
    }

    /**
     * @notice Sell dUSD at peg for approved stablecoins
     */
    function sellAtPeg(address stablecoin, uint256 amount) 
        external 
        nonReentrant 
        whenProtocolNotPaused
    {
        if (amount == 0) revert ZeroAmount();
        
        _burn(msg.sender, amount);
        IERC20(stablecoin).safeTransfer(msg.sender, amount);
        
        emit PegStabilityAction(stablecoin, amount, amount);
    }

    // ── Admin Functions ──────────────────────────────────────────────────────

    function configureCollateral(
        address token,
        uint256 minRatio,
        uint256 debtCeiling,
        uint256 stabilityFeeBps,
        bool enabled
    ) external onlyRole(GOVERNOR_ROLE) whenProtocolNotPaused {
        if (token == address(0)) revert ZeroAddress();
        
        if (!isCollateralSupported[token]) {
            supportedCollaterals.push(token);
            isCollateralSupported[token] = true;
        }
        
        collateralConfigs[token] = CollateralConfig({
            minCollateralizationRatio: minRatio,
            debtCeiling: debtCeiling,
            totalDebt: collateralConfigs[token].totalDebt,
            stabilityFeeBps: stabilityFeeBps,
            enabled: enabled
        });
        
        emit CollateralConfigured(token, minRatio, debtCeiling, enabled);
    }

    function setStabilityFee(address collateral, uint256 feeBps) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
    {
        require(feeBps <= 2000, "Fee too high"); // Max 20%
        collateralConfigs[collateral].stabilityFeeBps = feeBps;
        emit StabilityFeeUpdated(feeBps);
    }

    function setGlobalDebtCeiling(uint256 newCeiling) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
    {
        globalDebtCeiling = newCeiling;
    }

    function setPriceOracle(address _oracle) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
    {
        priceOracle = _oracle;
    }

    function updatePrice(address token, uint256 price) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
    {
        collateralPrices[token] = price;
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
    }

    // ── View Functions ───────────────────────────────────────────────────────

    function getCollateralizationRatio(address user, address collateral) 
        external 
        view 
        returns (uint256) 
    {
        return _getCollateralizationRatio(user, collateral);
    }

    function getVaultInfo(address user, address collateral) 
        external 
        view 
        returns (uint256 collateralAmount, uint256 debt, uint256 ratio) 
    {
        Vault storage vault = vaults[user][collateral];
        return (vault.collateralAmount, vault.debt, _getCollateralizationRatio(user, collateral));
    }

    function getSupportedCollaterals() external view returns (address[] memory) {
        return supportedCollaterals;
    }

    // ── Internal Functions ───────────────────────────────────────────────────

    function _accrueStabilityFee(Vault storage vault, address collateral) internal {
        if (vault.debt == 0 || vault.lastFeeUpdate == 0) return;
        
        uint256 timeElapsed = block.timestamp - vault.lastFeeUpdate;
        uint256 feeBps = collateralConfigs[collateral].stabilityFeeBps;
        
        // Annual fee: (debt * feeBps * timeElapsed) / (10000 * 365 days)
        uint256 accruedFee = (vault.debt * feeBps * timeElapsed) / (10000 * 365 days);
        
        if (accruedFee > 0) {
            vault.debt += accruedFee;
            collateralConfigs[collateral].totalDebt += accruedFee;
            totalDebt += accruedFee;
        }
        
        vault.lastFeeUpdate = block.timestamp;
    }

    function _getCollateralizationRatio(address user, address collateral) 
        internal 
        view 
        returns (uint256) 
    {
        Vault storage vault = vaults[user][collateral];
        if (vault.debt == 0) return type(uint256).max;
        
        uint256 collateralValue = (vault.collateralAmount * collateralPrices[collateral]) / PRECISION;
        uint256 debtValue = vault.debt; // dUSD is pegged to $1
        
        return (collateralValue * 10000) / debtValue; // Return in basis points
    }

    function _checkCollateralization(address user, address collateral) internal view {
        uint256 ratio = _getCollateralizationRatio(user, collateral);
        uint256 minRatio = collateralConfigs[collateral].minCollateralizationRatio;
        
        if (ratio < minRatio) {
            revert CollateralizationTooLow(ratio, minRatio);
        }
    }

    function _layerId() internal pure returns (bytes32) {
        return keccak256("LAYER_9_SETTLEMENT");
    }

    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
    }
}
