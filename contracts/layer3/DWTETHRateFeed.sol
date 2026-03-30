// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DWTETHRateFeed
 * @notice On-chain DWT/ETH rate feed (Layer 3 version — also used by Paymaster).
 *
 * Protections implemented:
 *   - Per-update deviation cap (maxDeviationBps, default 500 = 5%) — keeper manipulation guard
 *   - Staleness flag: getRate() returns isStale=true if not updated within maxStaleness (1h)
 *   - Three-tier update system:
 *       KEEPER_ROLE  — normal updates (deviation-capped)
 *       ADMIN_ROLE   — emergency override (no cap)
 *       on-chain TWAP — trustless refresh via updateFromTwap()
 *   - Deviation ceiling hard-capped at 3000 bps (30%)
 *   - Minimum staleness age >= 300 seconds
 *   - C-02b fix: TWAP uses audited TickMath (same fix as DWTPriceOracle)
 */

interface IUniswapV3Pool {
    function observe(uint32[] calldata secondsAgos)
        external view
        returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiqCumX128s);
}

contract DWTETHRateFeed is AccessControl {
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");

    uint256 public currentRate;
    uint256 public lastUpdated;
    uint256 public maxDeviationBps;
    uint256 public maxStaleness;

    IUniswapV3Pool public twapPool;
    uint32  public  twapWindow;

    uint256 public constant BPS                    = 10_000;
    uint256 public constant MAX_DEVIATION_CEILING  = 3_000;  // 30%
    uint32  public constant MIN_TWAP_WINDOW        = 300;

    event RateUpdated(uint256 oldRate, uint256 newRate, address updater, bool emergency);
    event TwapRateUpdated(uint256 oldRate, uint256 newRate);
    event ConfigUpdated(string param, uint256 value);

    constructor(
        address admin,
        address keeper,
        address _twapPool,
        uint256 initialRate,
        uint256 _maxDeviationBps,
        uint256 _maxStaleness,
        uint32  _twapWindow
    ) {
        require(admin       != address(0),                 "RateFeed: zero admin");
        require(initialRate  > 0,                          "RateFeed: zero initial rate");
        require(_maxDeviationBps <= MAX_DEVIATION_CEILING, "RateFeed: deviation too high");
        require(_maxStaleness    >= 300,                   "RateFeed: staleness too short");
        require(_twapWindow      >= MIN_TWAP_WINDOW,       "RateFeed: twap window too short");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(KEEPER_ROLE,        keeper);

        twapPool        = IUniswapV3Pool(_twapPool);
        currentRate     = initialRate;
        lastUpdated     = block.timestamp;
        maxDeviationBps = _maxDeviationBps;
        maxStaleness    = _maxStaleness;
        twapWindow      = _twapWindow;
    }

    // ─── Rate Queries ─────────────────────────────────────────────────────────
    function getRate() external view returns (uint256 rate, bool isStale) {
        rate    = currentRate;
        isStale = (block.timestamp - lastUpdated) > maxStaleness;
    }

    // ─── Keeper Update (deviation-capped) ────────────────────────────────────
    function updateRate(uint256 newRate) external onlyRole(KEEPER_ROLE) {
        require(newRate > 0, "RateFeed: zero rate");
        _checkDeviation(newRate);
        uint256 old = currentRate;
        currentRate = newRate;
        lastUpdated = block.timestamp;
        emit RateUpdated(old, newRate, msg.sender, false);
    }

    // ─── Trustless TWAP Refresh ───────────────────────────────────────────────
    /**
     * @notice Update rate from Uniswap V3 TWAP — anyone can call, trustless.
     * @dev C-02b fix: uses audited TickMath, not a custom approximation.
     */
    function updateFromTwap() external {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = twapWindow;
        secondsAgos[1] = 0;

        (int56[] memory tickCumulatives, ) = twapPool.observe(secondsAgos);
        int56  delta   = tickCumulatives[1] - tickCumulatives[0];
        int24  avgTick = int24(delta / int56(uint56(twapWindow)));

        // C-02b: Use bit-exact TickMath (no custom approximation that breaks at large ticks)
        uint160 sqrtPriceX96 = _getSqrtRatioAtTick(avgTick);
        uint256 priceX192    = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        uint256 newRate      = priceX192 / (1 << 192) * 1e18;

        require(newRate > 0, "RateFeed: zero twap rate");

        uint256 old = currentRate;
        currentRate = newRate;
        lastUpdated = block.timestamp;
        emit TwapRateUpdated(old, newRate);
    }

    // ─── Emergency Override ───────────────────────────────────────────────────
    function emergencySetRate(uint256 newRate) external onlyRole(ADMIN_ROLE) {
        require(newRate > 0, "RateFeed: zero rate");
        uint256 old = currentRate;
        currentRate = newRate;
        lastUpdated = block.timestamp;
        emit RateUpdated(old, newRate, msg.sender, true);
    }

    // ─── Admin Config ─────────────────────────────────────────────────────────
    function setMaxDeviation(uint256 bps) external onlyRole(ADMIN_ROLE) {
        require(bps <= MAX_DEVIATION_CEILING, "RateFeed: ceiling exceeded");
        maxDeviationBps = bps;
        emit ConfigUpdated("maxDeviationBps", bps);
    }

    function setMaxStaleness(uint256 seconds_) external onlyRole(ADMIN_ROLE) {
        require(seconds_ >= 300, "RateFeed: staleness too short");
        maxStaleness = seconds_;
        emit ConfigUpdated("maxStaleness", seconds_);
    }

    function setTwapWindow(uint32 window) external onlyRole(ADMIN_ROLE) {
        require(window >= MIN_TWAP_WINDOW, "RateFeed: window too short");
        twapWindow = window;
        emit ConfigUpdated("twapWindow", window);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────
    function _checkDeviation(uint256 newRate) internal view {
        uint256 prev = currentRate;
        if (prev == 0) return;
        uint256 deviation = newRate > prev
            ? ((newRate - prev) * BPS) / prev
            : ((prev - newRate) * BPS) / prev;
        require(deviation <= maxDeviationBps, "RateFeed: deviation too large");
    }

    /// @dev Audited Uniswap TickMath (C-02b fix — no custom approximation)
    function _getSqrtRatioAtTick(int24 tick) internal pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        require(absTick <= 887272, "TickMath: out of range");
        uint256 ratio = absTick & 0x1 != 0
            ? 0xfffcb933bd6fad37aa2d162d1a594001
            : 0x100000000000000000000000000000000;
        if (absTick & 0x2 != 0)    ratio = (ratio * 0xfff97272373d413259a46990580e213a) >> 128;
        if (absTick & 0x4 != 0)    ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdcc) >> 128;
        if (absTick & 0x8 != 0)    ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0) >> 128;
        if (absTick & 0x10 != 0)   ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644) >> 128;
        if (absTick & 0x20 != 0)   ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0) >> 128;
        if (absTick & 0x40 != 0)   ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861) >> 128;
        if (absTick & 0x80 != 0)   ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053) >> 128;
        if (absTick & 0x100 != 0)  ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4) >> 128;
        if (absTick & 0x200 != 0)  ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54) >> 128;
        if (absTick & 0x400 != 0)  ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3) >> 128;
        if (absTick & 0x800 != 0)  ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9) >> 128;
        if (absTick & 0x1000 != 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825) >> 128;
        if (absTick & 0x2000 != 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5) >> 128;
        if (absTick & 0x4000 != 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7) >> 128;
        if (absTick & 0x8000 != 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6) >> 128;
        if (absTick & 0x10000 != 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9) >> 128;
        if (absTick & 0x20000 != 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604) >> 128;
        if (absTick & 0x40000 != 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98) >> 128;
        if (absTick & 0x80000 != 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2) >> 128;
        if (tick > 0) ratio = type(uint256).max / ratio;
        sqrtPriceX96 = uint160((ratio >> 32) + (ratio % (1 << 32) == 0 ? 0 : 1));
    }
}
