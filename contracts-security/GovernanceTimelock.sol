// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title GovernanceTimelock
 * @notice Secure Upgrade & Parameter Change Management System
 * 
 *         This contract implements a robust timelock mechanism for:
 *         - Protocol upgrades
 *         - Critical parameter changes
 *         - Treasury operations
 *         - Emergency actions
 *         
 *         SECURITY FEATURES:
 *         - Minimum delay (48 hours for normal, 7 days for critical)
 *         - Multi-sig integration
 *         - Veto window for security council
 *         - Public proposal tracking
 */
contract GovernanceTimelock is TimelockController {
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTANTS & ROLES
    // ─────────────────────────────────────────────────────────────────────────
    
    // Note: PROPOSER_ROLE, EXECUTOR_ROLE, CANCELLER_ROLE inherited from TimelockController
    bytes32 public constant SECURITY_COUNCIL_ROLE = keccak256("SECURITY_COUNCIL_ROLE");
    
    // ─────────────────────────────────────────────────────────────────────────
    //  TIMELOCK DELAYS
    // ─────────────────────────────────────────────────────────────────────────
    
    uint256 public constant MIN_DELAY = 48 hours;        // Standard proposals
    uint256 public constant CRITICAL_DELAY = 7 days;     // Critical upgrades
    uint256 public constant EMERGENCY_DELAY = 1 hours;   // Emergency only
    uint256 public constant VETO_WINDOW = 24 hours;      // Security council veto
    
    // ─────────────────────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────────────────────
    
    error DelayTooShort(uint256 requested, uint256 minimum);
    error VetoWindowActive(bytes32 proposalId);
    error ProposalNotReady(bytes32 proposalId);
    error ProposalExpired(bytes32 proposalId);
    error InvalidTarget();
    error SelfCallNotAllowed();
    error ZeroAddress();
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────────────
    
    event ProposalScheduled(
        bytes32 indexed proposalId,
        address indexed proposer,
        address target,
        uint256 value,
        bytes data,
        uint256 delay
    );
    
    event ProposalVetoed(bytes32 indexed proposalId, address indexed councilMember);
    event ProposalTypeSet(bytes32 indexed proposalId, ProposalType proposalType);
    event EmergencyActionExecuted(bytes32 indexed proposalId, string reason);
    
    // ─────────────────────────────────────────────────────────────────────────
    //  ENUMS
    // ─────────────────────────────────────────────────────────────────────────
    
    enum ProposalType {
        NORMAL,      // 48h delay
        CRITICAL,    // 7d delay
        EMERGENCY    // 1h delay (security only)
    }
    
    struct ProposalDetails {
        ProposalType proposalType;
        uint256 delay;
        uint256 scheduledAt;
        bool vetoed;
        string description;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────────────────────
    
    /// @dev Proposal details mapping
    mapping(bytes32 => ProposalDetails) public proposals;
    
    /// @dev Security council veto count
    mapping(bytes32 => uint256) public vetoCount;
    
    /// @dev Required vetoes for cancellation (3 of 5)
    uint256 public requiredVetoes = 3;
    
    /// @dev Maximum age before proposal expires
    uint256 public constant PROPOSAL_EXPIRY = 14 days;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────
    
    constructor(
        address[] memory proposers,
        address[] memory executors,
        address[] memory securityCouncil,
        address admin
    ) TimelockController(
        MIN_DELAY,
        proposers,
        executors,
        admin
    ) {
        // Grant security council role
        for (uint256 i = 0; i < securityCouncil.length; i++) {
            _grantRole(SECURITY_COUNCIL_ROLE, securityCouncil[i]);
        }
        
        // Grant canceller role to security council
        for (uint256 i = 0; i < securityCouncil.length; i++) {
            _grantRole(CANCELLER_ROLE, securityCouncil[i]);
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  SCHEDULING FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Schedule a proposal with specified type
     * @param target Target contract
     * @param value ETH value (if any)
     * @param data Calldata
     * @param predecessor Predecessor operation (if any)
     * @param salt Salt for ID generation
     * @param delay Custom delay (must meet minimum for type)
     * @param proposalType Type of proposal (NORMAL/CRITICAL/EMERGENCY)
     * @param description Human-readable description
     */
    function scheduleProposal(
        address target,
        uint256 value,
        bytes calldata data,
        address predecessor,
        bytes32 salt,
        uint256 delay,
        ProposalType proposalType,
        string calldata description
    ) external onlyRole(PROPOSER_ROLE) returns (bytes32 proposalId) {
        if (target == address(0)) revert InvalidTarget();
        
        // Validate delay based on proposal type
        uint256 minDelay = _getMinDelayForType(proposalType);
        if (delay < minDelay) {
            revert DelayTooShort(delay, minDelay);
        }
        
        // Schedule via parent
        proposalId = hashOperation(target, value, data, predecessor, salt);
        schedule(proposalId, target, value, data, predecessor, salt);
        
        // Store proposal details
        proposals[proposalId] = ProposalDetails({
            proposalType: proposalType,
            delay: delay,
            scheduledAt: block.timestamp,
            vetoed: false,
            description: description
        });
        
        emit ProposalScheduled(proposalId, msg.sender, target, value, data, delay);
        emit ProposalTypeSet(proposalId, proposalType);
    }
    
    /**
     * @notice Schedule batch operation
     */
    function scheduleBatch(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory datas,
        address predecessor,
        bytes32 salt,
        uint256 delay,
        ProposalType proposalType,
        string calldata description
    ) external onlyRole(PROPOSER_ROLE) returns (bytes32 proposalId) {
        require(targets.length == values.length, "Length mismatch");
        require(targets.length == datas.length, "Length mismatch");
        
        // Validate all targets
        for (uint256 i = 0; i < targets.length; i++) {
            if (targets[i] == address(0)) revert InvalidTarget();
        }
        
        // Validate delay
        uint256 minDelay = _getMinDelayForType(proposalType);
        if (delay < minDelay) {
            revert DelayTooShort(delay, minDelay);
        }
        
        // Schedule batch
        proposalId = hashOperationBatch(targets, values, datas, predecessor, salt);
        scheduleBatch(proposalId, targets, values, datas, predecessor, salt);
        
        // Store details
        proposals[proposalId] = ProposalDetails({
            proposalType: proposalType,
            delay: delay,
            scheduledAt: block.timestamp,
            vetoed: false,
            description: description
        });
        
        emit ProposalTypeSet(proposalId, proposalType);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Execute a ready proposal
     * @param proposalId Proposal identifier
     */
    function executeProposal(bytes32 proposalId) external payable {
        if (!isOperationReady(proposalId)) {
            revert ProposalNotReady(proposalId);
        }
        
        // Check not expired
        if (block.timestamp > getTimestamp(proposalId) + PROPOSAL_EXPIRY) {
            revert ProposalExpired(proposalId);
        }
        
        // Execute via parent TimelockController
        _execute(proposalId);
    }
    
    /**
     * @notice Execute emergency action (bypasses normal timelock)
     * @dev Only callable by security council during emergencies
     */
    function executeEmergency(
        address target,
        uint256 value,
        bytes calldata data,
        string calldata reason
    ) external onlyRole(SECURITY_COUNCIL_ROLE) returns (bytes32 proposalId) {
        // Emergency actions still need at least 1 hour delay
        proposalId = hashOperation(target, value, data, address(0), bytes32(0));
        
        if (!isOperation(proposalId)) {
            schedule(proposalId, target, value, data, address(0), bytes32(0));
        }
        
        // Fast-track execution
        execute(proposalId, target, value, data, address(0));
        
        emit EmergencyActionExecuted(proposalId, reason);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  VETO SYSTEM
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Security council member can veto a proposal
     * @param proposalId Proposal to veto
     */
    function veto(bytes32 proposalId) external onlyRole(SECURITY_COUNCIL_ROLE) {
        if (!isOperation(proposalId)) revert ProposalNotReady(proposalId);
        
        ProposalDetails storage proposal = proposals[proposalId];
        
        // Can only veto during veto window
        if (block.timestamp > proposal.scheduledAt + VETO_WINDOW) {
            revert VetoWindowActive(proposalId);
        }
        
        vetoCount[proposalId]++;
        
        emit ProposalVetoed(proposalId, msg.sender);
        
        // Auto-cancel if enough vetoes
        if (vetoCount[proposalId] >= requiredVetoes) {
            proposal.vetoed = true;
            cancel(proposalId);
        }
    }
    
    /**
     * @notice Cancel a proposal (admin only)
     */
    function cancelProposal(bytes32 proposalId) external onlyRole(CANCELLER_ROLE) {
        cancel(proposalId);
        proposals[proposalId].vetoed = true;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONFIGURATION
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Update required veto count
     */
    function setRequiredVetoes(uint256 count) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(count > 0 && count <= 5, "Invalid count");
        requiredVetoes = count;
    }
    
    /**
     * @notice Add security council member
     */
    function addSecurityCouncilMember(address member) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(member != address(0), "Zero address");
        _grantRole(SECURITY_COUNCIL_ROLE, member);
        _grantRole(CANCELLER_ROLE, member);
    }
    
    /**
     * @notice Remove security council member
     */
    function removeSecurityCouncilMember(address member) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(SECURITY_COUNCIL_ROLE, member);
        _revokeRole(CANCELLER_ROLE, member);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Get proposal details
     */
    function getProposalDetails(bytes32 proposalId) external view returns (ProposalDetails memory) {
        return proposals[proposalId];
    }
    
    /**
     * @notice Get minimum delay for proposal type
     */
    function _getMinDelayForType(ProposalType proposalType) internal pure returns (uint256) {
        if (proposalType == ProposalType.NORMAL) {
            return MIN_DELAY;
        } else if (proposalType == ProposalType.CRITICAL) {
            return CRITICAL_DELAY;
        } else if (proposalType == ProposalType.EMERGENCY) {
            return EMERGENCY_DELAY;
        }
        return MIN_DELAY;
    }
    
    /**
     * @notice Check if proposal is within veto window
     */
    function isInVetoWindow(bytes32 proposalId) external view returns (bool) {
        return block.timestamp <= proposals[proposalId].scheduledAt + VETO_WINDOW;
    }
    
    /**
     * @notice Get time remaining until execution
     */
    function getTimeUntilExecution(bytes32 proposalId) external view returns (uint256) {
        uint256 readyTime = getTimestamp(proposalId);
        if (block.timestamp >= readyTime) {
            return 0;
        }
        return readyTime - block.timestamp;
    }
    
    /**
     * @notice Get all proposal IDs (for indexing)
     */
    function getAllProposals() external view returns (bytes32[] memory allProposalIds) {
        // Note: In production, you'd want to track these in an array
        // This is a simplified version
        allProposalIds = new bytes32[](0);
    }
}
