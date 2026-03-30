// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AccessController
 * @notice Universal Lock Type 1: Access Lock (WHO can act)
 *         Provides role-based access, whitelisting, and contract-only gating.
 */
contract AccessController is AccessControl {
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    mapping(address => bool) public isBlacklisted;
    mapping(address => bool) public isWhitelisted;

    error AddressBlacklisted(address account);
    error AddressNotWhitelisted(address account);
    error ContractOnly(address account);

    event Blacklisted(address indexed account, bool status);
    event Whitelisted(address indexed account, bool status);

    constructor(address _admin) {
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _admin);
    }

    /**
     * @notice Check if an address has permission to act.
     */
    function verifyAccess(address account, bytes32 role) external view {
        if (isBlacklisted[account]) revert AddressBlacklisted(account);
        _checkRole(role, account);
    }

    /**
     * @notice Whitelist-specific check.
     */
    function verifyWhitelist(address account) external view {
        if (!isWhitelisted[account]) revert AddressNotWhitelisted(account);
    }

    /**
     * @notice Ensure only contracts (not EOA) can call.
     */
    function verifyContractOnly(address account) external view {
        if (account.code.length == 0) revert ContractOnly(account);
    }

    // --- Admin Functions ---

    function setBlacklist(address account, bool status) external onlyRole(ADMIN_ROLE) {
        isBlacklisted[account] = status;
        emit Blacklisted(account, status);
    }

    function setWhitelist(address account, bool status) external onlyRole(ADMIN_ROLE) {
        isWhitelisted[account] = status;
        emit Whitelisted(account, status);
    }
}

