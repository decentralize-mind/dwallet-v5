// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../../SecurityGated.sol";

/**
 * @title Treasury
 * @notice Central protocol fee vault for the dWallet ecosystem.
 *
 * The Treasury is the financial hub of the protocol. All fee revenue
 * flows here from DWalletFeeRouter and DWTPaymaster. Governance (via
 * TimelockController) controls how those funds are deployed.
 *
 * ─────────────────────────────────────────────────────────────────
 * Revenue sources:
 *   • Swap protocol fees   (DWT, WETH, USDC — from DWalletFeeRouter)
 *   • Paymaster DWT margin (from DWTPaymaster)
 *   • Bridge fees          (ETH — from DWTBridge)
 *   • Direct ETH deposits  (from protocol-owned liquidity)
 *
 * Outbound destinations:
 *   • StakingPool          (DWT rewards for DWT stakers)
 *   • DWTStaking           (ETH rewards for DWT stakers)
 *   • BuybackAndBurn       (DWT deflation)
 *   • Grants / operations  (arbitrary governance spend)
 *   • Vesting contracts    (team / investor allocations)
 *
 * ─────────────────────────────────────────────────────────────────
 * Role model (principle of least privilege):
 *
 *   DEFAULT_ADMIN_ROLE  → Multisig. Can grant/revoke all roles.
 *   GOVERNOR_ROLE       → TimelockController. Executes passed proposals:
 *                         spendFunds(), fundStakingPool(),
 *                         fundETHStaking(), setBudget(), approveSpender().
 *   SPENDER_ROLE        → Contracts pre-approved by governance for
 *                         specific token budgets (e.g. BuybackAndBurn).
 *   DEPOSITOR_ROLE      → Contracts that are allowed to send fees here
 *                         (e.g. FeeRouter, Paymaster). No spend rights.
 *   GUARDIAN_ROLE       → Security monitoring. Can only pause.
 *   ADMIN_ROLE          → Multisig. Emergency withdraw only.
 *
 * ─────────────────────────────────────────────────────────────────
 * Budget system:
 *   Governance can set a per-token budget cap for SPENDER_ROLE contracts.
 *   e.g. Allow BuybackAndBurn to pull up to 50,000 DWT per week.
 *   Budget resets every budgetPeriod (default 7 days).
 *
 * ─────────────────────────────────────────────────────────────────
 * Spend tracking:
 *   All outbound transfers are recorded with category tags, enabling
 *   full on-chain auditability of treasury spend history.
 */

// ─────────────────────────────────────────────────────────────
// External interfaces
// ─────────────────────────────────────────────────────────────

interface IStakingPool {
    function notifyRewardAmount(uint256 reward, uint256 duration) external;
}

interface IDWTStaking {
    function notifyRewardAmount(uint256 duration) external payable;
}

contract Treasury is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────
    // Roles
    // ─────────────────────────────────────────────────────────────

    bytes32 public constant GOVERNOR_ROLE  = keccak256("GOVERNOR_ROLE");
    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");
    bytes32 public constant SPENDER_ROLE   = keccak256("SPENDER_ROLE");
    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE  = keccak256("GUARDIAN_ROLE");


    // ─────────────────────────────────────────────────────────────
    // Budget system
    // ─────────────────────────────────────────────────────────────

    struct Budget {
        uint256 cap;          // max tokens per period
        uint256 spent;        // tokens spent this period
        uint256 periodStart;  // timestamp of current period start
        uint256 period;       // period length in seconds
        bool    active;       // budget is enforced
    }

    // spender => token => Budget
    mapping(address => mapping(address => Budget)) public budgets;

    uint256 public constant DEFAULT_BUDGET_PERIOD = 7 days;

    // ─────────────────────────────────────────────────────────────
    // Spend tracking
    // ─────────────────────────────────────────────────────────────

    enum SpendCategory {
        STAKING_REWARD,   // 0 — reward pool funding
        BUYBACK,          // 1 — buyback & burn
        GRANT,            // 2 — DAO grant / development
        OPERATIONS,       // 3 — team / ops
        VESTING,          // 4 — vesting contract funding
        BRIDGE_FEE,       // 5 — cross-chain fee payment
        OTHER             // 6 — miscellaneous
    }

    struct SpendRecord {
        address     token;      // address(0) = ETH
        address     recipient;
        uint256     amount;
        SpendCategory category;
        string      memo;
        uint256     timestamp;
        address     authorizedBy;
    }

    SpendRecord[] public spendHistory;

    // Token balances at last record (for accounting reconciliation)
    mapping(address => uint256) public lastRecordedBalance;

    // ─────────────────────────────────────────────────────────────
    // Revenue tracking
    // ─────────────────────────────────────────────────────────────

    mapping(address => uint256) public totalReceived;  // token => cumulative amount
    uint256                     public totalEthReceived;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event FundsSpent(
        address indexed token,
        address indexed recipient,
        uint256 amount,
        SpendCategory category,
        string memo,
        address indexed authorizedBy
    );
    event StakingPoolFunded(
        address indexed pool,
        address indexed token,
        uint256 amount,
        uint256 duration
    );
    event ETHStakingFunded(
        address indexed pool,
        uint256 ethAmount,
        uint256 duration
    );
    event BudgetSet(
        address indexed spender,
        address indexed token,
        uint256 cap,
        uint256 period
    );
    event SpenderWithdraw(
        address indexed spender,
        address indexed token,
        uint256 amount
    );
    event ETHReceived(address indexed sender, uint256 amount);
    event TokenReceived(
        address indexed token,
        address indexed sender,
        uint256 amount
    );
    event EmergencyWithdraw(
        address indexed token,
        address indexed to,
        uint256 amount,
        address indexed admin
    );

    // ─────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────

    bytes32 public constant LAYER_ID = keccak256("LAYER_6_BUSINESS");
    bytes32 public constant SPEND_ACTION = keccak256("SPEND_ACTION");

    /**
     * @param admin    Multisig — ADMIN_ROLE + DEFAULT_ADMIN_ROLE
     * @param _governor TimelockController — GOVERNOR_ROLE
     * @param _guardian Security bot — GUARDIAN_ROLE (pause only)
     * @param _securityController Layer 7 Security Controller
     */
    constructor(
        address admin,
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
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);
        _grantRole(GUARDIAN_ROLE,      _guardian);

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    // ─────────────────────────────────────────────────────────────
    // Governance: spend ERC-20 or ETH
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Send tokens or ETH to any address. Requires GOVERNOR_ROLE.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Time: withTimeLock(SPEND_ACTION)
     *      3. Rate: withRateLimit(SPEND_ACTION, amount)
     *      4. Verification: withSignature(hash, signature)
     *      5. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function spendFunds(
        address          token,
        address payable  recipient,
        uint256          amount,
        SpendCategory    category,
        string calldata  memo,
        bytes32          hash,
        bytes calldata   signature
    )
        external
        onlyRole(GOVERNOR_ROLE)
        nonReentrant
        whenProtocolNotPaused
        withStateGuard(LAYER_ID)
        withTimeLock(SPEND_ACTION)
        withRateLimit(SPEND_ACTION, amount)
        withSignature(hash, signature)
    {
        require(recipient != address(0), "Treasury: zero recipient");
        require(amount    >  0,          "Treasury: zero amount");

        _executeTransfer(token, recipient, amount);
        _recordSpend(token, recipient, amount, category, memo, msg.sender);
    }

    /**
     * @notice Batch spend — execute multiple transfers in one governance proposal.
     *         All-or-nothing: if one transfer fails, the whole batch reverts.
     */
    function batchSpendFunds(
        address[]         calldata tokens,
        address payable[] calldata recipients,
        uint256[]         calldata amounts,
        SpendCategory[]   calldata categories,
        string[]          calldata memos
    )
        external
        onlyRole(GOVERNOR_ROLE)
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
    {
        uint256 len = tokens.length;
        require(
            recipients.length == len &&
            amounts.length    == len &&
            categories.length == len &&
            memos.length      == len,
            "Treasury: array length mismatch"
        );

        for (uint256 i = 0; i < len; i++) {
            require(recipients[i] != address(0), "Treasury: zero recipient");
            require(amounts[i]    >  0,          "Treasury: zero amount");
            _executeTransfer(tokens[i], recipients[i], amounts[i]);
            _recordSpend(tokens[i], recipients[i], amounts[i], categories[i], memos[i], msg.sender);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Governance: fund staking pools
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Transfer DWT to a StakingPool and trigger its reward cycle.
     * @param pool     StakingPool contract address
     * @param token    DWT token address
     * @param amount   DWT amount to forward
     * @param duration Reward period in seconds (e.g. 7 days)
     */
    function fundStakingPool(
        address pool,
        address token,
        uint256 amount,
        uint256 duration
    )
        external
        onlyRole(GOVERNOR_ROLE)
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
    {
        require(pool   != address(0), "Treasury: zero pool");
        require(token  != address(0), "Treasury: zero token");
        require(amount >  0,          "Treasury: zero amount");
        require(duration > 0,         "Treasury: zero duration");

        IERC20(token).safeTransfer(pool, amount);
        IStakingPool(pool).notifyRewardAmount(amount, duration);

        _recordSpend(
            token, pool, amount,
            SpendCategory.STAKING_REWARD,
            "StakingPool reward cycle funded",
            msg.sender
        );

        emit StakingPoolFunded(pool, token, amount, duration);
    }

    /**
     * @notice Send ETH to DWTStaking and trigger its ETH reward cycle.
     * @param pool     DWTStaking contract address
     * @param amount   ETH amount in wei
     * @param duration Reward period in seconds
     */
    function fundETHStaking(
        address pool,
        uint256 amount,
        uint256 duration
    )
        external
        onlyRole(GOVERNOR_ROLE)
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
    {
        require(pool   != address(0),          "Treasury: zero pool");
        require(amount >  0,                   "Treasury: zero amount");
        require(address(this).balance >= amount, "Treasury: insufficient ETH");
        require(duration > 0,                  "Treasury: zero duration");

        IDWTStaking(pool).notifyRewardAmount{value: amount}(duration);

        _recordSpend(
            address(0), pool, amount,
            SpendCategory.STAKING_REWARD,
            "DWTStaking ETH reward cycle funded",
            msg.sender
        );

        emit ETHStakingFunded(pool, amount, duration);
    }

    // ─────────────────────────────────────────────────────────────
    // Budget system: SPENDER_ROLE pull model
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Set a periodic budget for a SPENDER_ROLE contract.
     *         e.g. Allow BuybackAndBurn to pull up to 50,000 DWT per week.
     *         Requires GOVERNOR_ROLE.
     * @param spender Address with SPENDER_ROLE
     * @param token   Token the budget applies to (address(0) = ETH)
     * @param cap     Max tokens per period
     * @param period  Period length in seconds
     */
    function setBudget(
        address spender,
        address token,
        uint256 cap,
        uint256 period
    )
        external
        onlyRole(GOVERNOR_ROLE)
        whenProtocolNotPaused
    {
        require(spender != address(0), "Treasury: zero spender");
        require(period  >  0,          "Treasury: zero period");
        require(hasRole(SPENDER_ROLE, spender), "Treasury: not a spender");

        budgets[spender][token] = Budget({
            cap:         cap,
            spent:       0,
            periodStart: block.timestamp,
            period:      period,
            active:      cap > 0
        });

        emit BudgetSet(spender, token, cap, period);
    }

    /**
     * @notice SPENDER_ROLE contracts call this to pull their budget allocation.
     *         Cannot exceed the budget cap for the current period.
     * @param token  Token to pull (address(0) = ETH)
     * @param amount Amount to pull
     * @param memo   Reason for spend
     */
    function pullBudget(
        address         token,
        uint256         amount,
        string calldata memo
    )
        external
        onlyRole(SPENDER_ROLE)
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
    {
        require(amount > 0, "Treasury: zero amount");

        Budget storage b = budgets[msg.sender][token];
        require(b.active, "Treasury: no budget set");

        // Reset period if expired
        if (block.timestamp >= b.periodStart + b.period) {
            b.periodStart = block.timestamp;
            b.spent       = 0;
        }

        require(b.spent + amount <= b.cap, "Treasury: budget exceeded");
        b.spent += amount;

        _executeTransfer(token, payable(msg.sender), amount);
        _recordSpend(token, msg.sender, amount, SpendCategory.OTHER, memo, msg.sender);

        emit SpenderWithdraw(msg.sender, token, amount);
    }

    /**
     * @notice View remaining budget for a spender/token pair this period.
     */
    function remainingBudget(address spender, address token)
        external
        view
        returns (uint256 remaining, uint256 periodEnds)
    {
        Budget storage b = budgets[spender][token];
        if (!b.active) return (0, 0);

        uint256 end = b.periodStart + b.period;
        if (block.timestamp >= end) {
            return (b.cap, block.timestamp + b.period);
        }
        uint256 used = b.spent;
        remaining  = b.cap > used ? b.cap - used : 0;
        periodEnds = end;
    }

    // ─────────────────────────────────────────────────────────────
    // Revenue reception
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Called by DEPOSITOR_ROLE contracts (FeeRouter, Paymaster)
     *         to notify the Treasury of an incoming ERC-20 deposit.
     *         The caller must have already transferred the tokens.
     *         This function just updates accounting.
     */
    function notifyDeposit(address token, uint256 amount)
        external
        onlyRole(DEPOSITOR_ROLE)
    {
        require(token  != address(0), "Treasury: zero token");
        require(amount >  0,          "Treasury: zero amount");
        totalReceived[token] += amount;
        emit TokenReceived(token, msg.sender, amount);
    }

    // ─────────────────────────────────────────────────────────────
    // Emergency (ADMIN_ROLE only)
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Emergency token recovery bypassing governance.
     *         Use ONLY in case of critical exploit or bug.
     *         Emits an event for transparency.
     */
    function emergencyWithdraw(
        address         token,
        address payable to,
        uint256         amount
    )
        external
        onlyRole(ADMIN_ROLE)
        nonReentrant
        whenProtocolNotPaused
    {
        require(to     != address(0), "Treasury: zero recipient");
        require(amount >  0,          "Treasury: zero amount");

        _executeTransfer(token, to, amount);
        emit EmergencyWithdraw(token, to, amount, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────
    // Pause (GUARDIAN_ROLE)
    // ─────────────────────────────────────────────────────────────

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }

    // ─────────────────────────────────────────────────────────────
    // View helpers
    // ─────────────────────────────────────────────────────────────

    function ethBalance()
        external view returns (uint256)
    {
        return address(this).balance;
    }

    function tokenBalance(address token)
        external view returns (uint256)
    {
        return IERC20(token).balanceOf(address(this));
    }

    function spendHistoryLength()
        external view returns (uint256)
    {
        return spendHistory.length;
    }

    /**
     * @notice Get a paginated slice of spend history.
     * @param from  Start index (inclusive)
     * @param to_   End index (exclusive)
     */
    function getSpendHistory(uint256 from, uint256 to_)
        external
        view
        returns (SpendRecord[] memory records)
    {
        require(to_ > from,                   "Treasury: invalid range");
        require(to_ <= spendHistory.length,   "Treasury: out of range");
        uint256 len = to_ - from;
        records = new SpendRecord[](len);
        for (uint256 i = 0; i < len; i++) {
            records[i] = spendHistory[from + i];
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────

    function _executeTransfer(
        address         token,
        address payable recipient,
        uint256         amount
    ) internal {
        if (token == address(0)) {
            require(address(this).balance >= amount, "Treasury: insufficient ETH");
            (bool ok, ) = recipient.call{value: amount}("");
            require(ok, "Treasury: ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
    }

    function _recordSpend(
        address       token,
        address       recipient,
        uint256       amount,
        SpendCategory category,
        string memory memo,
        address       authorizedBy
    ) internal {
        spendHistory.push(SpendRecord({
            token:        token,
            recipient:    recipient,
            amount:       amount,
            category:     category,
            memo:         memo,
            timestamp:    block.timestamp,
            authorizedBy: authorizedBy
        }));

        emit FundsSpent(token, recipient, amount, category, memo, authorizedBy);
    }

    // ─────────────────────────────────────────────────────────────
    // Receive ETH
    // ─────────────────────────────────────────────────────────────

    receive() external payable {
        totalEthReceived += msg.value;
        emit ETHReceived(msg.sender, msg.value);
    }
}
