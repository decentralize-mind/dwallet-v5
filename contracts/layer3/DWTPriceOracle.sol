// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../layer7/SecurityGated.sol";

// Chainlink Aggregator interface
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
 * @title DWTPriceOracle
 * @notice Dual-source price oracle (Chainlink + Uniswap V3 TWAP)
 * @dev Provides reliable price feeds with fallback mechanisms
 */
contract DWTPriceOracle is AccessControl, ReentrancyGuard, SecurityGated {
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    
    // Price feed configuration
    struct PriceFeed {
        AggregatorV3Interface chainlinkAggregator;
        uint256 stalenessThreshold; // Maximum age in seconds
        uint256 fallbackPrice; // Last known good price
        bool isActive;
    }
    
    // TWAP observation
    struct Observation {
        uint32 timestamp;
        uint256 price;
    }
    
    // State variables
    mapping(address => PriceFeed) public priceFeeds; // token => PriceFeed
    mapping(address => Observation[]) public twapObservations; // token => observations
    mapping(address => uint256) public twapWindowSize; // token => window size in seconds
    
    uint256 public constant MIN_TWAP_WINDOW = 300; // 5 minutes minimum
    uint256 public constant DEFAULT_STALENESS = 1 hours;
    
    // Events
    event PriceFeedRegistered(address token, address chainlinkAggregator, uint256 stalenessThreshold);
    event PriceFeedUpdated(address token, uint256 chainlinkPrice, uint256 twapPrice, uint256 finalPrice);
    event TWAPObservationRecorded(address token, uint256 price, uint256 timestamp);
    event FallbackPriceSet(address token, uint256 price);
    event StalenessThresholdUpdated(address token, uint256 threshold);
    
    constructor(address _securityController) SecurityGated(_securityController) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, msg.sender);
    }
    
    /**
     * @notice Register a new price feed
     * @param token Token address
     * @param chainlinkAggregator Chainlink aggregator address
     * @param stalenessThreshold Maximum age in seconds
     */
    function registerPriceFeed(
        address token,
        address chainlinkAggregator,
        uint256 stalenessThreshold
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(chainlinkAggregator != address(0), "Invalid aggregator");
        require(stalenessThreshold > 0, "Invalid threshold");
        
        priceFeeds[token] = PriceFeed({
            chainlinkAggregator: AggregatorV3Interface(chainlinkAggregator),
            stalenessThreshold: stalenessThreshold,
            fallbackPrice: 0,
            isActive: true
        });
        
        twapWindowSize[token] = MIN_TWAP_WINDOW;
        
        emit PriceFeedRegistered(token, chainlinkAggregator, stalenessThreshold);
    }
    
    /**
     * @notice Get price for a token with fallback chain
     * @param token Token address
     * @return price Current price
     * @return source Price source (1=Chainlink, 2=TWAP, 3=Fallback)
     */
    function getPrice(address token) external view returns (uint256 price, uint8 source) {
        require(priceFeeds[token].isActive, "Price feed not active");
        
        // Try Chainlink first
        (price, source) = _getChainlinkPrice(token);
        if (source == 1) return (price, source);
        
        // Fallback to TWAP
        (price, source) = _getTWAPPrice(token);
        if (source == 2) return (price, source);
        
        // Last resort: fallback price
        price = priceFeeds[token].fallbackPrice;
        source = 3;
        require(price > 0, "No price available");
    }
    
    /**
     * @notice Record a TWAP observation
     * @param token Token address
     * @param spotPrice Current spot price
     */
    function recordObservation(address token, uint256 spotPrice) external onlyRole(UPDATER_ROLE) {
        require(spotPrice > 0, "Invalid price");
        
        Observation memory obs = Observation({
            timestamp: uint32(block.timestamp),
            price: spotPrice
        });
        
        twapObservations[token].push(obs);
        
        emit TWAPObservationRecorded(token, spotPrice, block.timestamp);
    }
    
    /**
     * @notice Set fallback price manually
     * @param token Token address
     * @param price Fallback price
     */
    function setFallbackPrice(address token, uint256 price) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(price > 0, "Invalid price");
        priceFeeds[token].fallbackPrice = price;
        emit FallbackPriceSet(token, price);
    }
    
    /**
     * @notice Update staleness threshold
     * @param token Token address
     * @param threshold New threshold in seconds
     */
    function updateStalenessThreshold(address token, uint256 threshold) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(threshold > 0, "Invalid threshold");
        priceFeeds[token].stalenessThreshold = threshold;
        emit StalenessThresholdUpdated(token, threshold);
    }
    
    /**
     * @notice Get Chainlink price with staleness check
     */
    function _getChainlinkPrice(address token) internal view returns (uint256 price, uint8 source) {
        PriceFeed memory feed = priceFeeds[token];
        
        try feed.chainlinkAggregator.latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            // Check staleness
            if (block.timestamp - updatedAt > feed.stalenessThreshold) {
                return (0, 0); // Stale
            }
            
            // Check for invalid data
            if (answer <= 0 || updatedAt == 0) {
                return (0, 0); // Invalid
            }
            
            return (uint256(answer), 1); // Chainlink
        } catch {
            return (0, 0); // Error
        }
    }
    
    /**
     * @notice Get TWAP price from observations
     */
    function _getTWAPPrice(address token) internal view returns (uint256 price, uint8 source) {
        Observation[] memory observations = twapObservations[token];
        if (observations.length == 0) {
            return (0, 0); // No data
        }
        
        uint256 windowSize = twapWindowSize[token];
        uint256 currentTime = block.timestamp;
        
        uint256 sum = 0;
        uint256 count = 0;
        
        // Calculate TWAP within window
        for (uint256 i = observations.length; i > 0; i--) {
            Observation memory obs = observations[i - 1];
            
            if (currentTime - obs.timestamp > windowSize) {
                break; // Outside window
            }
            
            sum += obs.price;
            count++;
        }
        
        if (count == 0) {
            return (0, 0); // No valid observations
        }
        
        return (sum / count, 2); // TWAP
    }
}
