// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../layer7/SecurityGated.sol";

/**
 * @title DWalletMultisig
 * @notice M-of-N multisig wallet for administrative operations
 * @dev Secure multi-signature wallet requiring multiple confirmations
 */
contract DWalletMultisig is ReentrancyGuard, SecurityGated {
    // Transaction structure
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmations;
    }
    
    // State variables
    address[] public signers;
    mapping(address => bool) public isSigner;
    uint256 public requiredConfirmations;
    
    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;
    
    // Events
    event SignerAdded(address signer);
    event SignerRemoved(address signer);
    event RequiredConfirmationsUpdated(uint256 newRequired);
    event TransactionSubmitted(uint256 txId, address to, uint256 value, bytes data);
    event TransactionConfirmed(uint256 txId, address signer);
    event TransactionExecuted(uint256 txId);
    event TransactionCancelled(uint256 txId);
    
    modifier onlySigner() {
        require(isSigner[msg.sender], "Not a signer");
        _;
    }
    
    modifier txExists(uint256 txId) {
        require(txId < transactions.length, "Transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 txId) {
        require(!transactions[txId].executed, "Transaction already executed");
        _;
    }
    
    modifier notConfirmed(uint256 txId) {
        require(!confirmations[txId][msg.sender], "Already confirmed");
        _;
    }
    
    constructor(
        address _securityController,
        address[] memory _signers,
        uint256 _requiredConfirmations
    ) SecurityGated(_securityController) {
        require(_signers.length > 0, "No signers");
        require(
            _requiredConfirmations > 0 && _requiredConfirmations <= _signers.length,
            "Invalid required confirmations"
        );
        
        requiredConfirmations = _requiredConfirmations;
        
        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            require(signer != address(0), "Invalid signer");
            require(!isSigner[signer], "Duplicate signer");
            
            isSigner[signer] = true;
            signers.push(signer);
        }
    }
    
    /**
     * @notice Submit a new transaction
     * @param to Destination address
     * @param value Ether value
     * @param data Transaction data
     * @return txId Transaction ID
     */
    function submitTransaction(address to, uint256 value, bytes memory data) 
        external 
        onlySigner 
        returns (uint256 txId) 
    {
        require(to != address(0), "Invalid address");
        
        txId = transactions.length;
        transactions.push(Transaction({
            to: to,
            value: value,
            data: data,
            executed: false,
            confirmations: 0
        }));
        
        emit TransactionSubmitted(txId, to, value, data);
    }
    
    /**
     * @notice Confirm a transaction
     * @param txId Transaction ID
     */
    function confirmTransaction(uint256 txId) 
        external 
        onlySigner 
        txExists(txId) 
        notExecuted(txId) 
        notConfirmed(txId) 
    {
        confirmations[txId][msg.sender] = true;
        transactions[txId].confirmations++;
        
        emit TransactionConfirmed(txId, msg.sender);
    }
    
    /**
     * @notice Execute a confirmed transaction
     * @param txId Transaction ID
     */
    function executeTransaction(uint256 txId) 
        external 
        onlySigner 
        txExists(txId) 
        notExecuted(txId) 
    {
        require(
            transactions[txId].confirmations >= requiredConfirmations,
            "Not enough confirmations"
        );
        
        transactions[txId].executed = true;
        
        (bool success, ) = transactions[txId].to.call{value: transactions[txId].value}(
            transactions[txId].data
        );
        require(success, "Transaction execution failed");
        
        emit TransactionExecuted(txId);
    }
    
    /**
     * @notice Cancel a transaction (only if not executed)
     * @param txId Transaction ID
     */
    function cancelTransaction(uint256 txId) 
        external 
        onlySigner 
        txExists(txId) 
        notExecuted(txId) 
    {
        transactions[txId].executed = true; // Mark as executed to prevent future execution
        emit TransactionCancelled(txId);
    }
    
    /**
     * @notice Add a new signer
     * @param signer New signer address
     */
    function addSigner(address signer) external onlySigner {
        require(signer != address(0), "Invalid signer");
        require(!isSigner[signer], "Already a signer");
        
        isSigner[signer] = true;
        signers.push(signer);
        
        emit SignerAdded(signer);
    }
    
    /**
     * @notice Remove a signer
     * @param signer Signer address to remove
     */
    function removeSigner(address signer) external onlySigner {
        require(isSigner[signer], "Not a signer");
        require(signers.length > requiredConfirmations, "Cannot remove");
        
        isSigner[signer] = false;
        
        // Remove from array
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }
        
        emit SignerRemoved(signer);
    }
    
    /**
     * @notice Update required confirmations
     * @param newRequired New required count
     */
    function updateRequiredConfirmations(uint256 newRequired) external onlySigner {
        require(newRequired > 0 && newRequired <= signers.length, "Invalid count");
        requiredConfirmations = newRequired;
        emit RequiredConfirmationsUpdated(newRequired);
    }
    
    /**
     * @notice Get transaction count
     */
    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }
    
    /**
     * @notice Get signer count
     */
    function getSignerCount() external view returns (uint256) {
        return signers.length;
    }
    
    /**
     * @notice Receive ether
     */
    receive() external payable {}
}
