// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RateLimiter
 * @notice Universal Lock Type 4: Rate Lock (HOW MUCH / HOW OFTEN)
 *         Controls frequency and size of events per block/user.
 */
contract RateLimiter is Ownable {
    struct Usage {
        uint256 lastBlock;
        uint256 count;
        uint256 amount;
    }

    /// @dev actionId => user => usage
    mapping(bytes32 => mapping(address => Usage)) public userUsage;

    /// @dev actionId => maxCountPerBlock
    mapping(bytes32 => uint256) public maxCountPerBlock;

    /// @dev actionId => maxAmountPerBlock
    mapping(bytes32 => uint256) public maxAmountPerBlock;

    error RateLimitExceeded(uint256 provided, uint256 limit);
    error MaxAmountExceeded(uint256 provided, uint256 limit);

    event RateLimitUpdated(bytes32 indexed actionId, uint256 count, uint256 amount);

    constructor(address _admin) Ownable(_admin) {}

    /**
     * @notice Check and update usage for a specific user and action.
     */
    function verifyAndUpdateRate(
        address account,
        bytes32 actionId,
        uint256 amount
    ) external {
        Usage storage usage = userUsage[actionId][account];

        // Reset usage if we've moved to a new block
        if (usage.lastBlock != block.number) {
            usage.lastBlock = block.number;
            usage.count = 0;
            usage.amount = 0;
        }

        usage.count += 1;
        usage.amount += amount;

        uint256 limitCount = maxCountPerBlock[actionId];
        uint256 limitAmount = maxAmountPerBlock[actionId];

        if (limitCount > 0 && usage.count > limitCount)
            revert RateLimitExceeded(usage.count, limitCount);
        if (limitAmount > 0 && usage.amount > limitAmount)
            revert MaxAmountExceeded(usage.amount, limitAmount);
    }

    // --- Admin Functions ---

    function setRateLimit(
        bytes32 actionId,
        uint256 count,
        uint256 amount
    ) external onlyOwner {
        maxCountPerBlock[actionId] = count;
        maxAmountPerBlock[actionId] = amount;
        emit RateLimitUpdated(actionId, count, amount);
    }
}
