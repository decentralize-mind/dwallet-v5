// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Interfaces.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title LockEngine
 * @notice Master engine for the 5 Universal Security Locks.
 *         Ensures all sensitive protocol actions are gated by:
 *         WHO (Access), WHEN (Time), WHAT (State), HOW MUCH (Rate), WHY (Verification).
 */
contract LockEngine is AccessControl {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    IAccessController public access;
    ITimeLockController public time;
    IStateController public state;
    IRateLimiter public rateLimit;
    IVerificationEngine public verification;
    ISecurityController public securityController;

    event SecurityModulesUpdated(address access, address time, address state, address rate, address verify);
    event LockEnginePaused(bool paused);

    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
    }

    /**
     * @notice Set or update the security modules.
     */
    function setModules(
        address _access,
        address _time,
        address _state,
        address _rateLimit,
        address _verification,
        address _securityController
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        access = IAccessController(_access);
        time = ITimeLockController(_time);
        state = IStateController(_state);
        rateLimit = IRateLimiter(_rateLimit);
        verification = IVerificationEngine(_verification);
        securityController = ISecurityController(_securityController);
        
        emit SecurityModulesUpdated(_access, _time, _state, _rateLimit, _verification);
    }

    /**
     * @notice Unified security check for any action.
     * @param account The address attempting the action.
     * @param role The role required (Lock 1: Access).
     * @param actionId The specific action ID (Lock 2: Time).
     * @param layerId The layer being interacted with (Lock 3: State).
     * @param amount The value or quantity involved (Lock 4: Rate).
     */
    function checkAllLocks(
        address account,
        bytes32 role,
        bytes32 actionId,
        bytes32 layerId,
        uint256 amount
    ) external {
        // Lock 3: State (Check global pause first)
        require(!securityController.isPaused(), "SYSTEM_PAUSED");
        state.verifyState(layerId);

        // Lock 1: Access (Who)
        access.verifyAccess(account, role);

        // Lock 2: Time (When)
        time.verifyTimeLock(account, actionId);

        // Lock 4: Rate (How Much/Often)
        rateLimit.verifyAndUpdateRate(account, actionId, amount);
    }

    /**
     * @notice Post-execution update for time-based locks (cooldowns).
     */
    function postExecute(address account, bytes32 actionId) external {
        time.startCooldown(account, actionId);
    }
}
