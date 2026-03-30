// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SecurityController
 * @notice The "Brain" for the protocol security.
 *         Maintains threat states and automates protocol responses.
 *         Used by off-chain monitors to report suspicious activity.
 */
contract SecurityController is AccessControl {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant MONITOR_ROLE = keccak256("MONITOR_ROLE");

    uint256 public threatLevel; // 0 to 100
    bool public isPaused;

    event ThreatReported(uint256 indexed level, address indexed reporter);
    event ProtocolStatusChanged(bool indexed paused);

    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
    }

    /**
     * @notice Report a new threat level. Only dedicated monitors or guardians can call.
     */
    function reportThreat(uint256 level) external onlyRole(MONITOR_ROLE) {
        threatLevel = level;
        emit ThreatReported(level, msg.sender);

        // Automate Response: Level 80+ triggers full protocol pause
        if (level >= 80) {
            _setPaused(true);
        }
    }

    /**
     * @notice Emergency action for Guardians to pause/unpause manually.
     */
    function emergencyAction(bool pause) external onlyRole(GUARDIAN_ROLE) {
        _setPaused(pause);
    }

    /**
     * @dev Internal pause management.
     */
    function _setPaused(bool pause) internal {
        isPaused = pause;
        emit ProtocolStatusChanged(pause);
    }

    /**
     * @notice Check if the system is currently blocked due to threat level or maintenance.
     */
    function isSystemHalted() external view returns (bool) {
        return isPaused || threatLevel >= 90;
    }
}
