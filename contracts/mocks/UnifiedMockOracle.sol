// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UnifiedMockOracle {
    int256  public price;
    uint256 public updatedAt;
    uint8   public decimals;
    address public owner;

    constructor(uint8 _decimals, int256 _initialPrice) {
        decimals  = _decimals;
        price     = _initialPrice;
        updatedAt = block.timestamp;
        owner     = msg.sender;
    }

    function setPrice(int256 _price) external {
        require(msg.sender == owner, "Not owner");
        price     = _price;
        updatedAt = block.timestamp;
    }

    // IDWTOracle interface
    function latestPrice() external view returns (uint256) {
        // if decimals < 18, upscale
        if (decimals < 18) return uint256(price) * 10 ** (18 - decimals);
        if (decimals > 18) return uint256(price) / 10 ** (decimals - 18);
        return uint256(price);
    }

    function lastUpdated() external view returns (uint256) {
        return updatedAt;
    }

    // AggregatorV3Interface
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 _updatedAt,
            uint80 answeredInRound
        )
    {
        return (1, price, updatedAt, updatedAt, 1);
    }
}
