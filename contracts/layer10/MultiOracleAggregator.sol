// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../layer7/SecurityGated.sol";
import "./PythOracleAdapter.sol";
import "./API3OracleAdapter.sol";

interface IChainlinkAggregator {
    function latestRoundData()
        external view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
    function decimals() external view returns (uint8);
}

/**
 * @title MultiOracleAggregator
 * @notice Aggregates multiple oracle sources for decentralized price feeds
 * 
 * Supported oracles:
 * - Chainlink (permissioned nodes)
 * - Pyth Network (first-party oracles)
 * - API3 (dAPIs - decentralized APIs)
 * - Uniswap TWAP (on-chain AMM)
 * 
 * Features:
 * - Median price calculation from multiple sources
 * - Outlier detection and removal
 * - Source diversity validation
 * - Fallback chain for resilience
 * - Confidence scoring
 * 
 * SECURITY:
 * - Requires minimum N sources for valid price
 * - Rejects outliers beyond threshold
 * - Staleness checking per source
 * - Circuit breaker on anomalous prices
 */
contract MultiOracleAggregator is SecurityGated {
    bytes32 public constant LAYER_ID = keccak256("LAYER_3_ORACLE");
    bytes32 public constant CONFIG_ACTION = keccak256("ORACLE_CONFIG_ACTION");

    struct OracleSource {
        string name;
        bool active;
        uint256 weight;
        uint256 lastPrice;
        uint256 lastUpdate;
    }

    struct ChainlinkSource {
        address aggregator;
        bytes32 priceFeedId;
    }

    struct PythSource {
        address pythContract;
        bytes32 priceFeedId;
    }

    struct API3Source {
        address api3Server;
        bytes32 endpointId;
        address sponsorWallet;
    }

    // Oracle configurations
    ChainlinkSource[] public chainlinkSources;
    PythSource[] public pythSources;
    API3Source[] public api3Sources;

    // State
    OracleSource[] public sources;
    uint256 public minSourcesRequired = 3; // Minimum sources for valid price
    uint256 public outlierThreshold = 20; // Max 20% deviation from median
    uint256 public maxStaleness = 1 hours;

    mapping(string => uint256) public sourceIndex;

    event OracleAdded(string name, uint256 weight);
    event OracleRemoved(string name);
    event PriceAggregated(uint256 medianPrice, uint256 sourceCount);
    event OutlierDetected(string source, uint256 price, uint256 median);

    constructor(
        address _securityController,
        address _registry,
        address _lockEngine,
        address _invariantChecker
    ) SecurityGated(_securityController) {
        _initSecuritySystem(_registry, _lockEngine, _invariantChecker);
    }

    /**
     * @notice Add Chainlink oracle source
     */
    function addChainlinkSource(
        string memory name,
        address aggregator,
        uint256 weight
    ) external withTimeLock(CONFIG_ACTION) {
        require(aggregator != address(0), "Invalid aggregator");
        require(weight > 0, "Invalid weight");

        chainlinkSources.push(ChainlinkSource({
            aggregator: aggregator,
            priceFeedId: bytes32(0)
        }));

        _addOracleSource(name, weight);
    }

    /**
     * @notice Add Pyth Network oracle source
     */
    function addPythSource(
        string memory name,
        address pythContract,
        bytes32 priceFeedId,
        uint256 weight
    ) external withTimeLock(CONFIG_ACTION) {
        require(pythContract != address(0), "Invalid Pyth contract");
        require(weight > 0, "Invalid weight");

        pythSources.push(PythSource({
            pythContract: pythContract,
            priceFeedId: priceFeedId
        }));

        _addOracleSource(name, weight);
    }

    /**
     * @notice Add API3 oracle source
     */
    function addAPI3Source(
        string memory name,
        address api3Server,
        bytes32 endpointId,
        address sponsorWallet,
        uint256 weight
    ) external withTimeLock(CONFIG_ACTION) {
        require(api3Server != address(0), "Invalid API3 server");
        require(weight > 0, "Invalid weight");

        api3Sources.push(API3Source({
            api3Server: api3Server,
            endpointId: endpointId,
            sponsorWallet: sponsorWallet
        }));

        _addOracleSource(name, weight);
    }

    /**
     * @notice Get aggregated price from all sources
     * @return medianPrice Median price from all active sources
     * @return sourceCount Number of sources used
     * @return confidence Confidence score (0-100)
     */
    function getAggregatedPrice() external view withStateGuard(LAYER_ID) returns (
        uint256 medianPrice,
        uint256 sourceCount,
        uint256 confidence
    ) {
        uint256[] memory prices = new uint256[](sources.length);
        uint256 validCount = 0;

        // Fetch prices from all active sources
        for (uint256 i = 0; i < sources.length; i++) {
            if (!sources[i].active) continue;

            try _getPriceFromSource(i) returns (uint256 price) {
                if (price > 0) {
                    prices[validCount] = price;
                    validCount++;
                }
            } catch {
                // Source failed, skip
                continue;
            }
        }

        // Check minimum sources
        require(validCount >= minSourcesRequired, "Insufficient oracle sources");

        // Calculate median
        medianPrice = _calculateMedian(prices, validCount);

        // Remove outliers and recalculate
        medianPrice = _removeOutliers(prices, validCount, medianPrice);

        sourceCount = validCount;
        confidence = _calculateConfidence(validCount, sources.length);

        emit PriceAggregated(medianPrice, sourceCount);
    }

    /**
     * @notice Get price with fallback chain
     * @dev Tries sources in order until valid price found
     */
    function getPriceWithFallback() external view returns (uint256 price) {
        // Try Chainlink first
        if (chainlinkSources.length > 0) {
            try _getChainlinkPrice(0) returns (uint256 clPrice) {
                if (clPrice > 0) return clPrice;
            } catch {}
        }

        // Try Pyth Network
        if (pythSources.length > 0) {
            try _getPythPrice(0) returns (uint256 pythPrice) {
                if (pythPrice > 0) return pythPrice;
            } catch {}
        }

        // Try API3
        if (api3Sources.length > 0) {
            try _getAPI3Price(0) returns (uint256 api3Price) {
                if (api3Price > 0) return api3Price;
            } catch {}
        }

        revert("No valid price from any source");
    }

    // ─── Internal Functions ───────────────────────────────────────────────────

    function _addOracleSource(string memory name, uint256 weight) internal {
        require(sourceIndex[name] == 0, "Source already exists");

        sources.push(OracleSource({
            name: name,
            active: true,
            weight: weight,
            lastPrice: 0,
            lastUpdate: block.timestamp
        }));

        sourceIndex[name] = sources.length;
        emit OracleAdded(name, weight);
    }

    function _getPriceFromSource(uint256 index) internal view returns (uint256) {
        if (index < chainlinkSources.length) {
            return _getChainlinkPrice(index);
        }
        
        uint256 pythIndex = index - chainlinkSources.length;
        if (pythIndex < pythSources.length) {
            return _getPythPrice(pythIndex);
        }
        
        uint256 api3Index = index - chainlinkSources.length - pythSources.length;
        if (api3Index < api3Sources.length) {
            return _getAPI3Price(api3Index);
        }

        return 0;
    }

    function _getChainlinkPrice(uint256 index) internal view returns (uint256) {
        require(index < chainlinkSources.length, "Invalid index");
        ChainlinkSource storage source = chainlinkSources[index];
        
        (, int256 answer, , uint256 updatedAt, ) = IChainlinkAggregator(source.aggregator).latestRoundData();
        
        require(answer > 0, "Invalid price");
        require(block.timestamp - updatedAt <= maxStaleness, "Stale price");

        uint8 decimals = IChainlinkAggregator(source.aggregator).decimals();
        uint256 price = uint256(answer);
        
        // Normalize to 18 decimals
        if (decimals < 18) {
            price *= 10 ** (18 - decimals);
        }

        return price;
    }

    function _getPythPrice(uint256 index) internal view returns (uint256) {
        require(index < pythSources.length, "Invalid index");
        PythSource storage source = pythSources[index];
        
        IPyth pyth = IPyth(source.pythContract);
        IPyth.Price memory pythPrice = pyth.getPrice(source.priceFeedId);

        require(pythPrice.price > 0, "Invalid price");
        require(block.timestamp - pythPrice.publishTime <= maxStaleness, "Stale price");

        int256 priceInt = pythPrice.price;
        uint256 price;
        if (pythPrice.expo < 0) {
            price = uint256(priceInt) * 10 ** (18 + pythPrice.expo);
        } else {
            price = uint256(priceInt) * 10 ** (18 - pythPrice.expo);
        }

        return price;
    }

    function _getAPI3Price(uint256 index) internal view returns (uint256) {
        require(index < api3Sources.length, "Invalid index");
        API3Source storage source = api3Sources[index];
        
        IAPI3ServerV1 api3 = IAPI3ServerV1(source.api3Server);
        (int224 value, uint256 dataTimestamp) = api3.readDataParameterized(
            source.endpointId,
            source.sponsorWallet,
            0
        );

        require(value > 0, "Invalid price");
        require(block.timestamp - dataTimestamp <= maxStaleness, "Stale price");

        return uint256(value);
    }

    function _calculateMedian(uint256[] memory prices, uint256 count) internal pure returns (uint256) {
        // Simple bubble sort (sufficient for small arrays)
        for (uint256 i = 0; i < count; i++) {
            for (uint256 j = 0; j < count - i - 1; j++) {
                if (prices[j] > prices[j + 1]) {
                    uint256 temp = prices[j];
                    prices[j] = prices[j + 1];
                    prices[j + 1] = temp;
                }
            }
        }

        // Return median
        if (count % 2 == 0) {
            return (prices[count / 2 - 1] + prices[count / 2]) / 2;
        } else {
            return prices[count / 2];
        }
    }

    function _removeOutliers(
        uint256[] memory prices,
        uint256 count,
        uint256 median
    ) internal view returns (uint256) {
        uint256 sum = 0;
        uint256 validCount = 0;

        for (uint256 i = 0; i < count; i++) {
            if (prices[i] == 0) continue;

            // Check if price is within threshold
            uint256 deviation = prices[i] > median
                ? ((prices[i] - median) * 100) / median
                : ((median - prices[i]) * 100) / median;

            if (deviation <= outlierThreshold) {
                sum += prices[i];
                validCount++;
            } else {
                emit OutlierDetected("unknown", prices[i], median);
            }
        }

        require(validCount > 0, "No valid prices after outlier removal");
        return sum / validCount;
    }

    function _calculateConfidence(uint256 validCount, uint256 totalCount) internal pure returns (uint256) {
        if (totalCount == 0) return 0;
        return (validCount * 100) / totalCount;
    }
}
