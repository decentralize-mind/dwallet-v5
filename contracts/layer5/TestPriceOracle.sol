// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TestPriceOracle
 * @notice Simple price oracle for testing on Base Sepolia
 * @dev Provides hardcoded prices for testing LimitOrders contract
 */
contract TestPriceOracle {
    // Price feeds storage: token => price (with 8 decimals)
    mapping(address => uint256) private prices;
    mapping(address => uint256) private lastUpdated;
    
    // Owner for price updates
    address public owner;
    
    // Event for price updates
    event PriceUpdated(address token, uint256 price, uint256 timestamp);
    
    constructor() {
        owner = msg.sender;
        
        // Set initial test prices (8 decimals)
        // ETH = $2000
        prices[address(0)] = 2000 * 10**8;
        lastUpdated[address(0)] = block.timestamp;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    /**
     * @notice Get latest price for a token
     * @param token Token address (address(0) for ETH)
     * @return price Price with 8 decimals
     * @return updatedAt Last update timestamp
     */
    function getLatestPrice(address token) external view returns (uint256 price, uint256 updatedAt) {
        price = prices[token];
        updatedAt = lastUpdated[token];
        require(price > 0, "Price not available");
        return (price, updatedAt);
    }
    
    /**
     * @notice Update price for a token
     * @param token Token address
     * @param price New price (8 decimals)
     */
    function updatePrice(address token, uint256 price) external onlyOwner {
        require(price > 0, "Invalid price");
        prices[token] = price;
        lastUpdated[token] = block.timestamp;
        emit PriceUpdated(token, price, block.timestamp);
    }
    
    /**
     * @notice Update multiple prices at once
     * @param tokens Array of token addresses
     * @param newPrices Array of new prices
     */
    function updatePrices(address[] calldata tokens, uint256[] calldata newPrices) external onlyOwner {
        require(tokens.length == newPrices.length, "Array mismatch");
        for (uint256 i = 0; i < tokens.length; i++) {
            require(newPrices[i] > 0, "Invalid price");
            prices[tokens[i]] = newPrices[i];
            lastUpdated[tokens[i]] = block.timestamp;
            emit PriceUpdated(tokens[i], newPrices[i], block.timestamp);
        }
    }
    
    /**
     * @notice Check if price is available for token
     * @param token Token address
     * @return true if price exists
     */
    function hasPrice(address token) external view returns (bool) {
        return prices[token] > 0;
    }
    
    /**
     * @notice Get price staleness
     * @param token Token address
     * @return seconds since last update
     */
    function getPriceAge(address token) external view returns (uint256) {
        if (lastUpdated[token] == 0) return type(uint256).max;
        return block.timestamp - lastUpdated[token];
    }
    
    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
