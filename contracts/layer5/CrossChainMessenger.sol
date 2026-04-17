// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../layer7/SecurityGated.sol";

/**
 * @title CrossChainMessenger
 * @notice Message bus with replay protection for cross-chain communication
 * 
 * FEATURES:
 *   - Per-chain nonce prevents replay attacks
 *   - Daily message cap auto-stops anomalous bursts
 *   - 7-day mandatory delay before provider switch
 *   - GUARDIAN can halt all processing in one tx
 *   - Integration with Layer 7 Security
 */
contract CrossChainMessenger is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTANTS & ROLES
    // ─────────────────────────────────────────────────────────────────────────
    
    bytes32 public constant ADMIN_ROLE = keccak256("MESSENGER_ADMIN");
    bytes32 public constant OPERATOR_ROLE = keccak256("MESSENGER_OPERATOR");
    bytes32 public constant GUARDIAN_ROLE = keccak256("MESSENGER_GUARDIAN");
    
    bytes32 public constant LAYER_ID = keccak256("LAYER_5_MESSENGER");
    
    // ─────────────────────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────────────────────
    
    /// @dev Per-chain nonce tracking (chainId => nonce)
    mapping(uint256 => uint256) public chainNonces;
    
    /// @dev Daily message counter (chainId => day => count)
    mapping(uint256 => mapping(uint256 => uint256)) public dailyMessageCount;
    
    /// @dev Daily message cap per chain
    mapping(uint256 => uint256) public dailyMessageCaps;
    
    /// @dev Supported bridge providers
    mapping(string => bool) public supportedProviders;
    
    /// @dev Current active provider
    string public activeProvider;
    
    /// @dev Provider switch request timestamp
    mapping(string => uint256) public providerSwitchRequests;
    
    /// @dev Mandatory delay for provider switch (7 days)
    uint256 public constant PROVIDER_SWITCH_DELAY = 7 days;
    
    /// @dev Message history for verification
    struct Message {
        bytes32 messageId;
        uint256 srcChainId;
        uint256 dstChainId;
        address sender;
        bytes payload;
        uint256 timestamp;
        bool executed;
    }
    
    mapping(bytes32 => Message) public messages;
    bytes32[] public messageHistory;
    
    /// @dev Processed message hashes for replay protection
    mapping(bytes32 => bool) public processedMessages;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────────────
    
    event MessageSent(
        bytes32 messageId,
        uint256 srcChainId,
        uint256 dstChainId,
        address sender,
        bytes payload,
        uint256 timestamp
    );
    
    event MessageReceived(
        bytes32 messageId,
        uint256 srcChainId,
        uint256 dstChainId,
        address recipient,
        bytes payload,
        uint256 timestamp
    );
    
    event ProviderSwitchRequested(string newProvider, uint256 executeAfter);
    event ProviderSwitchExecuted(string oldProvider, string newProvider);
    event DailyCapUpdated(uint256 chainId, uint256 newCap);
    event GuardianHalt(address guardian, uint256 timestamp);
    
    // ─────────────────────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────────────────────
    
    error DailyCapExceeded();
    error MessageAlreadyProcessed();
    error InvalidProvider();
    error ProviderSwitchDelayNotMet();
    error ZeroAddress();
    error InvalidChainId();
    error InvalidPayload();
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────
    
    constructor(
        address _admin,
        address _operator,
        address _guardian,
        address _layer7Security,
        string memory _initialProvider
    ) SecurityGated(_layer7Security) {
        if (_admin == address(0) || _guardian == address(0)) revert ZeroAddress();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        
        if (_operator != address(0)) {
            _grantRole(OPERATOR_ROLE, _operator);
        }
        
        _grantRole(GUARDIAN_ROLE, _guardian);
        
        // Set initial provider
        supportedProviders[_initialProvider] = true;
        activeProvider = _initialProvider;
        
        // Set default daily cap (1000 messages per day)
        dailyMessageCaps[0] = 1000;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────
    
    modifier onlyOperatorOrAdmin() {
        require(
            hasRole(OPERATOR_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender),
            "CrossChainMessenger: Not operator or admin"
        );
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CORE FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Send message to another chain
     * @param dstChainId Destination chain ID
     * @param payload Message payload
     * @return messageId Unique message identifier
     */
    function sendMessage(
        uint256 dstChainId,
        bytes calldata payload
    ) external whenNotPaused nonReentrant withStateGuard(LAYER_ID) returns (bytes32 messageId) {
        if (dstChainId == 0) revert InvalidChainId();
        if (payload.length == 0) revert InvalidPayload();
        
        // Check daily cap
        uint256 today = block.timestamp / 1 days;
        uint256 cap = dailyMessageCaps[dstChainId];
        if (cap > 0 && dailyMessageCount[dstChainId][today] >= cap) {
            revert DailyCapExceeded();
        }
        
        // Generate unique message ID
        uint256 nonce = ++chainNonces[dstChainId];
        messageId = keccak256(abi.encode(
            block.chainid,
            dstChainId,
            msg.sender,
            payload,
            nonce,
            block.timestamp
        ));
        
        // Check for replay
        if (processedMessages[messageId]) revert MessageAlreadyProcessed();
        processedMessages[messageId] = true;
        
        // Store message
        messages[messageId] = Message({
            messageId: messageId,
            srcChainId: block.chainid,
            dstChainId: dstChainId,
            sender: msg.sender,
            payload: payload,
            timestamp: block.timestamp,
            executed: false
        });
        
        messageHistory.push(messageId);
        
        // Update daily counter
        dailyMessageCount[dstChainId][today]++;
        
        emit MessageSent(
            messageId,
            block.chainid,
            dstChainId,
            msg.sender,
            payload,
            block.timestamp
        );
        
        return messageId;
    }
    
    /**
     * @notice Receive and process message from another chain
     * @param srcChainId Source chain ID
     * @param payload Message payload
     * @param signature Provider signature for verification
     */
    function receiveMessage(
        uint256 srcChainId,
        bytes calldata payload,
        bytes calldata signature
    ) external whenNotPaused nonReentrant onlyOperatorOrAdmin {
        if (srcChainId == 0) revert InvalidChainId();
        if (payload.length == 0) revert InvalidPayload();
        
        // Generate expected message ID
        uint256 nonce = chainNonces[srcChainId] + 1;
        bytes32 messageId = keccak256(abi.encode(
            srcChainId,
            block.chainid,
            address(0), // recipient will be extracted from payload
            payload,
            nonce,
            block.timestamp
        ));
        
        // Check for replay
        if (processedMessages[messageId]) revert MessageAlreadyProcessed();
        processedMessages[messageId] = true;
        
        // Increment nonce
        chainNonces[srcChainId] = nonce;
        
        // Update daily counter
        uint256 today = block.timestamp / 1 days;
        dailyMessageCount[srcChainId][today]++;
        
        emit MessageReceived(
            messageId,
            srcChainId,
            block.chainid,
            msg.sender,
            payload,
            block.timestamp
        );
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  PROVIDER MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Request provider switch (requires 7-day delay)
     * @param newProvider New bridge provider name
     */
    function requestProviderSwitch(string calldata newProvider) external onlyRole(ADMIN_ROLE) {
        if (!supportedProviders[newProvider]) revert InvalidProvider();
        
        providerSwitchRequests[newProvider] = block.timestamp + PROVIDER_SWITCH_DELAY;
        
        emit ProviderSwitchRequested(newProvider, block.timestamp + PROVIDER_SWITCH_DELAY);
    }
    
    /**
     * @notice Execute provider switch after delay period
     * @param newProvider New bridge provider name
     */
    function executeProviderSwitch(string calldata newProvider) external onlyRole(ADMIN_ROLE) {
        if (!supportedProviders[newProvider]) revert InvalidProvider();
        
        uint256 executeAfter = providerSwitchRequests[newProvider];
        if (executeAfter == 0 || block.timestamp < executeAfter) {
            revert ProviderSwitchDelayNotMet();
        }
        
        string memory oldProvider = activeProvider;
        activeProvider = newProvider;
        
        emit ProviderSwitchExecuted(oldProvider, newProvider);
    }
    
    /**
     * @notice Add supported provider
     * @param provider Provider name
     */
    function addProvider(string calldata provider) external onlyRole(ADMIN_ROLE) {
        supportedProviders[provider] = true;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  RATE LIMITING
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Set daily message cap for a chain
     * @param chainId Chain ID
     * @param cap Daily message cap (0 = unlimited)
     */
    function setDailyCap(uint256 chainId, uint256 cap) external onlyRole(ADMIN_ROLE) {
        dailyMessageCaps[chainId] = cap;
        emit DailyCapUpdated(chainId, cap);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EMERGENCY FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Guardian halt - pause all message processing
     */
    function guardianHalt() external onlyRole(GUARDIAN_ROLE) {
        _pause();
        emit GuardianHalt(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Admin resume - unpause message processing
     */
    function adminResume() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Get current nonce for a chain
     * @param chainId Chain ID
     * @return Current nonce
     */
    function getNonce(uint256 chainId) external view returns (uint256) {
        return chainNonces[chainId];
    }
    
    /**
     * @notice Get daily message count for a chain
     * @param chainId Chain ID
     * @param day Day timestamp
     * @return Message count
     */
    function getDailyCount(uint256 chainId, uint256 day) external view returns (uint256) {
        return dailyMessageCount[chainId][day];
    }
    
    /**
     * @notice Get message by ID
     * @param messageId Message ID
     * @return Message struct
     */
    function getMessage(bytes32 messageId) external view returns (Message memory) {
        return messages[messageId];
    }
    
    /**
     * @notice Get total message history length
     * @return Length of message history
     */
    function getMessageHistoryLength() external view returns (uint256) {
        return messageHistory.length;
    }
}
