// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  Layer8Bridge
 * @notice Lock-and-Mint Bridge (#18)
 *         Source chain: locks ERC-20 tokens in this vault.
 *         Destination chain: BridgedToken contract mints wrapped tokens.
 *
 *         Message flow (LayerZero pattern):
 *           User → lockAndSend()  →  [LayerZero/Axelar relayer]
 *                                 →  BridgedToken.lzReceive() / axelarExecute()
 *                                 →  mint() to recipient
 *
 *         On return:
 *           User → BridgedToken.burnAndSend()
 *                                 →  Layer8Bridge.release() on source chain
 */

import "./ILayerZeroEndpoint.sol";
import "./IAxelarInterfaces.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../SecurityGated.sol";

contract Layer8Bridge is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    bytes32 public constant LAYER_ID      = keccak256("LAYER_8_HUB_SPOKE");
    bytes32 public constant BRIDGE_ACTION = keccak256("BRIDGE_ACTION");

    // ── Configuration ─────────────────────────────────────────────────────────
    uint256 public highValueThreshold = 10_000 * 1e18; // 10k token threshold

    // ── Errors ────────────────────────────────────────────────────────────────
    error ZeroAmount();
    error ZeroAddress();
    error UnsupportedToken();
    error UnsupportedChain();
    error InvalidSource();
    error InsufficientFee();
    error AlreadyProcessed();

    // ── Events ────────────────────────────────────────────────────────────────
    event TokensLocked(
        address indexed token,
        address indexed sender,
        bytes   recipient,       // encoded dest address
        uint256 amount,
        uint16  dstChainId,
        uint64  nonce
    );
    event TokensReleased(
        address indexed token,
        address indexed recipient,
        uint256 amount,
        bytes32 indexed messageId
    );
    event TrustedRemoteSet(uint16 chainId, bytes remotePath);
    event TokenMappingSet(address local, uint16 remoteChainId, bytes32 remoteToken);
    event ThresholdUpdated(uint256 newThreshold);

    // ── Messaging adapters ────────────────────────────────────────────────────
    ILayerZeroEndpoint public immutable lzEndpoint;
    IAxelarGateway     public immutable axelarGateway;
    IAxelarGasService  public immutable axelarGasService;

    // ── State ─────────────────────────────────────────────────────────────────
    mapping(uint16 => uint64) public outboundNonce;
    mapping(bytes32 => bool) public processedMessages;
    mapping(address => uint256) public lockedBalance;
    mapping(uint16 => bytes) public trustedRemotes;
    mapping(address => mapping(uint16 => bytes32)) public tokenMapping;
    mapping(address => bool) public supportedTokens;

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address _lzEndpoint,
        address _axelarGateway,
        address _axelarGasService,
        address _admin,
        address _governor,
        address _guardian,
        address _securityController,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    ) SecurityGated(_securityController) {
        if (_lzEndpoint      == address(0)) revert ZeroAddress();
        if (_axelarGateway   == address(0)) revert ZeroAddress();
        if (_axelarGasService == address(0)) revert ZeroAddress();

        lzEndpoint       = ILayerZeroEndpoint(_lzEndpoint);
        axelarGateway    = IAxelarGateway(_axelarGateway);
        axelarGasService = IAxelarGasService(_axelarGasService);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);
        _grantRole(GUARDIAN_ROLE,      _guardian);

        _initSecurityModules(_access, _time, _state, _rate, _verify);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function addSupportedToken(address token) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        if (token == address(0)) revert ZeroAddress();
        supportedTokens[token] = true;
    }

    function removeSupportedToken(address token) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
    {
        supportedTokens[token] = false;
    }

    function setTrustedRemote(uint16 remoteChainId, bytes calldata path) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
    {
        trustedRemotes[remoteChainId] = path;
        emit TrustedRemoteSet(remoteChainId, path);
    }

    function setTokenMapping(
        address  localToken,
        uint16   remoteChainId,
        bytes32  remoteToken
    ) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
    {
        tokenMapping[localToken][remoteChainId] = remoteToken;
        emit TokenMappingSet(localToken, remoteChainId, remoteToken);
    }

    function setHighValueThreshold(uint256 threshold) external onlyRole(GOVERNOR_ROLE) {
        highValueThreshold = threshold;
        emit ThresholdUpdated(threshold);
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }

    // ── Internal State ───────────────────────────────────────────────────────
    struct PendingRelease {
        address token;
        address recipient;
        uint256 amount;
        bool    processed;
    }
    mapping(bytes32 => PendingRelease) public pendingReleases;

    event ReleaseQueued(bytes32 indexed messageId, address indexed token, uint256 amount);

    // ── Core: Lock & Send (source chain) ─────────────────────────────────────

    function lockAndSendLZ(
        address token,
        uint256 amount,
        uint16  dstChainId,
        bytes   calldata recipient,
        bytes   calldata adapterParams
    ) 
        external 
        payable 
        nonReentrant 
        whenProtocolNotPaused
        withStateGuard(LAYER_ID)
        withRateLimit(BRIDGE_ACTION, amount)
    {
        if (amount == 0)                  revert ZeroAmount();
        if (!supportedTokens[token])      revert UnsupportedToken();
        bytes memory remote = trustedRemotes[dstChainId];
        if (remote.length == 0)           revert UnsupportedChain();

        // Pull tokens from sender
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        lockedBalance[token] += amount;

        uint64 nonce = ++outboundNonce[dstChainId];

        // Encode mint payload: (token, recipient, amount, nonce)
        bytes memory payload = abi.encode(
            tokenMapping[token][dstChainId],
            recipient,
            amount,
            nonce
        );

        // Estimate fee and validate
        (uint256 fee, ) = lzEndpoint.estimateFees(dstChainId, address(this), payload, false, adapterParams);
        if (msg.value < fee) revert InsufficientFee();

        lzEndpoint.send{value: msg.value}(
            dstChainId,
            remote,
            payload,
            payable(msg.sender),
            address(0),
            adapterParams
        );

        emit TokensLocked(token, msg.sender, recipient, amount, dstChainId, nonce);
    }

    function lockAndSendAxelar(
        address token,
        uint256 amount,
        string  calldata destinationChain,
        string  calldata destinationAddress,
        string  calldata recipient
    ) 
        external 
        payable 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withRateLimit(BRIDGE_ACTION, amount)
    {
        if (amount == 0)             revert ZeroAmount();
        if (!supportedTokens[token]) revert UnsupportedToken();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        lockedBalance[token] += amount;

        bytes memory payload = abi.encode(token, recipient, amount);

        // Pay Axelar gas
        axelarGasService.payNativeGasForContractCall{value: msg.value}(
            address(this),
            destinationChain,
            destinationAddress,
            payload,
            msg.sender
        );

        axelarGateway.callContract(destinationChain, destinationAddress, payload);

        emit TokensLocked(token, msg.sender, bytes(recipient), amount, 0, 0);
    }

    // ── Core: Release (source chain, called by relayer) ───────────────────────

    /**
     * @notice LayerZero receive handler — called by the LZ endpoint on the
     *         SOURCE chain when a burn-and-return message arrives.
     */
    function lzReceive(
        uint16          srcChainId,
        bytes calldata  srcAddress,
        uint64          /*nonce*/,
        bytes calldata  payload
    ) external {
        if (msg.sender != address(lzEndpoint)) revert InvalidSource();
        bytes memory trusted = trustedRemotes[srcChainId];
        if (keccak256(srcAddress) != keccak256(trusted))  revert InvalidSource();

        _processReleasePayload(payload);
    }

    /**
     * @notice Axelar execute handler — called by the Axelar gateway on the
     *         SOURCE chain when a burn-and-return message arrives.
     */
    function execute(
        bytes32        commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata  payload
    ) external {
        bytes32 payloadHash = keccak256(payload);
        if (!axelarGateway.validateContractCall(commandId, sourceChain, sourceAddress, payloadHash))
            revert InvalidSource();
        _processReleasePayload(payload);
    }

    function _processReleasePayload(bytes calldata payload) internal {
        (address token, address recipient, uint256 amount, bytes32 messageId) =
            abi.decode(payload, (address, address, uint256, bytes32));

        if (processedMessages[messageId]) revert AlreadyProcessed();

        if (amount >= highValueThreshold) {
            pendingReleases[messageId] = PendingRelease({
                token:     token,
                recipient: recipient,
                amount:    amount,
                processed: false
            });
            emit ReleaseQueued(messageId, token, amount);
            // DO NOT process yet — wait for confirmRelease
        } else {
            _release(token, recipient, amount, messageId);
        }
    }

    /**
     * @notice Confirm a high-value release with a Security Committee signature.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Verification: withSignature(hash, signature)
     */
    function confirmRelease(
        bytes32 messageId,
        bytes32 hash,
        bytes calldata signature
    ) 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withSignature(hash, signature)
    {
        PendingRelease storage pr = pendingReleases[messageId];
        require(pr.token != address(0), "Bridge: not found");
        require(!pr.processed,          "Bridge: already done");

        pr.processed = true;
        _release(pr.token, pr.recipient, pr.amount, messageId);
    }

    function _release(address token, address recipient, uint256 amount, bytes32 messageId) internal {
        if (processedMessages[messageId]) revert AlreadyProcessed();
        processedMessages[messageId] = true;

        lockedBalance[token] -= amount;
        IERC20(token).safeTransfer(recipient, amount);

        emit TokensReleased(token, recipient, amount, messageId);
    }

    // ── Fee estimation helper ─────────────────────────────────────────────────

    function estimateLZFee(
        uint16         dstChainId,
        bytes calldata payload,
        bytes calldata adapterParams
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        return lzEndpoint.estimateFees(dstChainId, address(this), payload, false, adapterParams);
    }

    receive() external payable {}
}
