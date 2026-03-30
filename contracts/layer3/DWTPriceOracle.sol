// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../SecurityGated.sol";

/**
 * @title DWTPriceOracle
 * @notice Dual-source price oracle with pause gating via Layer 7.
 */
interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function observe(uint32[] calldata secondsAgos)
        external view
        returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

library TickMath {
    int24 internal constant MIN_TICK = -887272;
    int24 internal constant MAX_TICK =  887272;

    function getSqrtRatioAtTick(int24 tick) internal pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        require(absTick <= uint256(int256(MAX_TICK)), "TickMath: tick out of range");

        uint256 ratio = absTick & 0x1 != 0
            ? 0xfffcb933bd6fad37aa2d162d1a594001
            : 0x100000000000000000000000000000000;
        if (absTick & 0x2  != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213a) >> 128;
        if (absTick & 0x4  != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdcc) >> 128;
        if (absTick & 0x8  != 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0) >> 128;
        if (absTick & 0x10 != 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644) >> 128;
        if (absTick & 0x20 != 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0) >> 128;
        if (absTick & 0x40 != 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861) >> 128;
        if (absTick & 0x80 != 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053) >> 128;
        if (absTick & 0x100 != 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4) >> 128;
        if (absTick & 0x200 != 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54) >> 128;
        if (absTick & 0x400 != 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3) >> 128;
        if (absTick & 0x800 != 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9) >> 128;
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

contract DWTPriceOracle is Ownable, SecurityGated {
    AggregatorV3Interface public chainlinkFeed;
    IUniswapV3Pool        public uniswapPool;
    address               public dwtToken;

    uint256 public stalenessAge;
    uint32  public twapWindow;
    uint256 public fallbackPrice;

    uint256 public tier1UsdThreshold;
    uint256 public tier2UsdThreshold;
    uint256 public tier3UsdThreshold;

    uint32  public constant MIN_TWAP_WINDOW = 300;

    event ChainlinkFeedUpdated(address newFeed);
    event UniswapPoolUpdated(address newPool);
    event TwapWindowUpdated(uint32 newWindow);
    event StalenessAgeUpdated(uint256 newAge);
    event FallbackPriceUpdated(uint256 newPrice);
    event TierThresholdsUpdated(uint256 t1, uint256 t2, uint256 t3);

    constructor(
        address _chainlinkFeed,
        address _uniswapPool,
        address _dwtToken,
        uint256 _stalenessAge,
        uint32  _twapWindow,
        uint256 _fallbackPrice,
        uint256 _t1,
        uint256 _t2,
        uint256 _t3,
        address _securityController,
        address initialOwner
    ) Ownable(initialOwner) SecurityGated(_securityController) {
        require(_chainlinkFeed != address(0), "Oracle: zero chainlink");
        require(_uniswapPool   != address(0), "Oracle: zero pool");
        require(_dwtToken      != address(0), "Oracle: zero dwt");
        require(_twapWindow    >= MIN_TWAP_WINDOW, "Oracle: twap window too short");
        require(_t1 < _t2 && _t2 < _t3,       "Oracle: thresholds not ascending");

        chainlinkFeed        = AggregatorV3Interface(_chainlinkFeed);
        uniswapPool          = IUniswapV3Pool(_uniswapPool);
        dwtToken             = _dwtToken;
        stalenessAge         = _stalenessAge;
        twapWindow           = _twapWindow;
        fallbackPrice        = _fallbackPrice;
        tier1UsdThreshold    = _t1;
        tier2UsdThreshold    = _t2;
        tier3UsdThreshold    = _t3;
    }

    function getChainlinkPrice() public view returns (uint256 price) {
        (, int256 ethUsdRaw, , uint256 updatedAt, ) = chainlinkFeed.latestRoundData();
        require(block.timestamp - updatedAt <= stalenessAge, "Oracle: Chainlink price stale");
        require(ethUsdRaw > 0, "Oracle: Chainlink non-positive price");
        price = uint256(ethUsdRaw);
    }

    function getTwapPrice() public view returns (uint256 price) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = twapWindow;
        secondsAgos[1] = 0;

        (int56[] memory tickCumulatives, ) = uniswapPool.observe(secondsAgos);
        int56 tickCumulativeDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 avgTick = int24(tickCumulativeDelta / int56(uint56(twapWindow)));

        uint160 sqrtPriceX96 = TickMath.getSqrtRatioAtTick(avgTick);
        uint256 priceX192 = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        price = priceX192 / (1 << 192) * 1e18;
    }

    function getPrice() external view returns (uint256 ethUsdPrice) {
        try this.getChainlinkPrice() returns (uint256 p) { return p; } catch {}
        try this.getTwapPrice() returns (uint256 p) { return p; } catch {}
        require(fallbackPrice > 0, "Oracle: no valid price source");
        return fallbackPrice;
    }

    function getTierForUsdValue(uint256 usdValue) external view returns (uint8) {
        if (usdValue >= tier3UsdThreshold) return 3;
        if (usdValue >= tier2UsdThreshold) return 2;
        if (usdValue >= tier1UsdThreshold) return 1;
        return 0;
    }

    bytes32 public constant ROLE_ORACLE_ADMIN = keccak256("ROLE_ORACLE_ADMIN");
    bytes32 public constant ACTION_SET_FEED = keccak256("ACTION_SET_FEED");
    bytes32 public constant ACTION_SET_POOL = keccak256("ACTION_SET_POOL");
    bytes32 public constant ACTION_SET_WINDOW = keccak256("ACTION_SET_WINDOW");
    bytes32 public constant ACTION_SET_STALENESS = keccak256("ACTION_SET_STALENESS");
    bytes32 public constant ACTION_SET_FALLBACK = keccak256("ACTION_SET_FALLBACK");
    bytes32 public constant ACTION_SET_TIERS = keccak256("ACTION_SET_TIERS");
    bytes32 public constant LAYER_ID = keccak256("LAYER_3_ORACLE");

    function setChainlinkFeed(address feed) 
        external 
        ultraSecure(ROLE_ORACLE_ADMIN, ACTION_SET_FEED, LAYER_ID, 0) 
    {
        require(feed != address(0), "Oracle: zero feed");
        chainlinkFeed = AggregatorV3Interface(feed);
        emit ChainlinkFeedUpdated(feed);
    }

    function setUniswapPool(address pool) 
        external 
        ultraSecure(ROLE_ORACLE_ADMIN, ACTION_SET_POOL, LAYER_ID, 0)
    {
        require(pool != address(0), "Oracle: zero pool");
        uniswapPool = IUniswapV3Pool(pool);
        emit UniswapPoolUpdated(pool);
    }

    function setTwapWindow(uint32 newWindow) 
        external 
        ultraSecure(ROLE_ORACLE_ADMIN, ACTION_SET_WINDOW, LAYER_ID, 0)
    {
        require(newWindow >= MIN_TWAP_WINDOW, "Oracle: twap window too short");
        twapWindow = newWindow;
        emit TwapWindowUpdated(newWindow);
    }

    function setStalenessAge(uint256 age) 
        external 
        ultraSecure(ROLE_ORACLE_ADMIN, ACTION_SET_STALENESS, LAYER_ID, 0)
    {
        require(age >= 60, "Oracle: staleness age too short");
        stalenessAge = age;
        emit StalenessAgeUpdated(age);
    }

    function setFallbackPrice(uint256 price) 
        external 
        ultraSecure(ROLE_ORACLE_ADMIN, ACTION_SET_FALLBACK, LAYER_ID, 0)
    {
        require(price > 0, "Oracle: zero fallback price");
        fallbackPrice = price;
        emit FallbackPriceUpdated(price);
    }

    function setTierThresholds(uint256 t1, uint256 t2, uint256 t3) 
        external 
        ultraSecure(ROLE_ORACLE_ADMIN, ACTION_SET_TIERS, LAYER_ID, 0)
    {
        require(t1 < t2 && t2 < t3, "Oracle: thresholds not ascending");
        tier1UsdThreshold = t1;
        tier2UsdThreshold = t2;
        tier3UsdThreshold = t3;
        emit TierThresholdsUpdated(t1, t2, t3);
    }
}

