// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../layer7/SecurityGated.sol";

/**
 * @title EmergencyPause
 * @notice Atomic protocol-wide circuit breaker
 * @dev Guardian can pause all contracts, but only multisig can unpause
 */
contract EmergencyPause is AccessControl, Pausable, SecurityGated {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Registered contracts to pause
    mapping(address => bool) public registeredContracts;
    address[] public contractList;
    
    // Events
    event ContractRegistered(address contractAddress);
    event ContractUnregistered(address contractAddress);
    event EmergencyPauseTriggered(address indexed guardian);
    event EmergencyUnpauseTriggered(address indexed admin);
    
    modifier onlyRegisteredContracts() {
        require(registeredContracts[msg.sender], "Contract not registered");
        _;
    }
    
    constructor(address _securityController) SecurityGated(_securityController) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
    }
    
    /**
     * @notice Register a contract for emergency pause
     * @param contractAddress Contract address to register
     */
    function registerContract(address contractAddress) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(contractAddress != address(0), "Invalid address");
        require(!registeredContracts[contractAddress], "Already registered");
        
        registeredContracts[contractAddress] = true;
        contractList.push(contractAddress);
        
        emit ContractRegistered(contractAddress);
    }
    
    /**
     * @notice Unregister a contract from emergency pause
     * @param contractAddress Contract address to unregister
     */
    function unregisterContract(address contractAddress) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(registeredContracts[contractAddress], "Not registered");
        
        registeredContracts[contractAddress] = false;
        
        emit ContractUnregistered(contractAddress);
    }
    
    /**
     * @notice Trigger emergency pause (Guardian only - cannot unpause)
     */
    function pauseAll() external onlyRole(GUARDIAN_ROLE) {
        _pause();
        emit EmergencyPauseTriggered(msg.sender);
    }
    
    /**
     * @notice Unpause protocol (Admin only - requires multisig)
     */
    function unpauseAll() external onlyRole(ADMIN_ROLE) {
        _unpause();
        emit EmergencyUnpauseTriggered(msg.sender);
    }
    
    /**
     * @notice Check if protocol is paused
     */
    function isPaused() external view returns (bool) {
        return paused();
    }
    
    /**
     * @notice Get all registered contracts
     */
    function getRegisteredContracts() external view returns (address[] memory) {
        return contractList;
    }
    
    /**
     * @notice Get total registered contracts count
     */
    function getRegisteredCount() external view returns (uint256) {
        return contractList.length;
    }
    
    /**
     * @notice Modifier to check if protocol is not paused
     */
    modifier whenNotPausedCustom() {
        require(!paused(), "Protocol is paused");
        _;
    }
}
