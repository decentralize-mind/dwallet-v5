// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../SecurityGated.sol";

/**
 * @title DWalletMultisig
 * @notice M-of-N multisig wallet for protocol admin key management.
 *
 * Protections implemented:
 *   - M-of-N confirmation model (any tx requires >= required confirmations)
 *   - Self-governance only: addOwner/removeOwner/changeRequirement callable only via executeTransaction()
 *   - Auto-adjust required on removeOwner (if N drops below M, required = N)
 *   - No re-execution: executed transactions permanently marked, no replay
 *   - Revoke before execution: owners can revoke confirmation before execution
 *   - Duplicate owner check in constructor (!isOwner[o])
 *   - Reentrancy guard on executeTransaction()
 *   - Failed tx retry: txn.executed = false on failure (no permanent lock)
 */
contract DWalletMultisig is ReentrancyGuard, SecurityGated {
    // ─── Events ───────────────────────────────────────────────────────────────
    event TransactionSubmitted(uint256 indexed txId, address indexed submitter, address to, uint256 value, bytes data);
    event TransactionConfirmed(uint256 indexed txId, address indexed owner);
    event ConfirmationRevoked(uint256 indexed txId, address indexed owner);
    event TransactionExecuted(uint256 indexed txId, address indexed executor);
    event TransactionFailed(uint256 indexed txId);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event RequirementChanged(uint256 required);

    // ─── State ────────────────────────────────────────────────────────────────
    struct Transaction {
        address to;
        uint256 value;
        bytes   data;
        bool    executed;
        uint256 confirmations;
    }

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required;

    Transaction[] public transactions;
    // txId => owner => confirmed
    mapping(uint256 => mapping(address => bool)) public confirmed;

    bytes32 public constant LAYER_ID = keccak256("LAYER_3_AUTH");
    bytes32 public constant EXECUTE_ACTION = keccak256("EXECUTE_ACTION");
    bytes32 public constant ADMIN_ACTION = keccak256("ADMIN_ACTION");

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Multisig: not owner");
        _;
    }

    modifier onlySelf() {
        require(msg.sender == address(this), "Multisig: only self");
        _;
    }

    modifier txExists(uint256 txId) {
        require(txId < transactions.length, "Multisig: tx does not exist");
        _;
    }

    modifier notExecuted(uint256 txId) {
        require(!transactions[txId].executed, "Multisig: already executed");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address[] memory _owners,
        uint256 _required,
        address _admin,
        address _governor,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    ) SecurityGated(_securityController) {
        if (_required == 0 || _required > _owners.length) revert InvalidThreshold();

        for (uint256 i; i < _owners.length; ++i) {
            address s = _owners[i];
            if (s == address(0)) revert ZeroAddress();
            if (isOwner[s])      revert AlreadyOwner();
            isOwner[s] = true;
            owners.push(s);
            emit OwnerAdded(s);
        }

        required = _required;
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    // ─── Transaction Lifecycle ────────────────────────────────────────────────
    /**
     * @notice Submit a new transaction for confirmation.
     * @dev Gated by 5 Universal Locks (Standard):
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Rate: withRateLimit(EXECUTE_ACTION, 1)
     */
    function submitTransaction(address to, uint256 value, bytes calldata data)
        external 
        onlyOwner 
        whenProtocolNotPaused
        withStateGuard(LAYER_ID)
        withRateLimit(EXECUTE_ACTION, 1)
        returns (uint256 txId)
    {
        require(to != address(0), "Multisig: zero to");
        txId = transactions.length;
        transactions.push(Transaction(to, value, data, false, 0));
        emit TransactionSubmitted(txId, msg.sender, to, value, data);
        // Auto-confirm by submitter
        _confirm(txId);
    }

    /**
     * @notice Confirm a pending transaction.
     */
    function confirmTransaction(uint256 txId)
        external 
        onlyOwner 
        txExists(txId) 
        notExecuted(txId)
        whenProtocolNotPaused
        withStateGuard(LAYER_ID)
    {
        _confirm(txId);
    }

    function _confirm(uint256 txId) internal {
        require(!confirmed[txId][msg.sender], "Multisig: already confirmed");
        confirmed[txId][msg.sender] = true;
        transactions[txId].confirmations++;
        emit TransactionConfirmed(txId, msg.sender);
    }

    /**
     * @notice Revoke a confirmation before execution.
     */
    function revokeConfirmation(uint256 txId)
        external 
        onlyOwner 
        txExists(txId) 
        notExecuted(txId)
        whenProtocolNotPaused
    {
        require(confirmed[txId][msg.sender], "Multisig: not confirmed");
        confirmed[txId][msg.sender] = false;
        transactions[txId].confirmations--;
        emit ConfirmationRevoked(txId, msg.sender);
    }

    /**
     * @notice Execute a transaction once it has enough confirmations.
     * @dev Gated by Time-lock and Rate-limit.
     */
    function executeTransaction(uint256 txId)
        external 
        nonReentrant 
        onlyOwner 
        txExists(txId) 
        notExecuted(txId)
        whenProtocolNotPaused
        withStateGuard(LAYER_ID)
        withTimeLock(EXECUTE_ACTION)
        withRateLimit(EXECUTE_ACTION, transactions[txId].value)
    {
        Transaction storage txn = transactions[txId];
        require(txn.confirmations >= required, "Multisig: not enough confirmations");

        txn.executed = true;
        (bool success, ) = txn.to.call{value: txn.value}(txn.data);

        if (success) {
            emit TransactionExecuted(txId, msg.sender);
        } else {
            // Failed tx retry: reset executed flag so the tx can be retried
            txn.executed = false;
            emit TransactionFailed(txId);
        }
    }

    // ─── Self-Governance (must go through executeTransaction) ─────────────────
    /**
     * @notice Add a new owner. Only callable via executeTransaction() (M-of-N).
     */
    function addOwner(address newOwner) external onlySelf {
        require(newOwner   != address(0), "Multisig: zero owner");
        require(!isOwner[newOwner],       "Multisig: already owner");
        isOwner[newOwner] = true;
        owners.push(newOwner);
        emit OwnerAdded(newOwner);
    }

    /**
     * @notice Remove an owner. Only callable via executeTransaction() (M-of-N).
     * @dev Auto-adjusts required if N drops below M.
     */
    function removeOwner(address ownerToRemove) external onlySelf {
        require(isOwner[ownerToRemove], "Multisig: not owner");
        require(owners.length > 1,     "Multisig: cannot remove last owner");

        isOwner[ownerToRemove] = false;
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == ownerToRemove) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }

        // Auto-adjust required to prevent M > N deadlock
        if (required > owners.length) {
            required = owners.length;
            emit RequirementChanged(required);
        }
        emit OwnerRemoved(ownerToRemove);
    }

    /**
     * @notice Change confirmation requirement. Only callable via executeTransaction() (M-of-N).
     */
    function changeRequirement(uint256 newRequired) external onlySelf {
        require(newRequired >  0,             "Multisig: zero required");
        require(newRequired <= owners.length, "Multisig: required > owners");
        required = newRequired;
        emit RequirementChanged(newRequired);
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    function getOwners() external view returns (address[] memory) { return owners; }
    function getTransactionCount() external view returns (uint256) { return transactions.length; }

    receive() external payable {}
}
