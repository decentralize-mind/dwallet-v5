// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../SecurityGated.sol";

/**
 * @title CrossChainMessenger
 * @notice Cross-chain message bus with pause gating via Layer 7.
 */
contract CrossChainMessenger is AccessControl, Pausable, ReentrancyGuard, SecurityGated {
    bytes32 public constant GUARDIAN_ROLE  = keccak256("GUARDIAN_ROLE");
    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");
    bytes32 public constant RELAYER_ROLE   = keccak256("RELAYER_ROLE");

    // ─── Message State ────────────────────────────────────────────────────────
    enum MessageStatus { Pending, Executed, Expired, Vetoed }

    struct Message {
        uint256     srcChainId;
        address     srcContract;
        address     destContract;
        bytes       payload;
        uint256     receivedAt;
        uint256     executeAfter;
        MessageStatus status;
        uint256     nonce;
    }

    // ─── State ────────────────────────────────────────────────────────────────
    mapping(bytes32 => Message) public messages;
    mapping(uint256 => mapping(uint256 => bool)) public usedNonces;
    mapping(uint256 => address) public trustedRemotes;
    mapping(uint256 => uint256) public dailyCount;
    mapping(uint256 => uint256) public dailyCountPerChain;
    mapping(uint256 => uint256) public dailyWindowStart;

    uint256 public executionDelay;
    uint256 public messageExpiry;
    uint256 public dailyCap;

    address public bridgeProvider;
    address public pendingProvider;
    uint256 public providerSwitchTime;
    uint256 public constant PROVIDER_SWITCH_DELAY = 7 days;

    // ─── Events ───────────────────────────────────────────────────────────────
    event MessageReceived(bytes32 indexed messageId, uint256 srcChainId, uint256 nonce);
    event MessageExecuted(bytes32 indexed messageId, bool success);
    event MessageExpired(bytes32 indexed messageId);
    event MessageVetoed(bytes32 indexed messageId, address vetoer);
    event TrustedRemoteSet(uint256 chainId, address remote);
    event ProviderChangeInitiated(address newProvider, uint256 executeAfter);
    event ProviderChanged(address oldProvider, address newProvider);

    constructor(
        address admin,
        address guardian,
        address relayer,
        address _bridgeProvider,
        uint256 _executionDelay,
        uint256 _messageExpiry,
        uint256 _dailyCap,
        address _securityController
    ) SecurityGated(_securityController) {
        require(admin           != address(0), "Messenger: zero admin");
        require(_bridgeProvider != address(0), "Messenger: zero provider");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(GUARDIAN_ROLE,      guardian);
        _grantRole(RELAYER_ROLE,       relayer);

        bridgeProvider  = _bridgeProvider;
        executionDelay  = _executionDelay;
        messageExpiry   = _messageExpiry;
        dailyCap        = _dailyCap;
    }

    // ─── Inbound Message Handling ─────────────────────────────────────────────
    /**
     * @notice Receive an inbound cross-chain message.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function receiveMessage(
        uint256 srcChainId,
        address srcContract,
        address destContract,
        bytes   calldata payload,
        uint256 nonce
    ) external onlyRole(RELAYER_ROLE) whenNotPaused whenProtocolNotPaused returns (bytes32 messageId) {
        require(trustedRemotes[srcChainId] == srcContract, "Messenger: untrusted remote");
        require(!usedNonces[srcChainId][nonce], "Messenger: nonce already used");
        usedNonces[srcChainId][nonce] = true;

        uint256 today = block.timestamp / 1 days;
        dailyCount[today]++;
        require(dailyCount[today] <= dailyCap, "Messenger: daily cap exceeded");

        messageId = keccak256(abi.encodePacked(srcChainId, srcContract, nonce, block.timestamp));

        messages[messageId] = Message({
            srcChainId:   srcChainId,
            srcContract:  srcContract,
            destContract: destContract,
            payload:      payload,
            receivedAt:   block.timestamp,
            executeAfter: block.timestamp + executionDelay,
            status:       MessageStatus.Pending,
            nonce:        nonce
        });

        emit MessageReceived(messageId, srcChainId, nonce);
    }

    // ─── Execution ────────────────────────────────────────────────────────────
    /**
     * @notice Execute a queued message after its delay has elapsed.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function executeMessage(bytes32 messageId) external nonReentrant whenNotPaused whenProtocolNotPaused {
        Message storage msg_ = messages[messageId];
        require(msg_.status      == MessageStatus.Pending,        "Messenger: not pending");
        require(block.timestamp  >= msg_.executeAfter,            "Messenger: delay not elapsed");

        if (block.timestamp > msg_.receivedAt + messageExpiry) {
            msg_.status = MessageStatus.Expired;
            emit MessageExpired(messageId);
            return;
        }

        msg_.status = MessageStatus.Executed;

        (bool success, ) = msg_.destContract.call(msg_.payload);
        emit MessageExecuted(messageId, success);
    }

    // ─── Veto ─────────────────────────────────────────────────────────────────
    function vetoMessage(bytes32 messageId) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        Message storage msg_ = messages[messageId];
        require(msg_.status == MessageStatus.Pending, "Messenger: not pending");
        msg_.status = MessageStatus.Vetoed;
        emit MessageVetoed(messageId, msg.sender);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function setTrustedRemote(uint256 chainId, address remote) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(remote != address(0), "Messenger: zero remote");
        trustedRemotes[chainId] = remote;
        emit TrustedRemoteSet(chainId, remote);
    }

    function setExecutionDelay(uint256 delay) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        executionDelay = delay;
    }

    function setMessageExpiry(uint256 expiry) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        messageExpiry = expiry;
    }

    function setDailyCap(uint256 cap) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        dailyCap = cap;
    }

    function initiateProviderChange(address newProvider) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(newProvider != address(0), "Messenger: zero provider");
        pendingProvider    = newProvider;
        providerSwitchTime = block.timestamp + PROVIDER_SWITCH_DELAY;
        emit ProviderChangeInitiated(newProvider, providerSwitchTime);
    }

    function finalizeProviderChange() external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(pendingProvider != address(0),              "Messenger: no pending provider");
        require(block.timestamp >= providerSwitchTime,     "Messenger: switch delay not elapsed");
        address old     = bridgeProvider;
        bridgeProvider  = pendingProvider;
        pendingProvider = address(0);
        emit ProviderChanged(old, bridgeProvider);
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }
}
