// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../SecurityGated.sol";

/**
 * @title EmergencyPause
 * @notice Protocol-wide circuit breaker. A guardian can halt all registered
 *         contracts in a single transaction (<1 block).
 *
 * Protections implemented:
 *   - GUARDIAN_ROLE can pause only — cannot unpause (compromised guardian freezes, can't steal)
 *   - ADMIN_ROLE (multisig) required to unpause — higher trust bar
 *   - Atomic pauseAll(): one tx pauses ALL registered targets
 *   - try/catch in pauseAll(): one non-pausable contract doesn't block others
 *   - On-chain pause history: every pauseAll() stores guardian, timestamp, reason on-chain
 *   - Target registry: only registered targets can be paused (no unauthorized targets mid-crisis)
 */

interface IPausable {
    function pause() external;
    function unpause() external;
}

contract EmergencyPause is AccessControl, SecurityGated {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");

    struct PauseEvent {
        address guardian;
        uint256 timestamp;
        string  reason;
        address[] targets;
    }

    address[] public registeredTargets;
    mapping(address => bool) public isTarget;

    PauseEvent[] public pauseHistory;

    event TargetRegistered(address indexed target);
    event TargetRemoved(address indexed target);
    event ProtocolPaused(address indexed guardian, string reason, uint256 timestamp);
    event TargetUnpaused(address indexed target, address indexed admin);
    event PauseFailed(address indexed target, bytes reason);

    bytes32 public constant LAYER_ID = keccak256("LAYER_3_PAUSE");
    bytes32 public constant PAUSE_ACTION = keccak256("PAUSE_ACTION");
    bytes32 public constant UNPAUSE_ACTION = keccak256("UNPAUSE_ACTION");

    constructor(
        address _admin,
        address _governor,
        address _guardian,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    ) SecurityGated(_securityController) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);
        _grantRole(GUARDIAN_ROLE,      _guardian);

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    // ─── Pause ────────────────────────────────────────────────────────────────
    /**
     * @notice Atomically pause all registered targets in one transaction (<1 block).
     * @dev Gated by 5 Universal Locks:
     *      1. Access: withAccessLock(GUARDIAN_ROLE)
     *      2. Rate: withRateLimit(PAUSE_ACTION, 1)
     */
    function pauseAll(string calldata reason) 
        external 
        withAccessLock(GUARDIAN_ROLE)
        withRateLimit(PAUSE_ACTION, 1)
    {
        address[] memory targets = registeredTargets;

        for (uint256 i = 0; i < targets.length; i++) {
            // try/catch: one non-pausable contract never blocks the full pause loop
            try IPausable(targets[i]).pause() {
                // paused successfully
            } catch (bytes memory err) {
                emit PauseFailed(targets[i], err);
            }
        }

        // Store on-chain pause history with guardian, timestamp, reason
        pauseHistory.push(PauseEvent({
            guardian:  msg.sender,
            timestamp: block.timestamp,
            reason:    reason,
            targets:   targets
        }));

        emit ProtocolPaused(msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Pause a single target contract.
     */
    function pauseTarget(address target) 
        external 
        withAccessLock(GUARDIAN_ROLE)
    {
        require(isTarget[target], "EmergencyPause: not registered target");
        IPausable(target).pause();
    }

    // ─── Unpause ──────────────────────────────────────────────────────────────
    /**
     * @notice Unpause a single target. 
     */
    function unpauseTarget(address target) 
        external 
        withAccessLock(ADMIN_ROLE)
        withTimeLock(UNPAUSE_ACTION)
    {
        require(isTarget[target], "EmergencyPause: not registered target");
        IPausable(target).unpause();
        emit TargetUnpaused(target, msg.sender);
    }

    /**
     * @notice Unpause all registered targets. Requires Signature + TimeLock.
     */
    function unpauseAll(bytes32 hash, bytes calldata signature) 
        external 
        withAccessLock(ADMIN_ROLE)
        withTimeLock(UNPAUSE_ACTION)
        withSignature(hash, signature)
    {
        for (uint256 i = 0; i < registeredTargets.length; i++) {
            try IPausable(registeredTargets[i]).unpause() {
                emit TargetUnpaused(registeredTargets[i], msg.sender);
            } catch {}
        }
    }

    // ─── Target Registry ──────────────────────────────────────────────────────
    /**
     * @notice Register a contract as a pause target. ADMIN_ROLE only.
     * @dev Only registered targets can be paused — no unauthorized targets mid-crisis.
     */
    function registerTarget(address target) external onlyRole(ADMIN_ROLE) {
        require(target    != address(0), "EmergencyPause: zero target");
        require(!isTarget[target],       "EmergencyPause: already registered");
        isTarget[target] = true;
        registeredTargets.push(target);
        emit TargetRegistered(target);
    }

    /**
     * @notice Remove a target from the registry. ADMIN_ROLE only.
     */
    function removeTarget(address target) external onlyRole(ADMIN_ROLE) {
        require(isTarget[target], "EmergencyPause: not registered");
        isTarget[target] = false;
        for (uint256 i = 0; i < registeredTargets.length; i++) {
            if (registeredTargets[i] == target) {
                registeredTargets[i] = registeredTargets[registeredTargets.length - 1];
                registeredTargets.pop();
                break;
            }
        }
        emit TargetRemoved(target);
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    function getTargets() external view returns (address[] memory) {
        return registeredTargets;
    }

    function getPauseHistoryLength() external view returns (uint256) {
        return pauseHistory.length;
    }

    function getPauseEvent(uint256 index) external view returns (
        address guardian,
        uint256 timestamp,
        string memory reason
    ) {
        PauseEvent storage e = pauseHistory[index];
        return (e.guardian, e.timestamp, e.reason);
    }
}
