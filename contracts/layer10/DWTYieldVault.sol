// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../SecurityGated.sol";

/**
 * @title DWTYieldVault
 * @notice ERC-4626 compliant yield vault for DWT tokens.
 *
 *  Strategy overview
 *  -----------------
 *  Depositors receive vault shares (vDWT) representing their proportional
 *  ownership of the underlying DWT pool.
 *
 *  Yield is accrued by an off-chain strategy manager calling `reportYield()`
 *  which mints new "virtual" yield into the vault, increasing the share price.
 *  A performance fee is taken from yield in favour of the protocol treasury.
 *
 *  This contract is intentionally strategy-agnostic:
 *   - The strategy manager address is set by the owner.
 *   - Concrete strategies (lending, LP, staking) should be implemented as
 *     separate adapters that call `reportYield()` after harvesting.
 *
 *  Withdrawal queue
 *  ----------------
 *  Large withdrawals can be queued; the strategy manager must source
 *  liquidity and call `processWithdrawal()`.  Small withdrawals (below
 *  `instantWithdrawLimit`) are processed immediately from the idle buffer.
 */
contract DWTYieldVault is ERC4626, AccessControl, ReentrancyGuard, SecurityGated {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    bytes32 public constant LAYER_ID      = keccak256("LAYER_10_ECOSYSTEM");

    // ── Action IDs for Rate Limiting ─────────────────────────────────────────
    bytes32 public constant ACTION_DEPOSIT  = keccak256("ACTION_DEPOSIT");
    bytes32 public constant ACTION_WITHDRAW = keccak256("ACTION_WITHDRAW");

    // ─────────────────────────────────────────────
    //  Types
    // ─────────────────────────────────────────────

    struct WithdrawalRequest {
        address owner;
        uint256 shares;
        uint256 requestedAt;
        bool    processed;
    }

    // ─────────────────────────────────────────────
    //  Storage
    // ─────────────────────────────────────────────

    address public strategyManager;
    address public treasury;

    // Performance fee on yield: default 10%
    uint256 public performanceFeeBps = 1_000;

    // Management fee per year in bps: default 0.5%
    uint256 public managementFeeBps  = 50;
    uint256 public lastFeeTimestamp;

    // Withdrawal queue
    uint256 public nextWithdrawalId;
    mapping(uint256 => WithdrawalRequest) public withdrawalQueue;
    uint256 public pendingWithdrawalShares; // total shares in queue

    // Instant withdrawal limit (in underlying DWT, 18 dec)
    uint256 public instantWithdrawLimit = 10_000 ether;

    // Total assets tracked (idle + deployed)
    uint256 private _totalManagedAssets;

    // Vault state
    bool public vaultPaused;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event YieldReported(uint256 grossYield, uint256 performanceFee, uint256 netYield);
    event ManagementFeeCollected(uint256 fee);
    event WithdrawalQueued(uint256 indexed requestId, address indexed owner, uint256 shares);
    event WithdrawalProcessed(uint256 indexed requestId, address indexed owner, uint256 assets);
    event StrategyManagerUpdated(address newManager);
    event VaultPaused(bool paused);

    // ─────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────

    modifier onlyStrategyManager() {
        require(msg.sender == strategyManager || hasRole(ADMIN_ROLE, msg.sender), "Not manager");
        _;
    }

    modifier notVaultPaused() {
        require(!vaultPaused, "Vault paused");
        _;
    }

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    /**
     * @param _dwt      Address of the DWT ERC-20 token (underlying asset).
     * @param _treasury Address receiving protocol fees.
     * @param _manager  Initial strategy manager.
     */
    constructor(address _dwt, address _treasury, address _manager, address _securityController)
        ERC4626(IERC20(_dwt))
        ERC20("Vault DWT", "vDWT")
        AccessControl()
        SecurityGated(_securityController)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        treasury         = _treasury;
        strategyManager  = _manager;
        lastFeeTimestamp = block.timestamp;
    }

    // ─────────────────────────────────────────────
    //  ERC-4626 overrides
    // ─────────────────────────────────────────────

    /**
     * @dev totalAssets includes idle balance + externally deployed capital.
     */
    function totalAssets() public view override returns (uint256) {
        return _totalManagedAssets;
    }

    function deposit(uint256 assets, address receiver)
        public 
        override 
        nonReentrant 
        notVaultPaused 
        ultraSecure(DEFAULT_ADMIN_ROLE, ACTION_DEPOSIT, LAYER_ID, assets)
        returns (uint256 shares)
    {
        _collectManagementFee();
        shares = super.deposit(assets, receiver);
        _totalManagedAssets += assets;
    }

    function mint(uint256 shares, address receiver)
        public 
        override 
        nonReentrant 
        notVaultPaused 
        ultraSecure(DEFAULT_ADMIN_ROLE, ACTION_DEPOSIT, LAYER_ID, previewRedeem(shares))
        returns (uint256 assets)
    {
        _collectManagementFee();
        assets = super.mint(shares, receiver);
        _totalManagedAssets += assets;
    }

    function withdraw(uint256 assets, address receiver, address owner_)
        public 
        override 
        nonReentrant 
        notVaultPaused 
        ultraSecure(DEFAULT_ADMIN_ROLE, ACTION_WITHDRAW, LAYER_ID, assets)
        returns (uint256 shares)
    {
        _collectManagementFee();

        // Phase 4: Economic Defense - Dynamic Withdrawal Fees
        uint256 threat = lockEngine.securityController().threatLevel();
        uint256 finalAssets = assets;
        if (threat > 50) {
            uint256 penalty = assets * 500 / 10000; // 5% penalty
            finalAssets = assets - penalty;
            IERC20(asset()).safeTransfer(treasury, penalty);
        }

        if (finalAssets <= instantWithdrawLimit && _idleBalance() >= finalAssets) {
            shares = super.withdraw(finalAssets, receiver, owner_);
            _totalManagedAssets -= assets; // subtract original gross assets
        } else {
            // Queue withdrawal
            shares = previewWithdraw(finalAssets);
            _transfer(owner_, address(this), shares);
            uint256 reqId = nextWithdrawalId++;
            withdrawalQueue[reqId] = WithdrawalRequest({
                owner:       receiver,
                shares:      shares,
                requestedAt: block.timestamp,
                processed:   false
            });
            pendingWithdrawalShares += shares;
            emit WithdrawalQueued(reqId, receiver, shares);
        }
    }

    function redeem(uint256 shares, address receiver, address owner_)
        public 
        override 
        nonReentrant 
        notVaultPaused 
        ultraSecure(DEFAULT_ADMIN_ROLE, ACTION_WITHDRAW, LAYER_ID, previewRedeem(shares))
        returns (uint256 assets)
    {
        _collectManagementFee();
        assets = previewRedeem(shares);

        // Phase 4: Dynamic Fees
        uint256 threat = lockEngine.securityController().threatLevel();
        if (threat > 50) {
            uint256 penalty = assets * 500 / 10000;
            assets -= penalty;
            IERC20(asset()).safeTransfer(treasury, penalty);
        }

        if (assets <= instantWithdrawLimit && _idleBalance() >= assets) {
            assets = super.redeem(shares, receiver, owner_);
            _totalManagedAssets -= previewRedeem(shares);
        } else {
            _transfer(owner_, address(this), shares);
            ...


    // ─────────────────────────────────────────────
    //  Strategy Manager: yield reporting
    // ─────────────────────────────────────────────

    /**
     * @notice Report harvested yield. Transfers `grossYield` DWT into the vault,
     *         takes a performance fee, and credits the rest to `_totalManagedAssets`.
     * @param grossYield Amount of DWT harvested (18 dec).
     */
    function reportYield(uint256 grossYield) 
        external 
        onlyStrategyManager 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        require(grossYield > 0, "No yield");

        IERC20(asset()).safeTransferFrom(msg.sender, address(this), grossYield);

        uint256 fee    = grossYield * performanceFeeBps / 10_000;
        uint256 netYield = grossYield - fee;

        if (fee > 0) {
            IERC20(asset()).safeTransfer(treasury, fee);
        }

        _totalManagedAssets += netYield;
        emit YieldReported(grossYield, fee, netYield);
    }

    /**
     * @notice Record capital that has been deployed externally (does not move tokens).
     *         Call when moving idle assets to an external protocol.
     */
    function recordDeployment(uint256 assets) external onlyStrategyManager whenProtocolNotPaused {
        // Assets are considered still part of totalManagedAssets; no change needed.
        // This is informational / for accounting; idle balance decreases naturally.
    }

    /**
     * @notice Record capital returned from an external protocol (does not move tokens).
     *         Tokens must already be transferred back to this contract before calling.
     */
    function recordReturn(uint256 assets) external onlyStrategyManager whenProtocolNotPaused {
        // idle balance increases naturally; no explicit tracking change needed.
    }

    // ─────────────────────────────────────────────
    //  Withdrawal queue processing
    // ─────────────────────────────────────────────

    /**
     * @notice Process a queued withdrawal. Caller must have returned liquidity first.
     */
    function processWithdrawal(uint256 requestId) 
        external 
        onlyStrategyManager 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        WithdrawalRequest storage req = withdrawalQueue[requestId];
        require(!req.processed,      "Already processed");
        require(req.shares > 0,      "Invalid request");

        uint256 assets = previewRedeem(req.shares);
        require(_idleBalance() >= assets, "Insufficient idle");

        req.processed = true;
        pendingWithdrawalShares -= req.shares;
        _burn(address(this), req.shares);
        _totalManagedAssets -= assets;

        IERC20(asset()).safeTransfer(req.owner, assets);
        emit WithdrawalProcessed(requestId, req.owner, assets);
    }

    // ─────────────────────────────────────────────
    //  Management fee
    // ─────────────────────────────────────────────

    function _collectManagementFee() internal {
        uint256 elapsed = block.timestamp - lastFeeTimestamp;
        if (elapsed == 0 || _totalManagedAssets == 0) return;

        uint256 fee = _totalManagedAssets * managementFeeBps * elapsed / (10_000 * 365 days);
        lastFeeTimestamp = block.timestamp;

        if (fee > 0 && fee < _totalManagedAssets) {
            // Mint shares to treasury representing fee
            uint256 shares = convertToShares(fee);
            _mint(treasury, shares);
            emit ManagementFeeCollected(fee);
        }
    }

    // ─────────────────────────────────────────────
    //  Internal helpers
    // ─────────────────────────────────────────────

    function _idleBalance() internal view returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────
    //  Admin
    // ─────────────────────────────────────────────

    function setStrategyManager(address _manager, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    {
        strategyManager = _manager;
        emit StrategyManagerUpdated(_manager);
    }

    function setTreasury(address _treasury, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    { 
        treasury = _treasury; 
    }

    function setPerformanceFeeBps(uint256 _bps, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    { 
        require(_bps <= 3000); 
        performanceFeeBps = _bps; 
    }

    function setManagementFeeBps(uint256 _bps, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    { 
        require(_bps <= 500);  
        managementFeeBps  = _bps; 
    }

    function setInstantWithdrawLimit(uint256 _limit, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    { 
        instantWithdrawLimit = _limit; 
    }

    function setVaultPaused(bool _paused) external onlyRole(GUARDIAN_ROLE) {
        vaultPaused = _paused;
        emit VaultPaused(_paused);
    }

    function rescueToken(address token, uint256 amount, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    {
        require(token != asset(), "Cannot rescue underlying");
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
