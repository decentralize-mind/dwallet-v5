// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title MultisigModule
/// @notice M-of-N multisig module that can be attached to any dWallet.
///         Implements a proposal queue: any owner submits, threshold owners confirm, then execute.
contract MultisigModule {
    using ECDSA for bytes32;

    struct Transaction {
        address  to;
        uint256  value;
        bytes    data;
        bool     executed;
        uint256  confirmations;
    }

    address public wallet;
    address[] public owners;
    uint256 public threshold;
    uint256 public txCount;

    mapping(uint256 => Transaction)           public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmed;

    event TransactionSubmitted(uint256 indexed txId, address indexed owner);
    event TransactionConfirmed(uint256 indexed txId, address indexed owner);
    event ConfirmationRevoked(uint256 indexed txId, address indexed owner);
    event TransactionExecuted(uint256 indexed txId);

    modifier onlyOwner() {
        require(_isOwner(msg.sender), "MultisigModule: not owner");
        _;
    }

    modifier txExists(uint256 txId) {
        require(txId < txCount, "MultisigModule: tx not found");
        _;
    }

    modifier notExecuted(uint256 txId) {
        require(!transactions[txId].executed, "MultisigModule: already executed");
        _;
    }

    constructor(address _wallet, address[] memory _owners, uint256 _threshold) {
        require(_owners.length >= _threshold && _threshold > 0, "MultisigModule: bad threshold");
        wallet    = _wallet;
        owners    = _owners;
        threshold = _threshold;
    }

    // ─── Submit ───────────────────────────────────────────────────────────────

    function submitTransaction(address to, uint256 value, bytes calldata data)
        external onlyOwner returns (uint256 txId)
    {
        txId = txCount++;
        transactions[txId] = Transaction({ to: to, value: value, data: data, executed: false, confirmations: 0 });
        emit TransactionSubmitted(txId, msg.sender);
        confirmTransaction(txId);
    }

    // ─── Confirm ──────────────────────────────────────────────────────────────

    function confirmTransaction(uint256 txId)
        public onlyOwner txExists(txId) notExecuted(txId)
    {
        require(!confirmed[txId][msg.sender], "MultisigModule: already confirmed");
        confirmed[txId][msg.sender] = true;
        transactions[txId].confirmations++;
        emit TransactionConfirmed(txId, msg.sender);

        if (transactions[txId].confirmations >= threshold) {
            _executeTransaction(txId);
        }
    }

    // ─── Revoke ───────────────────────────────────────────────────────────────

    function revokeConfirmation(uint256 txId)
        external onlyOwner txExists(txId) notExecuted(txId)
    {
        require(confirmed[txId][msg.sender], "MultisigModule: not confirmed");
        confirmed[txId][msg.sender] = false;
        transactions[txId].confirmations--;
        emit ConfirmationRevoked(txId, msg.sender);
    }

    // ─── Execute ──────────────────────────────────────────────────────────────

    function _executeTransaction(uint256 txId) internal {
        Transaction storage txn = transactions[txId];
        txn.executed = true;
        (bool ok,) = txn.to.call{value: txn.value}(txn.data);
        require(ok, "MultisigModule: execution failed");
        emit TransactionExecuted(txId);
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    function getTransaction(uint256 txId) external view
        returns (address to, uint256 value, bytes memory data, bool executed, uint256 numConfirms)
    {
        Transaction storage txn = transactions[txId];
        return (txn.to, txn.value, txn.data, txn.executed, txn.confirmations);
    }

    function getOwners() external view returns (address[] memory) { return owners; }

    function _isOwner(address addr) internal view returns (bool) {
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == addr) return true;
        }
        return false;
    }

    receive() external payable {}
}
