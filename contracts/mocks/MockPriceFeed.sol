// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockPriceFeed {
    int256  public price;
    uint256 public updatedAt;

    uint8   public decimals;

    constructor(uint8 _decimals) {
        decimals = _decimals;
    }

    function updatePrice(int256 _price, uint256 _updatedAt) external {
        price = _price;
        updatedAt = _updatedAt;
    }

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
