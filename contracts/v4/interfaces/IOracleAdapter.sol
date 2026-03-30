// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IOracleAdapter
interface IOracleAdapter {
    event FeedSet(address indexed token, address indexed aggregator, uint256 maxStaleness);
    event FeedDeactivated(address indexed token);
    event PriceObserved(address indexed token, uint256 price);

    function setFeed(address token, address aggregator, uint256 maxStaleness) external;
    function deactivateFeed(address token) external;
    function getPrice(address token) external view returns (uint256 price);
    function getTWAP(address token) external view returns (uint256 twap);
    function observe(address token) external;
    function checkStaleness(address token) external view returns (bool fresh, uint256 age);
}
