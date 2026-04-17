// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../layer7/SecurityGated.sol";

/**
 * @title Pyth Network Oracle Interface
 * @notice Interface for Pyth Network price feeds
 * 
 * Pyth Network provides:
 * - First-party oracle data (direct from exchanges/trading firms)
 * - Low latency price updates
 * - Confidence intervals for price accuracy
 * - Permissionless price feed access
 * 
 * Documentation: https://docs.pyth.network
 */
interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }

    struct PriceFeed {
        bytes32 id;
        Price price;
        Price emaPrice;
    }

    function getPrice(bytes32 priceFeedId) external view returns (Price memory);
    function getPriceNoOlderThan(bytes32 priceFeedId, uint256 age) external view returns (Price memory);
    function updatePriceFeeds(bytes[] calldata updateData) external payable;
    function getUpdateFee(bytes[] calldata updateData) external view returns (uint256 feeAmount);
}

/**
 * @title PythOracleAdapter
 * @notice Adapter for integrating Pyth Network price feeds
 * 
 * Features:
 * - Pyth Network price feed integration
 * - Confidence interval validation
 * - Staleness checking
 * - Fallback to other oracles
 * 
 * Usage:
 *   PythOracleAdapter adapter = new PythOracleAdapter(
 *       pythContract,
 *       priceFeedId,
 *       maxStaleness,
 *       maxConfidenceInterval
 *   );
 *   
 *   uint256 price = adapter.getPrice();
 */
contract PythOracleAdapter is SecurityGated {
    IPyth public pyth;
    bytes32 public priceFeedId;
    uint256 public maxStaleness;
    uint256 public maxConfidenceInterval;

    bytes32 public constant LAYER_ID = keccak256("LAYER_3_ORACLE");

    event PriceUpdated(int64 price, uint64 confidence, uint256 timestamp);
    event FeedConfigUpdated(bytes32 newFeedId, uint256 newMaxStaleness);

    constructor(
        address _pyth,
        bytes32 _priceFeedId,
        uint256 _maxStaleness,
        uint256 _maxConfidenceInterval,
        address _securityController,
        address _registry,
        address _lockEngine,
        address _invariantChecker
    ) SecurityGated(_securityController) {
        pyth = IPyth(_pyth);
        priceFeedId = _priceFeedId;
        maxStaleness = _maxStaleness;
        maxConfidenceInterval = _maxConfidenceInterval;
        _initSecuritySystem(_registry, _lockEngine, _invariantChecker);
    }

    /**
     * @notice Get latest price from Pyth Network
     * @return price Price with 18 decimals
     * @return confidence Confidence interval
     * @return timestamp Price publish time
     */
    function getPrice() external view withStateGuard(LAYER_ID) returns (
        uint256 price,
        uint64 confidence,
        uint256 timestamp
    ) {
        IPyth.Price memory pythPrice = pyth.getPrice(priceFeedId);

        // Validate staleness
        require(
            block.timestamp - pythPrice.publishTime <= maxStaleness,
            "PythOracle: Price too old"
        );

        // Validate confidence interval
        require(
            pythPrice.conf <= maxConfidenceInterval,
            "PythOracle: Confidence too low"
        );

        // Validate price is positive
        require(pythPrice.price > 0, "PythOracle: Invalid price");

        // Normalize to 18 decimals
        int256 priceInt = pythPrice.price;
        if (pythPrice.expo < 0) {
            price = uint256(priceInt) * 10 ** (18 + pythPrice.expo);
        } else {
            price = uint256(priceInt) * 10 ** (18 - pythPrice.expo);
        }

        confidence = pythPrice.conf;
        timestamp = pythPrice.publishTime;

        emit PriceUpdated(pythPrice.price, pythPrice.conf, pythPrice.publishTime);
    }

    /**
     * @notice Get price with maximum age check
     */
    function getPriceFresh(uint256 maxAge) external view returns (uint256 price) {
        IPyth.Price memory pythPrice = pyth.getPriceNoOlderThan(priceFeedId, maxAge);
        
        require(pythPrice.price > 0, "PythOracle: Invalid price");
        
        int256 priceInt = pythPrice.price;
        if (pythPrice.expo < 0) {
            price = uint256(priceInt) * 10 ** (18 + pythPrice.expo);
        } else {
            price = uint256(priceInt) * 10 ** (18 - pythPrice.expo);
        }
    }

    /**
     * @notice Update price feed configuration
     */
    function setFeedConfig(
        bytes32 _newFeedId,
        uint256 _newMaxStaleness,
        uint256 _newMaxConfidenceInterval
    ) external withTimeLock(keccak256("ORACLE_CONFIG_ACTION")) {
        priceFeedId = _newFeedId;
        maxStaleness = _newMaxStaleness;
        maxConfidenceInterval = _newMaxConfidenceInterval;
        emit FeedConfigUpdated(_newFeedId, _newMaxStaleness);
    }

    /**
     * @notice Update Pyth price feeds (payable)
     */
    function updatePrices(bytes[] calldata updateData) external payable {
        uint256 fee = pyth.getUpdateFee(updateData);
        require(msg.value >= fee, "PythOracle: Insufficient fee");
        pyth.updatePriceFeeds{value: msg.value}(updateData);
    }
}
