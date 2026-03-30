// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../SecurityGated.sol";

interface IFeeRouter {
    function collectFee(address token, address payer, uint256 amount) external returns (uint256);
    function calculateFee(address user, uint256 amount) external view returns (uint256, uint256);
}

interface IPriceOracle {
    function getPrice(address token0, address token1) external returns (uint256, bool);
}

interface ILiquidityPool {
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to
    ) external returns (uint256 amountOut);

    function getReserves(address tokenA, address tokenB)
        external
        view
        returns (uint256 reserveA, uint256 reserveB);
}

/**
 * @title SwapRouter
 * @notice Routes token swaps through registered liquidity pools, applies fees via
 *         FeeRouter, and checks prices against the oracle for slippage protection.
 * @dev    Supports single-hop and multi-hop swaps (up to 5 hops).
 *         Gated by Layer 7 Protocol-wide pause state.
 */
contract SwapRouter is Ownable, ReentrancyGuard, SecurityGated {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────

    IFeeRouter   public feeRouter;
    IPriceOracle public priceOracle;

    /// @notice Registered pools: token pair hash → pool address
    mapping(bytes32 => address) public pools;

    uint256 public maxSlippageBps = 200; // 2% default max slippage vs oracle

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────

    event Swap(
        address indexed sender,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeCharged,
        address recipient
    );
    event PoolRegistered(address tokenA, address tokenB, address pool);
    event FeeRouterUpdated(address newFeeRouter);
    event PriceOracleUpdated(address newOracle);

    bytes32 public constant LAYER_ID = keccak256("LAYER_2_EXECUTION");
    bytes32 public constant SWAP_ACTION = keccak256("SWAP_ACTION");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    constructor(
        address _admin,
        address _governor,
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

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    // ─────────────────────────────────────────────
    // Swap: Single Hop
    // ─────────────────────────────────────────────

    /**
     * @notice Swap exact input tokens for as many output tokens as possible.
     * @dev Gated by 5 Universal Locks:
     *      1. Access: withAccessLock(EXECUTOR_ROLE)
     *      2. Time: withTimeLock(SWAP_ACTION)
     *      3. State: withStateGuard(LAYER_ID)
     *      4. Rate: withRateLimit(SWAP_ACTION, amountIn)
     *      5. Verification: withSignature(hash, signature)
     *      6. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function swapExactIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        uint256 deadline,
        bytes32 hash,
        bytes calldata signature
    ) 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withAccessLock(EXECUTOR_ROLE)
        withTimeLock(SWAP_ACTION)
        withStateGuard(LAYER_ID)
        withRateLimit(SWAP_ACTION, amountIn)
        withSignature(hash, signature)
        returns (uint256 amountOut) 
    {
        require(block.timestamp <= deadline, "SwapRouter: deadline passed");
        require(amountIn > 0,               "SwapRouter: zero amountIn");
        require(recipient != address(0),    "SwapRouter: zero recipient");

        address pool = _getPool(tokenIn, tokenOut);

        // 1. Pull tokenIn from caller
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // 2. Collect fee (deducted from amountIn before forwarding to pool)
        IERC20(tokenIn).approve(address(feeRouter), amountIn);
        uint256 feeCharged = feeRouter.collectFee(tokenIn, msg.sender, amountIn);
        uint256 netAmountIn = amountIn - feeCharged;

        // 3. Approve pool and execute swap
        IERC20(tokenIn).approve(pool, netAmountIn);
        amountOut = ILiquidityPool(pool).swap(
            tokenIn, tokenOut, netAmountIn, amountOutMin, recipient
        );

        require(amountOut >= amountOutMin, "SwapRouter: insufficient output");

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, feeCharged, recipient);
    }

    /**
     * @notice Multi-hop swap.
     * @dev Gated by 5 Universal Locks:
     *      1. Access: withAccessLock(EXECUTOR_ROLE)
     *      2. Time: withTimeLock(SWAP_ACTION)
     *      3. State: withStateGuard(LAYER_ID)
     *      4. Rate: withRateLimit(SWAP_ACTION, amountIn)
     *      5. Verification: withSignature(hash, signature)
     *      6. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function swapExactInMultiHop(
        address[] calldata tokenPath,
        uint256            amountIn,
        uint256            amountOutMin,
        address            recipient,
        uint256            deadline,
        bytes32            hash,
        bytes calldata     signature
    ) 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withAccessLock(EXECUTOR_ROLE)
        withTimeLock(SWAP_ACTION)
        withStateGuard(LAYER_ID)
        withRateLimit(SWAP_ACTION, amountIn)
        withSignature(hash, signature)
        returns (uint256 amountOut) 
    {
        require(block.timestamp <= deadline,  "SwapRouter: deadline passed");
        require(tokenPath.length >= 2,        "SwapRouter: path too short");
        require(tokenPath.length <= 6,        "SwapRouter: path too long");
        require(amountIn > 0,                 "SwapRouter: zero amountIn");

        IERC20(tokenPath[0]).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 currentAmount = amountIn;

        for (uint256 i = 0; i < tokenPath.length - 1; i++) {
            address tIn  = tokenPath[i];
            address tOut = tokenPath[i + 1];
            address pool = _getPool(tIn, tOut);
            bool    isLast = (i == tokenPath.length - 2);
            address hopRecipient = isLast ? recipient : address(this);

            // Fee on first hop only
            if (i == 0) {
                IERC20(tIn).approve(address(feeRouter), currentAmount);
                uint256 fee = feeRouter.collectFee(tIn, msg.sender, currentAmount);
                currentAmount -= fee;
            }

            uint256 hopMinOut = 0;
            if (address(priceOracle) != address(0)) {
                (uint256 price, bool ok) = priceOracle.getPrice(tIn, tOut);
                if (ok && price > 0) {
                    // Calculate expected output: (currentAmount * price) / 1e18
                    uint256 expected = (currentAmount * price) / 1e18;
                    // Apply maxSlippageBps (e.g. 2% = 200/10000)
                    hopMinOut = (expected * (10_000 - maxSlippageBps)) / 10_000;
                }
            }

            // Intermediate slippage protection: ensure hop output is not significantly manipulated
            // For the last hop, we also must satisfy the user-provided amountOutMin.
            uint256 finalMinOut = isLast && (amountOutMin > hopMinOut) ? amountOutMin : hopMinOut;

            // Ensure we have some minimum protection even if oracle fails or is not present
            // This prevents zero-minimum swaps on intermediate hops.
            if (finalMinOut == 0 && !isLast) {
                // Heuristic: check if we should allow 0 min out on intermediate hops. 
                // Security-wise, it's better to revert if oracle is missing and it's not the last hop.
                revert("SwapRouter: intermediate slippage protection failed");
            }

            IERC20(tIn).approve(pool, currentAmount);
            currentAmount = ILiquidityPool(pool).swap(
                tIn, tOut, currentAmount, finalMinOut, hopRecipient
            );
        }

        amountOut = currentAmount;
        require(amountOut >= amountOutMin, "SwapRouter: insufficient output");
    }

    // ─────────────────────────────────────────────
    // Quote (View)
    // ─────────────────────────────────────────────

    function quoteExactIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 estimatedOut, uint256 estimatedFee) {
        (estimatedFee, ) = feeRouter.calculateFee(address(0), amountIn);
        uint256 netIn = amountIn - estimatedFee;

        address pool = pools[_pairKey(tokenIn, tokenOut)];
        require(pool != address(0), "SwapRouter: pool not found");

        (uint256 rIn, uint256 rOut) = ILiquidityPool(pool).getReserves(tokenIn, tokenOut);
        estimatedOut = _getAmountOut(netIn, rIn, rOut);
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function registerPool(
        address tokenA,
        address tokenB,
        address pool
    ) external onlyOwner {
        require(pool != address(0), "SwapRouter: zero pool");
        pools[_pairKey(tokenA, tokenB)] = pool;
        emit PoolRegistered(tokenA, tokenB, pool);
    }

    function setFeeRouter(address _feeRouter) external onlyOwner {
        feeRouter = IFeeRouter(_feeRouter);
        emit FeeRouterUpdated(_feeRouter);
    }

    function setPriceOracle(address _oracle) external onlyOwner {
        priceOracle = IPriceOracle(_oracle);
        emit PriceOracleUpdated(_oracle);
    }

    function setMaxSlippage(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "SwapRouter: slippage too high"); // max 10%
        maxSlippageBps = _bps;
    }

    // ─────────────────────────────────────────────
    // Internal Helpers
    // ─────────────────────────────────────────────

    function _getPool(address tokenA, address tokenB) internal view returns (address pool) {
        pool = pools[_pairKey(tokenA, tokenB)];
        require(pool != address(0), "SwapRouter: no pool for pair");
    }

    function _pairKey(address a, address b) internal pure returns (bytes32) {
        return a < b
            ? keccak256(abi.encodePacked(a, b))
            : keccak256(abi.encodePacked(b, a));
    }

    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256) {
        require(reserveIn > 0 && reserveOut > 0, "SwapRouter: zero reserves");
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator       = amountInWithFee * reserveOut;
        uint256 denominator     = reserveIn * 1000 + amountInWithFee;
        return numerator / denominator;
    }
}
