// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  BridgedToken
 * @notice Wrapped ERC-20 that lives on the DESTINATION chain.
 *         • Minted when the relayer delivers a lock message from the source chain.
 *         • Burned by the user to trigger a release on the source chain.
 *
 *         Supports both LayerZero and Axelar delivery paths.
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../SecurityGated.sol";

contract BridgedToken is ERC20, AccessControl, Pausable, ReentrancyGuard, SecurityGated {

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    bytes32 public constant LAYER_ID      = keccak256("LAYER_8_HUB_SPOKE");
    bytes32 public constant MINT_ACTION   = keccak256("MINT_ACTION");

    // ── Errors ────────────────────────────────────────────────────────────────
    error ZeroAmount();
    error ZeroAddress();
    error InvalidSource();
    error AlreadyProcessed();
    error InsufficientFee();
    error UnsupportedChain();

    // ── Events ────────────────────────────────────────────────────────────────
    event Minted(address indexed recipient, uint256 amount, bytes32 messageId);
    event BurnedAndSent(
        address indexed burner,
        bytes   recipient,
        uint256 amount,
        uint16  dstChainId
    );

    // ── Adapters ──────────────────────────────────────────────────────────────
    ILayerZeroEndpoint public immutable lzEndpoint;
    IAxelarGateway     public immutable axelarGateway;
    IAxelarGasService  public immutable axelarGasService;

    // ── State ─────────────────────────────────────────────────────────────────
    uint8 private immutable _decimals;
    mapping(uint16 => bytes) public trustedRemotes;
    mapping(bytes32 => bool) public processedMessages;

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        string memory name_,
        string memory symbol_,
        uint8         decimals_,
        address       _lzEndpoint,
        address       _axelarGateway,
        address       _axelarGasService,
        address       _admin,
        address       _governor,
        address       _guardian,
        address       _securityController,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    )
        ERC20(name_, symbol_)
        SecurityGated(_securityController)
    {
        _decimals        = decimals_;
        lzEndpoint       = ILayerZeroEndpoint(_lzEndpoint);
        axelarGateway    = IAxelarGateway(_axelarGateway);
        axelarGasService = IAxelarGasService(_axelarGasService);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);
        _grantRole(GUARDIAN_ROLE,      _guardian);

        _initSecurityModules(_access, _time, _state, _rate, _verify);
    }

    function decimals() public view override returns (uint8) { return _decimals; }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setTrustedRemote(uint16 chainId, bytes calldata path) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
    {
        trustedRemotes[chainId] = path;
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }

    // ── Mint: called by LZ endpoint on destination chain ─────────────────────

    /**
     * @notice LayerZero receive — mints bridged tokens to the recipient.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function lzReceive(
        uint16         srcChainId,
        bytes calldata srcAddress,
        uint64         /*nonce*/,
        bytes calldata payload
    ) external whenProtocolNotPaused withStateGuard(LAYER_ID) {
        if (msg.sender != address(lzEndpoint)) revert InvalidSource();
        if (keccak256(srcAddress) != keccak256(trustedRemotes[srcChainId]))
            revert InvalidSource();

        _mintFromPayload(payload);
    }

    /**
     * @notice Axelar execute — mints bridged tokens to the recipient.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function execute(
        bytes32        commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata  payload
    ) external whenProtocolNotPaused withStateGuard(LAYER_ID) {
        bytes32 payloadHash = keccak256(payload);
        if (!axelarGateway.validateContractCall(commandId, sourceChain, sourceAddress, payloadHash))
            revert InvalidSource();
        _mintFromPayload(payload);
    }

    function _mintFromPayload(bytes calldata payload) internal {
        // payload: (remoteToken bytes32, recipient bytes, amount uint256, nonce uint64)
        (, bytes memory recipientBytes, uint256 amount, uint64 nonce) =
            abi.decode(payload, (bytes32, bytes, uint256, uint64));

        bytes32 messageId = keccak256(abi.encodePacked(recipientBytes, amount, nonce));
        if (processedMessages[messageId]) revert AlreadyProcessed();
        processedMessages[messageId] = true;

        address recipient = abi.decode(recipientBytes, (address));
        _mint(recipient, amount);

        emit Minted(recipient, amount, messageId);
    }

    // ── Burn & Send: triggers release on source chain ─────────────────────────

    /**
     * @notice Burn wrapped tokens and send a release message back to the source
     *         chain via LayerZero.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function burnAndSendViaLZ(
        uint256 amount,
        uint16  dstChainId,
        bytes calldata recipient,
        bytes calldata adapterParams
    ) 
        external 
        payable 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        if (amount == 0) revert ZeroAmount();
        bytes memory remote = trustedRemotes[dstChainId];
        if (remote.length == 0) revert UnsupportedChain();

        _burn(msg.sender, amount);

        bytes32 messageId = keccak256(abi.encodePacked(msg.sender, amount, block.timestamp));
        bytes memory payload = abi.encode(address(this), recipient, amount, messageId);

        (uint256 fee,) = lzEndpoint.estimateFees(dstChainId, address(this), payload, false, adapterParams);
        if (msg.value < fee) revert InsufficientFee();

        lzEndpoint.send{value: msg.value}(
            dstChainId,
            remote,
            payload,
            payable(msg.sender),
            address(0),
            adapterParams
        );

        emit BurnedAndSent(msg.sender, recipient, amount, dstChainId);
    }

    /**
     * @notice Burn wrapped tokens and send a release message back via Axelar.
     */
    function burnAndSendViaAxelar(
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
    {
        if (amount == 0) revert ZeroAmount();
        _burn(msg.sender, amount);

        bytes32 messageId = keccak256(abi.encodePacked(msg.sender, amount, block.timestamp));
        bytes memory payload = abi.encode(address(this), recipient, amount, messageId);

        axelarGasService.payNativeGasForContractCall{value: msg.value}(
            address(this),
            destinationChain,
            destinationAddress,
            payload,
            msg.sender
        );
        axelarGateway.callContract(destinationChain, destinationAddress, payload);

        emit BurnedAndSent(msg.sender, bytes(recipient), amount, 0);
    }

    receive() external payable {}
}

    receive() external payable {}
}
