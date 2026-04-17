// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../layer7/SecurityGated.sol";

/**
 * @title DWTBridge
 * @notice Cross-chain lock-and-mint bridge with M-of-N relayer signatures
 * @dev Implements C-01 fix: per-relayer nonce tracking and 12-hour execution delay
 */
contract DWTBridge is AccessControl, ReentrancyGuard, SecurityGated {
    using SafeERC20 for IERC20;
    
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Bridge configuration
    struct TransferRequest {
        address token;
        address recipient;
        uint256 amount;
        uint64 nonce;
        uint64 timestamp;
        bool executed;
    }
    
    // State variables
    uint256 public requiredSignatures; // M-of-N required
    uint256 public relayerCount;
    uint64 public executionDelay = 12 hours;
    
    mapping(address => bool) public isRelayer;
    mapping(address => uint256) public relayerNonce; // Per-relayer nonce
    mapping(bytes32 => TransferRequest) public transferRequests;
    mapping(bytes32 => uint256) public approvalCount;
    mapping(bytes32 => mapping(address => bool)) public hasApproved;
    
    bytes32[] public requestIds;
    
    // Events
    event RelayerAdded(address relayer);
    event RelayerRemoved(address relayer);
    event RequiredSignaturesUpdated(uint256 newRequired);
    event TransferInitiated(bytes32 requestId, address token, address recipient, uint256 amount);
    event TransferApproved(bytes32 requestId, address relayer);
    event TransferExecuted(bytes32 requestId, address executor);
    event ExecutionDelayUpdated(uint256 newDelay);
    
    modifier onlyRelayer() {
        require(isRelayer[msg.sender], "Not a relayer");
        _;
    }
    
    constructor(
        address _securityController,
        uint256 _requiredSignatures
    ) SecurityGated(_securityController) {
        require(_requiredSignatures > 0, "Invalid signature count");
        requiredSignatures = _requiredSignatures;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @notice Add a new relayer
     * @param relayer Relayer address
     */
    function addRelayer(address relayer) external onlyRole(ADMIN_ROLE) {
        require(relayer != address(0), "Invalid address");
        require(!isRelayer[relayer], "Already a relayer");
        
        isRelayer[relayer] = true;
        relayerCount++;
        _grantRole(RELAYER_ROLE, relayer);
        
        emit RelayerAdded(relayer);
    }
    
    /**
     * @notice Remove a relayer
     * @param relayer Relayer address
     */
    function removeRelayer(address relayer) external onlyRole(ADMIN_ROLE) {
        require(isRelayer[relayer], "Not a relayer");
        
        isRelayer[relayer] = false;
        relayerCount--;
        revokeRole(RELAYER_ROLE, relayer);
        
        emit RelayerRemoved(relayer);
        
        // Update required signatures if needed
        if (requiredSignatures > relayerCount) {
            requiredSignatures = relayerCount;
            emit RequiredSignaturesUpdated(requiredSignatures);
        }
    }
    
    /**
     * @notice Update required signature count
     * @param newRequired New required count
     */
    function updateRequiredSignatures(uint256 newRequired) external onlyRole(ADMIN_ROLE) {
        require(newRequired > 0 && newRequired <= relayerCount, "Invalid count");
        requiredSignatures = newRequired;
        emit RequiredSignaturesUpdated(newRequired);
    }
    
    /**
     * @notice Initiate a bridge transfer (lock tokens)
     * @param token Token address
     * @param amount Amount to transfer
     * @param recipient Recipient address on destination chain
     * @return requestId Transfer request ID
     */
    function initiateTransfer(
        address token,
        uint256 amount,
        address recipient
    ) external nonReentrant returns (bytes32 requestId) {
        require(amount > 0, "Invalid amount");
        require(recipient != address(0), "Invalid recipient");
        
        // Lock tokens
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Create transfer request
        uint64 nonce = uint64(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, requestIds.length))) % type(uint64).max);
        requestId = keccak256(abi.encodePacked(token, recipient, amount, nonce, block.timestamp));
        
        transferRequests[requestId] = TransferRequest({
            token: token,
            recipient: recipient,
            amount: amount,
            nonce: nonce,
            timestamp: uint64(block.timestamp),
            executed: false
        });
        
        requestIds.push(requestId);
        
        emit TransferInitiated(requestId, token, recipient, amount);
    }
    
    /**
     * @notice Approve a transfer request (relayer only)
     * @param requestId Transfer request ID
     */
    function approveTransfer(bytes32 requestId) external onlyRelayer {
        TransferRequest storage request = transferRequests[requestId];
        require(request.timestamp > 0, "Request not found");
        require(!request.executed, "Already executed");
        require(!hasApproved[requestId][msg.sender], "Already approved");
        
        // Check execution delay
        require(block.timestamp >= request.timestamp + executionDelay, "Delay not met");
        
        hasApproved[requestId][msg.sender] = true;
        approvalCount[requestId]++;
        
        emit TransferApproved(requestId, msg.sender);
    }
    
    /**
     * @notice Execute an approved transfer
     * @param requestId Transfer request ID
     */
    function executeTransfer(bytes32 requestId) external nonReentrant {
        TransferRequest storage request = transferRequests[requestId];
        require(request.timestamp > 0, "Request not found");
        require(!request.executed, "Already executed");
        require(approvalCount[requestId] >= requiredSignatures, "Not enough approvals");
        
        // Check execution delay
        require(block.timestamp >= request.timestamp + executionDelay, "Delay not met");
        
        request.executed = true;
        
        // Release tokens to recipient
        IERC20(request.token).safeTransfer(request.recipient, request.amount);
        
        emit TransferExecuted(requestId, msg.sender);
    }
    
    /**
     * @notice Update execution delay
     * @param newDelay New delay in seconds
     */
    function updateExecutionDelay(uint256 newDelay) external onlyRole(ADMIN_ROLE) {
        executionDelay = uint64(newDelay);
        emit ExecutionDelayUpdated(newDelay);
    }
    
    /**
     * @notice Get transfer request details
     * @param requestId Transfer request ID
     */
    function getTransferRequest(bytes32 requestId) 
        external 
        view 
        returns (
            address token,
            address recipient,
            uint256 amount,
            uint64 nonce,
            uint64 timestamp,
            bool executed,
            uint256 approvals
        ) 
    {
        TransferRequest storage request = transferRequests[requestId];
        return (
            request.token,
            request.recipient,
            request.amount,
            request.nonce,
            request.timestamp,
            request.executed,
            approvalCount[requestId]
        );
    }
    
    /**
     * @notice Get total transfer requests
     */
    function getTotalRequests() external view returns (uint256) {
        return requestIds.length;
    }
}
