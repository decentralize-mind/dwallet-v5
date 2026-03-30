// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2 DEX — Shared Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface IFeeRouter {
    function collectFee(address token, address payer, uint256 amount) external returns (uint256 feeCharged);
    function calculateFee(address user, uint256 amount) external view returns (uint256 feeAmount, uint256 discountBps);
    function distributeFees(address token) external;
    function baseFeeBps() external view returns (uint256);
}

interface IPriceOracle {
    function getPrice(address token0, address token1) external returns (uint256 price, bool isChainlink);
    function getTwapPrice(address token0, address token1) external view returns (uint256 price);
    function recordObservation(address token0, address token1, uint256 spotPrice) external;
}

interface ILiquidityIncentive {
    function deposit(uint256 pid, uint256 amount) external;
    function withdraw(uint256 pid, uint256 amount) external;
    function harvest(uint256 pid) external;
    function pendingReward(uint256 pid, address user) external view returns (uint256);
}

interface ILimitOrderBook {
    struct LimitOrder {
        address maker;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        uint256 nonce;
        uint256 expiry;
        address recipient;
    }

    function fillOrder(LimitOrder calldata order, bytes calldata signature, uint256 amountInToFill) external;
    function cancelOrder(LimitOrder calldata order) external;
    function cancelNonce(uint256 nonce) external;
    function getOrderHash(LimitOrder calldata order) external view returns (bytes32);
    function getRemainingAmountIn(LimitOrder calldata order) external view returns (uint256);
}

interface ISwapRouter {
    function swapExactIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut);

    function swapExactInMultiHop(
        address[] calldata tokenPath,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut);
}

// Chainlink AggregatorV3 (matches Chainlink's interface)
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}
