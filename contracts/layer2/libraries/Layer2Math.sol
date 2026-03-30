// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Layer2Math
 * @notice Safe math utilities and AMM formulas used across Layer 2 contracts.
 */
library Layer2Math {
    uint256 internal constant BASIS_POINTS = 10_000;

    /// @notice Constant-product AMM: dy for given dx
    /// @dev    0.3% swap fee baked in (997/1000)
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0,   "Layer2Math: zero amountIn");
        require(reserveIn > 0 && reserveOut > 0, "Layer2Math: zero reserves");
        uint256 inWithFee  = amountIn * 997;
        uint256 numerator  = inWithFee * reserveOut;
        uint256 denominator= reserveIn * 1000 + inWithFee;
        amountOut = numerator / denominator;
    }

    /// @notice Constant-product AMM: dx for given dy
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountIn) {
        require(amountOut < reserveOut, "Layer2Math: insufficient liquidity");
        require(reserveIn > 0 && reserveOut > 0, "Layer2Math: zero reserves");
        uint256 numerator  = reserveIn * amountOut * 1000;
        uint256 denominator= (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }

    /// @notice Apply basis-point discount to a value
    function applyDiscount(uint256 value, uint256 discountBps)
        internal
        pure
        returns (uint256)
    {
        require(discountBps <= BASIS_POINTS, "Layer2Math: discount > 100%");
        return value * (BASIS_POINTS - discountBps) / BASIS_POINTS;
    }

    /// @notice Scale a proportion: (value * numerator) / denominator
    function proportion(
        uint256 value,
        uint256 numerator,
        uint256 denominator
    ) internal pure returns (uint256) {
        require(denominator > 0, "Layer2Math: zero denominator");
        return value * numerator / denominator;
    }

    /// @notice Clamp a value within [min, max]
    function clamp(uint256 value, uint256 minVal, uint256 maxVal)
        internal
        pure
        returns (uint256)
    {
        if (value < minVal) return minVal;
        if (value > maxVal) return maxVal;
        return value;
    }

    /// @notice Compute sqrt via Babylonian method (for LP share calculations)
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /// @notice Compute geometric mean of two values (used for initial LP mint)
    function geometricMean(uint256 a, uint256 b) internal pure returns (uint256) {
        return sqrt(a * b);
    }
}
