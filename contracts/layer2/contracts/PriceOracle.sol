// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
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

/**
 * @title PriceOracle
 * @notice Hybrid price oracle combining Chainlink price feeds with on-chain TWAP.
 *         Falls back gracefully: uses Chainlink primary, TWAP secondary.
 * @dev    TWAP is computed over a configurable window from an AMM observation ring buffer.
 */
contract PriceOracle is Ownable {

    // ─────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────

    struct OracleConfig {
        address chainlinkFeed;   // Chainlink AggregatorV3 address (zero = disabled)
        uint8   feedDecimals;    // Chainlink feed decimals (cached to save gas)
        bool    invertFeed;      // True when feed is quote/base and we need base/quote
        uint32  stalenessThreshold; // seconds before a Chainlink price is considered stale
    }

    struct Observation {
        uint32  timestamp;
        uint224 priceCumulative; // price * seconds accumulator (Q112 fixed point)
    }

    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────

    uint256 public constant TWAP_WINDOW        = 30 minutes;
    uint256 public constant OBSERVATIONS_COUNT  = 30;
    uint256 public constant Q112               = 2**112;

    /// @notice Oracle configs per pair id (keccak256(token0, token1))
    mapping(bytes32 => OracleConfig) public oracleConfigs;

    /// @notice Ring-buffer of price observations per pair id
    mapping(bytes32 => Observation[OBSERVATIONS_COUNT]) private _observations;
    mapping(bytes32 => uint256)                          private _obsIndex;
    mapping(bytes32 => uint256)                          private _obsCount;

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────

    event OracleConfigSet(bytes32 indexed pairId, address chainlinkFeed, uint32 staleness);
    event ObservationRecorded(bytes32 indexed pairId, uint256 price, uint32 timestamp);
    event PriceQueried(bytes32 indexed pairId, uint256 price, bool usedChainlink);

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    constructor(address _owner) Ownable(_owner) {}

    // ─────────────────────────────────────────────
    // Price Access
    // ─────────────────────────────────────────────

    /**
     * @notice Get the best available price for a token pair.
     * @dev    Chainlink is preferred; falls back to TWAP if stale or missing.
     * @param  token0 Base token address
     * @param  token1 Quote token address
     * @return price  Price of token0 in terms of token1 (18 decimal precision)
     * @return isChainlink Whether Chainlink was the source
     */
    function getPrice(address token0, address token1)
        external
        returns (uint256 price, bool isChainlink)
    {
        bytes32 pairId = _pairId(token0, token1);
        OracleConfig memory cfg = oracleConfigs[pairId];

        // Try Chainlink first
        if (cfg.chainlinkFeed != address(0)) {
            (bool ok, uint256 clPrice) = _getChainlinkPrice(cfg);
            if (ok) {
                emit PriceQueried(pairId, clPrice, true);
                return (clPrice, true);
            }
        }

        // Fall back to TWAP
        price = _getTwapPrice(pairId);
        require(price > 0, "PriceOracle: no valid price");
        emit PriceQueried(pairId, price, false);
        return (price, false);
    }

    /**
     * @notice Get TWAP price only (does not use Chainlink)
     */
    function getTwapPrice(address token0, address token1)
        external
        view
        returns (uint256 price)
    {
        return _getTwapPrice(_pairId(token0, token1));
    }

    /**
     * @notice Get latest Chainlink price only
     */
    function getChainlinkPrice(address token0, address token1)
        external
        view
        returns (uint256 price, bool isValid)
    {
        bytes32 pairId = _pairId(token0, token1);
        OracleConfig memory cfg = oracleConfigs[pairId];
        if (cfg.chainlinkFeed == address(0)) return (0, false);
        (bool v, uint256 p) = _getChainlinkPrice(cfg);
        return (p, v);
    }

    // ─────────────────────────────────────────────
    // TWAP Recording
    // ─────────────────────────────────────────────

    /**
     * @notice Record a new price observation for TWAP computation.
     * @dev    Call this on every swap. Price must be provided by the AMM.
     * @param  token0 Base token
     * @param  token1 Quote token
     * @param  spotPrice Current spot price (18 decimals, token1 per token0)
     */
    function recordObservation(
        address token0,
        address token1,
        uint256 spotPrice
    ) external {
        require(spotPrice > 0, "PriceOracle: zero price");
        bytes32 pairId = _pairId(token0, token1);

        uint256 idx   = _obsIndex[pairId];
        uint256 count = _obsCount[pairId];
        uint32  ts    = uint32(block.timestamp);

        uint224 lastCumulative = 0;
        if (count > 0) {
            uint256 prev = (idx == 0 ? OBSERVATIONS_COUNT : idx) - 1;
            Observation memory last = _observations[pairId][prev];
            uint256 elapsed = ts - last.timestamp;
            lastCumulative = last.priceCumulative + uint224((spotPrice * elapsed) / 1e9);
        }

        _observations[pairId][idx] = Observation({
            timestamp:       ts,
            priceCumulative: lastCumulative
        });

        _obsIndex[pairId] = (idx + 1) % OBSERVATIONS_COUNT;
        if (count < OBSERVATIONS_COUNT) _obsCount[pairId] = count + 1;

        emit ObservationRecorded(pairId, spotPrice, ts);
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function setOracleConfig(
        address token0,
        address token1,
        address chainlinkFeed,
        bool    invertFeed,
        uint32  stalenessThreshold
    ) external onlyOwner {
        bytes32 pairId = _pairId(token0, token1);
        uint8 decimals = 0;
        if (chainlinkFeed != address(0)) {
            decimals = AggregatorV3Interface(chainlinkFeed).decimals();
        }
        oracleConfigs[pairId] = OracleConfig({
            chainlinkFeed:       chainlinkFeed,
            feedDecimals:        decimals,
            invertFeed:          invertFeed,
            stalenessThreshold:  stalenessThreshold == 0 ? 3600 : stalenessThreshold
        });
        emit OracleConfigSet(pairId, chainlinkFeed, stalenessThreshold);
    }

    // ─────────────────────────────────────────────
    // Internal Helpers
    // ─────────────────────────────────────────────

    function _getChainlinkPrice(OracleConfig memory cfg)
        internal
        view
        returns (bool isValid, uint256 price)
    {
        try AggregatorV3Interface(cfg.chainlinkFeed).latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80
        ) {
            if (answer <= 0) return (false, 0);
            if (block.timestamp - updatedAt > cfg.stalenessThreshold) return (false, 0);

            // Normalize to 18 decimals
            uint256 raw = uint256(answer);
            uint256 normalized;
            if (cfg.feedDecimals <= 18) {
                normalized = raw * (10 ** (18 - cfg.feedDecimals));
            } else {
                normalized = raw / (10 ** (cfg.feedDecimals - 18));
            }

            price = cfg.invertFeed ? (1e36 / normalized) : normalized;
            return (true, price);
        } catch {
            return (false, 0);
        }
    }

    function _getTwapPrice(bytes32 pairId) internal view returns (uint256) {
        uint256 count = _obsCount[pairId];
        if (count < 2) return 0;

        uint256 currentIdx = _obsIndex[pairId];
        uint256 newest     = (currentIdx == 0 ? OBSERVATIONS_COUNT : currentIdx) - 1;

        Observation memory newestObs = _observations[pairId][newest];
        uint32 windowStart = uint32(block.timestamp) - uint32(TWAP_WINDOW);

        // Walk back through ring buffer to find oldest observation within window
        uint256 oldestIdx = newest;
        for (uint256 i = 1; i < count; i++) {
            uint256 idx = (newest + OBSERVATIONS_COUNT - i) % OBSERVATIONS_COUNT;
            if (_observations[pairId][idx].timestamp <= windowStart) {
                oldestIdx = idx;
                break;
            }
            oldestIdx = idx;
        }

        Observation memory oldestObs = _observations[pairId][oldestIdx];
        uint256 elapsed = newestObs.timestamp - oldestObs.timestamp;
        if (elapsed == 0) return 0;

        uint256 cumulativeDelta = newestObs.priceCumulative - oldestObs.priceCumulative;
        // Undo the /1e9 applied during recording
        return (cumulativeDelta * 1e9) / elapsed;
    }

    function _pairId(address token0, address token1) internal pure returns (bytes32) {
        return token0 < token1
            ? keccak256(abi.encodePacked(token0, token1))
            : keccak256(abi.encodePacked(token1, token0));
    }
}
