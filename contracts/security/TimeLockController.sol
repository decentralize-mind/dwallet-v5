// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TimeLockController
 * @notice Universal Lock Type 2: Time Lock (WHEN it can happen)
 *         Controls timing, delays, and cooldown periods.
 */
contract TimeLockController is Ownable {
    struct Timelock {
        uint256 unlockTime;
        bool status;
    }

    /// @dev actionId => user => Timelock
    mapping(bytes32 => mapping(address => Timelock)) public userCooldowns;

    /// @dev actionId => global delay (seconds)
    mapping(bytes32 => uint256) public actionDelays;

    error TimeLockActive(uint256 unlockTime);
    error DelayTooShort(uint256 provided, uint256 minimum);

    event CooldownStarted(bytes32 indexed actionId, address indexed account, uint256 unlockTime);
    event DelayUpdated(bytes32 indexed actionId, uint256 delay);

    constructor(address _admin) Ownable(_admin) {}

    /**
     * @notice Check if a user's cooldown for a specific action has expired.
     */
    function verifyTimeLock(address account, bytes32 actionId) external view {
        uint256 unlockTime = userCooldowns[actionId][account].unlockTime;
        if (block.timestamp < unlockTime) revert TimeLockActive(unlockTime);
    }

    /**
     * @notice Set or refresh a cooldown for a specific user and action.
     */
    function startCooldown(address account, bytes32 actionId) external {
        uint256 delay = actionDelays[actionId];
        uint256 unlockTime = block.timestamp + delay;
        userCooldowns[actionId][account] = Timelock(unlockTime, true);
        emit CooldownStarted(actionId, account, unlockTime);
    }

    // --- Admin Functions ---

    function setActionDelay(bytes32 actionId, uint256 delay) external onlyOwner {
        actionDelays[actionId] = delay;
        emit DelayUpdated(actionId, delay);
    }
}
