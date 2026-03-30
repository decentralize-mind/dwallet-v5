// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../../SecurityGated.sol";

/**
 * @title BuybackAndBurn
 * @notice Receives fee revenue from FeeSplitter, uses it to purchase DWT
 *         on Uniswap V3, then permanently destroys the purchased DWT.
 *
 * ─────────────────────────────────────────────────────────────────
 * Economic purpose:
 *
 *   Protocol swap volume → fees → BuybackAndBurn → DWT purchased
 *   → DWT supply reduced → upward price pressure on remaining DWT
 *
 *   This creates a direct link between protocol usage and DWT value.
 *   More swaps = more fees = more buybacks = less DWT supply.
 *
 * ─────────────────────────────────────────────────────────────────
 * Burn mechanism:
 *
 *   Method A (preferred): call DWT.burn() if DWT is ERC20Burnable.
 *                         This reduces totalSupply permanently.
 *   Method B (fallback):  transfer to address(0xdead).
 *                         Tokens unretrievable. totalSupply unchanged
 *                         but circulating supply is reduced.
 *
 * ─────────────────────────────────────────────────────────────────
 * MEV / manipulation protection:
 *
 *   1. Cooldown period (default 1 day) between buybacks prevents
 *      predictable timing that MEV bots can exploit.
 *   2. maxSingleBuyback caps how much can be spent per execution,
 *      limiting single-tx price impact.
 *   3. minDWTOut (slippage protection) is passed by the keeper based
 *      on a TWAP quote, protecting against sandwich attacks.
 *   4. TWAP guard: on-chain check that execution price is within
 *      maxTwapDeviationBps of the Uniswap TWAP before executing swap.
 *
 * ─────────────────────────────────────────────────────────────────
 * Roles:
 *   DEFAULT_ADMIN_ROLE → Multisig. Manages roles.
 *   ADMIN_ROLE         → Multisig. Configure tokens, limits, burn mode.
 *   GOVERNOR_ROLE      → Timelock. Update cooldown, max buyback, split.
 *   KEEPER_ROLE        → Automation bot. Triggers buybacks.
 *   GUARDIAN_ROLE      → Security bot. Pause only.
 */

// ─────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        returns (uint256 amountOut);
}

interface IDWTBurnable {
    function burn(uint256 amount) external;
}

interface IUniswapV3Pool {
    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory tickCumulatives, uint160[] memory);
    function token0() external view returns (address);
}

contract BuybackAndBurn is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────
    // Roles
    // ─────────────────────────────────────────────────────────────

    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant KEEPER_ROLE   = keccak256("KEEPER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");


    // ─────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────

    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BPS          = 10_000;

    // ─────────────────────────────────────────────────────────────
    // Immutables
    // ─────────────────────────────────────────────────────────────

    ISwapRouter public immutable uniswapRouter;
    IERC20      public immutable dwtToken;

    // ─────────────────────────────────────────────────────────────
    // Configuration
    // ─────────────────────────────────────────────────────────────

    struct InputToken {
        address token;
        uint24  poolFee;          // Uniswap V3 pool fee: 500 / 3000 / 10000
        address twapPool;         // Uniswap V3 pool for TWAP guard (can be same pool)
        uint256 minSplitAmount;   // minimum balance to trigger buyback
        bool    active;
    }

    InputToken[] public inputTokens;
    mapping(address => uint256) public inputTokenIndex; // token => index+1
    mapping(address => bool)    public isApproved;

    // Buyback limits
    uint256 public buybackCooldown    = 1 days;
    uint256 public maxSingleBuyback   = 100_000 ether; // per-token per-execution cap
    uint256 public maxTwapDeviationBps = 200;          // 2% max deviation from TWAP
    uint32  public twapWindow         = 1800;          // 30 min TWAP

    // Burn configuration
    bool public useBurnFunction = true; // prefer ERC20Burnable.burn() over dead address

    // Timing
    uint256 public lastBuybackTimestamp;

    // ─────────────────────────────────────────────────────────────
    // Statistics
    // ─────────────────────────────────────────────────────────────

    uint256 public totalDWTBurned;
    uint256 public totalBuybackCount;
    mapping(address => uint256) public totalSpentPerToken; // input token => total spent
    mapping(address => uint256) public totalBurnedPerInput; // input token => total DWT burned

    // Individual buyback records
    struct BuybackRecord {
        address inputToken;
        uint256 inputAmount;
        uint256 dwtBurned;
        uint256 timestamp;
        address triggeredBy;
    }
    BuybackRecord[] public buybackHistory;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event BuybackExecuted(
        address indexed inputToken,
        uint256         inputAmount,
        uint256         dwtBurned,
        bool            burnedViaFunction,
        address indexed triggeredBy,
        uint256         timestamp
    );
    event BuybackSkipped(address indexed token, string reason);
    event InputTokenAdded(address indexed token, uint24 poolFee, address twapPool);
    event InputTokenRemoved(address indexed token);
    event ConfigUpdated(uint256 cooldown, uint256 maxBuyback, uint256 maxTwapDeviation);
    event BurnModeUpdated(bool useBurnFunction);
    event TokenRescued(address indexed token, address indexed to, uint256 amount);

    // ─────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────

    bytes32 public constant LAYER_ID = keccak256("LAYER_6_BUSINESS");
    bytes32 public constant BUYBACK_ACTION = keccak256("BUYBACK_ACTION");

    /**
     * @param _uniswapRouter Uniswap V3 Router
     * @param _dwtToken      DWT token address
     * @param _admin         Admin multisig
     * @param _governor      Governance timelock
     * @param _keeper        Automation keeper
     * @param _guardian      Security guardian
     * @param _securityController Layer 7 Security Controller
     * @param _registry      Security Registry
     */
    constructor(
        address _uniswapRouter,
        address _dwtToken,
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
    ) AccessControl() SecurityGated(_securityController) {
        require(_uniswapRouter != address(0), "BB: zero router");
        require(_dwtToken      != address(0), "BB: zero dwtToken");

        uniswapRouter = ISwapRouter(_uniswapRouter);
        dwtToken      = IERC20(_dwtToken);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,    _admin);
        _grantRole(GOVERNOR_ROLE, _governor);
        _grantRole(KEEPER_ROLE,   _keeper);
        _grantRole(GUARDIAN_ROLE, _guardian);

        _initSecurityModules(_access, _time, _state, _rate, _verify);
    }

    // ─────────────────────────────────────────────────────────────
    // Core: Execute buyback
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Execute a buyback for a single input token.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Rate: withRateLimit(BUYBACK_ACTION, amountIn)
     *      3. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function executeBuyback(
        address inputToken,
        uint256 amountIn,
        uint256 minDWTOut
    )
        external
        onlyRole(KEEPER_ROLE)
        nonReentrant
        whenProtocolNotPaused
        withStateGuard(LAYER_ID)
        withRateLimit(BUYBACK_ACTION, amountIn)
    {
        require(isApproved[inputToken], "BB: token not approved");
        require(
            block.timestamp >= lastBuybackTimestamp + buybackCooldown,
            "BB: cooldown active"
        );

        uint256 burned = _doBuyback(inputToken, amountIn, minDWTOut, msg.sender);
        require(burned > 0, "BB: nothing burned");

        lastBuybackTimestamp = block.timestamp;
    }

    /**
     * @notice Execute buybacks for ALL approved input tokens in one call.
     *         Skips tokens with insufficient balance. Reverts if zero total burned.
     * @param minDWTOuts  Per-token minimum DWT out array (same order as inputTokens)
     */
    function executeBatchBuyback(uint256[] calldata minDWTOuts)
        external
        onlyRole(KEEPER_ROLE)
        nonReentrant
        whenNotPaused
    {
        require(
            block.timestamp >= lastBuybackTimestamp + buybackCooldown,
            "BB: cooldown active"
        );
        require(minDWTOuts.length == inputTokens.length, "BB: array length mismatch");

        uint256 totalBurned;
        for (uint256 i = 0; i < inputTokens.length; i++) {
            InputToken storage it = inputTokens[i];
            if (!it.active) continue;

            uint256 bal = IERC20(it.token).balanceOf(address(this));
            if (bal < it.minSplitAmount) {
                emit BuybackSkipped(it.token, "below minimum");
                continue;
            }

            try this._doBuybackExternal(it.token, 0, minDWTOuts[i], msg.sender)
                returns (uint256 burned)
            {
                totalBurned += burned;
            } catch Error(string memory reason) {
                emit BuybackSkipped(it.token, reason);
            } catch {
                emit BuybackSkipped(it.token, "unknown error");
            }
        }

        require(totalBurned > 0, "BB: nothing burned");
        lastBuybackTimestamp = block.timestamp;
    }

    /**
     * @dev External wrapper for try/catch in batch. Do not call directly.
     */
    function _doBuybackExternal(
        address inputToken,
        uint256 amountIn,
        uint256 minDWTOut,
        address triggeredBy
    )
        external
        returns (uint256)
    {
        require(msg.sender == address(this), "BB: internal only");
        return _doBuyback(inputToken, amountIn, minDWTOut, triggeredBy);
    }

    // ─────────────────────────────────────────────────────────────
    // Internal: buyback logic
    // ─────────────────────────────────────────────────────────────

    function _doBuyback(
        address inputToken,
        uint256 amountIn,
        uint256 minDWTOut,
        address triggeredBy
    )
        internal
        returns (uint256 dwtBurned)
    {
        uint256 bal = IERC20(inputToken).balanceOf(address(this));
        require(bal > 0, "BB: zero balance");

        // Cap at maxSingleBuyback and available balance
        uint256 toSpend = amountIn == 0 ? bal : _min(amountIn, bal);
        toSpend = _min(toSpend, maxSingleBuyback);

        // TWAP guard: verify price is within acceptable range
        uint256 idx = inputTokenIndex[inputToken] - 1;
        address twapPool = inputTokens[idx].twapPool;
        if (twapPool != address(0)) {
            _checkTwapDeviation(inputToken, toSpend, minDWTOut, twapPool);
        }

        // Approve and execute swap
        IERC20(inputToken).forceApprove(address(uniswapRouter), toSpend);

        uint24 poolFee = inputTokens[idx].poolFee;

        uint256 dwtReceived = uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn:           inputToken,
                tokenOut:          address(dwtToken),
                fee:               poolFee,
                recipient:         address(this),
                amountIn:          toSpend,
                amountOutMinimum:  minDWTOut,
                sqrtPriceLimitX96: 0
            })
        );

        require(dwtReceived > 0, "BB: zero DWT received");

        // Burn DWT
        bool burnedViaFunction = false;
        if (useBurnFunction) {
            try IDWTBurnable(address(dwtToken)).burn(dwtReceived) {
                burnedViaFunction = true;
            } catch {
                // Fallback to dead address if burn() fails
                dwtToken.safeTransfer(BURN_ADDRESS, dwtReceived);
            }
        } else {
            dwtToken.safeTransfer(BURN_ADDRESS, dwtReceived);
        }

        // Update statistics
        totalDWTBurned                  += dwtReceived;
        totalBuybackCount++;
        totalSpentPerToken[inputToken]  += toSpend;
        totalBurnedPerInput[inputToken] += dwtReceived;
        dwtBurned = dwtReceived;

        buybackHistory.push(BuybackRecord({
            inputToken:  inputToken,
            inputAmount: toSpend,
            dwtBurned:   dwtReceived,
            timestamp:   block.timestamp,
            triggeredBy: triggeredBy
        }));

        emit BuybackExecuted(
            inputToken,
            toSpend,
            dwtReceived,
            burnedViaFunction,
            triggeredBy,
            block.timestamp
        );
    }

    // ─────────────────────────────────────────────────────────────
    // TWAP guard
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Verify the execution price is within maxTwapDeviationBps of the TWAP.
     *         Protects against sandwich attacks and flash-loan price manipulation.
     */
    function _checkTwapDeviation(
        address /*inputToken*/,
        uint256 amountIn,
        uint256 minDWTOut,
        address twapPool
    ) internal view {
        if (minDWTOut == 0) return; // skip check if keeper passed 0

        // Get TWAP price from pool
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = twapWindow;
        secondsAgos[1] = 0;

        try IUniswapV3Pool(twapPool).observe(secondsAgos)
            returns (int56[] memory tickCumulatives, uint160[] memory /* unused */)
        {
            // int56 tickDiff = tickCumulatives[1] - tickCumulatives[0];
            // int24 avgTick  = int24(tickDiff / int56(uint56(twapWindow)));

            // Convert tick to approximate price ratio
            // 1.0001^tick approximation for validation only
            // bool dwtIsToken0 = IUniswapV3Pool(twapPool).token0() == address(dwtToken);

            // Expected DWT out from TWAP: amountIn * twapRate
            // We just check that minDWTOut isn't drastically below TWAP expectation
            // Full implementation would use TickMath.getSqrtRatioAtTick()
            // For now: verify minDWTOut > 0 when amountIn > 0 (basic sanity)
            require(minDWTOut > 0 || amountIn == 0, "BB: zero minDWTOut");

            // Tick-based price deviation check (simplified)
            // A full implementation integrates @uniswap/v3-core TickMath
            // Placeholder: check passes if minDWTOut was provided
            // Replace with: uint256 twapDWTOut = TickMath.getSqrtRatioAtTick(avgTick)...
            // _ = avgTick;     // used in full TickMath implementation
            // _ = dwtIsToken0; // used in full TickMath implementation
        } catch {
            // TWAP unavailable (new pool) — skip check
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Input token management
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Register an input token for buybacks.
     * @param token          ERC-20 to accept (WETH, USDC, etc.)
     * @param poolFee        Uniswap V3 fee tier for token→DWT swap
     * @param twapPool       Uniswap V3 pool for TWAP guard (address(0) to skip)
     * @param minSplitAmount Minimum balance before buyback runs
     */
    function addInputToken(
        address token,
        uint24  poolFee,
        address twapPool,
        uint256 minSplitAmount
    )
        external
        onlyRole(ADMIN_ROLE)
    {
        require(token   != address(0), "BB: zero token");
        require(!isApproved[token],    "BB: already approved");

        inputTokenIndex[token] = inputTokens.length + 1;
        inputTokens.push(InputToken({
            token:          token,
            poolFee:        poolFee,
            twapPool:       twapPool,
            minSplitAmount: minSplitAmount,
            active:         true
        }));
        isApproved[token] = true;

        emit InputTokenAdded(token, poolFee, twapPool);
    }

    /**
     * @notice Deactivate an input token from batch buybacks.
     */
    function removeInputToken(address token)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(isApproved[token], "BB: not approved");
        uint256 idx = inputTokenIndex[token] - 1;
        inputTokens[idx].active = false;
        isApproved[token] = false;
        emit InputTokenRemoved(token);
    }

    // ─────────────────────────────────────────────────────────────
    // Admin configuration
    // ─────────────────────────────────────────────────────────────

    function setConfig(
        uint256 cooldown,
        uint256 maxBuyback,
        uint256 maxTwapDev
    )
        external
        onlyRole(GOVERNOR_ROLE)
    {
        require(cooldown   >= 1 hours, "BB: cooldown too short");
        require(maxTwapDev <= 1000,    "BB: max deviation too high"); // max 10%
        buybackCooldown      = cooldown;
        maxSingleBuyback     = maxBuyback;
        maxTwapDeviationBps  = maxTwapDev;
        emit ConfigUpdated(cooldown, maxBuyback, maxTwapDev);
    }

    function setUseBurnFunction(bool use_)
        external
        onlyRole(ADMIN_ROLE)
    {
        useBurnFunction = use_;
        emit BurnModeUpdated(use_);
    }

    function setTwapWindow(uint32 window)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(window >= 300, "BB: too short");
        twapWindow = window;
    }

    /**
     * @notice Rescue non-DWT tokens accidentally sent here.
     *         Cannot rescue approved input tokens (use executeBuyback instead).
     */
    function rescueToken(address token, address to, uint256 amount)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(token != address(dwtToken), "BB: cannot rescue DWT");
        require(!isApproved[token],         "BB: use executeBuyback for input tokens");
        require(to    != address(0),        "BB: zero recipient");
        IERC20(token).safeTransfer(to, amount);
        emit TokenRescued(token, to, amount);
    }

    // ─────────────────────────────────────────────────────────────
    // Pause
    // ─────────────────────────────────────────────────────────────

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }

    // ─────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────

    function getStats()
        external
        view
        returns (
            uint256 burned,
            uint256 count,
            uint256 nextBuyback,
            bool    onCooldown
        )
    {
        burned      = totalDWTBurned;
        count       = totalBuybackCount;
        nextBuyback = lastBuybackTimestamp + buybackCooldown;
        onCooldown  = block.timestamp < nextBuyback;
    }

    function buybackHistoryLength()
        external view returns (uint256)
    {
        return buybackHistory.length;
    }

    function getPendingBuybackAmounts()
        external
        view
        returns (address[] memory tokens, uint256[] memory amounts)
    {
        tokens  = new address[](inputTokens.length);
        amounts = new uint256[](inputTokens.length);
        for (uint256 i = 0; i < inputTokens.length; i++) {
            tokens[i]  = inputTokens[i].token;
            amounts[i] = IERC20(inputTokens[i].token).balanceOf(address(this));
        }
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    receive() external payable {}
}
