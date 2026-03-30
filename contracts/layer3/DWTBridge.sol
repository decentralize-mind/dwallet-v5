// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../SecurityGated.sol";

/**
 * @title DWTBridge
 * @notice Cross-chain bridge with pause gating via Layer 7.
 */
interface IMintableDWT {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
}

contract DWTBridge is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");

    address[] public relayers;
    mapping(address => bool) public isRelayer;
    uint256 public requiredSignatures;
    uint256 public constant EXECUTION_DELAY = 12 hours;

    struct PendingTransfer {
        uint256 srcChainId;
        uint256 srcNonce;
        address recipient;
        uint256 amount;
        uint256 submittedAt;
        bool    executed;
        uint256 signatureCount;
        mapping(address => bool) hasSigned;
    }

    mapping(bytes32 => PendingTransfer) private _pendingTransfers;

    IERC20  public immutable dwtToken;
    bool    public immutable isLockMode;

    mapping(bytes32 => bool) public completedTransfers;
    mapping(uint256 => bool) public supportedChains;

    uint256 public dailyLimit;
    uint256 public dailyUsed;
    uint256 public dailyWindowStart;

    uint256 public minTransfer;
    uint256 public maxTransfer;
    uint256 public bridgeFeeBps;
    address public feeRecipient;

    uint256 public constant BPS              = 10_000;
    uint256 public constant MAX_FEE_BPS      = 100;
    uint256 public constant DEFAULT_MIN      = 100e18;
    uint256 public constant DEFAULT_MAX      = 1_000_000e18;

    event TransferInitiated(address indexed sender, uint256 indexed destChainId, uint256 nonce, uint256 amount, uint256 fee);
    event TransferSubmitted(bytes32 indexed transferId, address indexed relayer);
    event TransferSigned(bytes32 indexed transferId, address indexed relayer, uint256 sigCount);
    event TransferCompleted(bytes32 indexed transferId, address indexed recipient, uint256 amount);
    event ChainAdded(uint256 chainId);
    event ChainRemoved(uint256 chainId);

    uint256 private _outboundNonce;

    constructor(
        address _dwtToken,
        bool    _isLockMode,
        address _securityController,
        address admin,
        address guardian,
        address[] memory _relayers,
        uint256 _requiredSignatures,
        uint256 _dailyLimit
    ) SecurityGated(_securityController) {
        require(_dwtToken    != address(0),             "Bridge: zero token");
        require(_relayers.length > 0,                   "Bridge: no relayers");
        require(_requiredSignatures > 0,                "Bridge: zero M");
        require(_requiredSignatures <= _relayers.length,"Bridge: M > N");

        dwtToken   = IERC20(_dwtToken);
        isLockMode = _isLockMode;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(GUARDIAN_ROLE,      guardian);

        for (uint256 i = 0; i < _relayers.length; i++) {
            require(_relayers[i] != address(0), "Bridge: zero relayer");
            require(!isRelayer[_relayers[i]],   "Bridge: duplicate relayer");
            isRelayer[_relayers[i]] = true;
            relayers.push(_relayers[i]);
        }
        requiredSignatures = _requiredSignatures;

        dailyLimit       = _dailyLimit;
        dailyWindowStart = block.timestamp;
        minTransfer      = DEFAULT_MIN;
        maxTransfer      = DEFAULT_MAX;
        bridgeFeeBps     = 10;
        feeRecipient     = admin;
    }

    /**
     * @notice Initiate cross-chain transfer.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function initiateTransfer(uint256 destChainId, uint256 amount)
        external nonReentrant whenNotPaused whenProtocolNotPaused
    {
        require(supportedChains[destChainId],         "Bridge: unsupported chain");
        require(amount >= minTransfer,                "Bridge: below min transfer");
        require(amount <= maxTransfer,                "Bridge: above max transfer");

        _updateDailyWindow();
        require(dailyUsed + amount <= dailyLimit,     "Bridge: daily limit exceeded");
        dailyUsed += amount;

        uint256 fee        = (amount * bridgeFeeBps) / BPS;
        uint256 netAmount  = amount - fee;

        if (isLockMode) {
            dwtToken.safeTransferFrom(msg.sender, address(this), amount);
        } else {
            dwtToken.safeTransferFrom(msg.sender, address(this), amount);
            IMintableDWT(address(dwtToken)).burn(netAmount);
        }

        if (fee > 0) dwtToken.safeTransfer(feeRecipient, fee);

        uint256 nonce = ++_outboundNonce;
        emit TransferInitiated(msg.sender, destChainId, nonce, netAmount, fee);
    }

    /**
     * @notice Submit inbound transfer.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function submitInboundTransfer(
        uint256 srcChainId,
        uint256 srcNonce,
        address recipient,
        uint256 amount
    ) external whenProtocolNotPaused {
        require(isRelayer[msg.sender], "Bridge: not relayer");

        bytes32 transferId = _transferId(srcChainId, srcNonce);
        require(!completedTransfers[transferId],       "Bridge: already completed");
        require(recipient != address(0),               "Bridge: zero recipient");
        require(amount    >= minTransfer,              "Bridge: below min");
        require(amount    <= maxTransfer,              "Bridge: above max");

        PendingTransfer storage pt = _pendingTransfers[transferId];
        if (pt.submittedAt == 0) {
            pt.srcChainId   = srcChainId;
            pt.srcNonce     = srcNonce;
            pt.recipient    = recipient;
            pt.amount       = amount;
            pt.submittedAt  = block.timestamp;
            pt.executed     = false;
            pt.signatureCount = 0;
            emit TransferSubmitted(transferId, msg.sender);
        }

        require(!pt.hasSigned[msg.sender], "Bridge: already signed");
        pt.hasSigned[msg.sender] = true;
        pt.signatureCount++;

        emit TransferSigned(transferId, msg.sender, pt.signatureCount);
    }

    /**
     * @notice Execute inbound transfer.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function executeInboundTransfer(uint256 srcChainId, uint256 srcNonce)
        external nonReentrant whenNotPaused whenProtocolNotPaused
    {
        bytes32 transferId = _transferId(srcChainId, srcNonce);
        PendingTransfer storage pt = _pendingTransfers[transferId];

        require(pt.submittedAt > 0,                               "Bridge: transfer not submitted");
        require(!pt.executed,                                     "Bridge: already executed");
        require(!completedTransfers[transferId],                  "Bridge: already completed");
        require(pt.signatureCount >= requiredSignatures,          "Bridge: insufficient signatures");
        require(block.timestamp >= pt.submittedAt + EXECUTION_DELAY, "Bridge: execution delay not elapsed");

        pt.executed = true;
        completedTransfers[transferId] = true;

        if (isLockMode) {
            dwtToken.safeTransfer(pt.recipient, pt.amount);
        } else {
            IMintableDWT(address(dwtToken)).mint(pt.recipient, pt.amount);
        }

        emit TransferCompleted(transferId, pt.recipient, pt.amount);
    }

    function _transferId(uint256 srcChainId, uint256 srcNonce) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(srcChainId, srcNonce));
    }

    function _updateDailyWindow() internal {
        if (block.timestamp >= dailyWindowStart + 1 days) {
            dailyWindowStart = block.timestamp;
            dailyUsed        = 0;
        }
    }

    function addChain(uint256 chainId) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        supportedChains[chainId] = true;
        emit ChainAdded(chainId);
    }

    function removeChain(uint256 chainId) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        supportedChains[chainId] = false;
        emit ChainRemoved(chainId);
    }

    function setBridgeFee(uint256 feeBps) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(feeBps <= MAX_FEE_BPS, "Bridge: fee exceeds 1% cap");
        bridgeFeeBps = feeBps;
    }

    function setTransferBounds(uint256 _min, uint256 _max) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(_min < _max, "Bridge: min >= max");
        minTransfer = _min;
        maxTransfer = _max;
    }

    function setDailyLimit(uint256 limit) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        dailyLimit = limit;
    }

    function setFeeRecipient(address recipient) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(recipient != address(0), "Bridge: zero recipient");
        feeRecipient = recipient;
    }

    function pause() external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)  { _unpause(); }

    function rescueToken(address token, uint256 amount) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        if (isLockMode) require(token != address(dwtToken), "Bridge: cannot rescue locked DWT");
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
