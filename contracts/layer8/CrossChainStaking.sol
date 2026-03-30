// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  CrossChainStaking
 * @notice Remote Stake Relay
 *         Allows users on any chain to stake tokens that are custodied on the
 *         HOME chain.  Two contract roles:
 *
 *           StakingHub   (HOME chain)  — holds staked tokens, tracks balances,
 *                                        distributes rewards.
 *           StakingSatellite (REMOTE)  — accepts user deposits, relays
 *                                        stake/unstake messages to the hub.
 *
 *         Message flow:
 *           User (remote) → StakingSatellite.stake()
 *             → LZ/Axelar →  StakingHub.receiveStake()   [credits balance]
 *
 *           User (remote) → StakingSatellite.requestUnstake()
 *             → LZ/Axelar →  StakingHub.receiveUnstake() [debits, queues withdrawal]
 *             → LZ/Axelar →  StakingSatellite.receiveWithdrawal() [sends tokens back]
 */

import "./ILayerZeroEndpoint.sol";
import "./IAxelarInterfaces.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../SecurityGated.sol";

// ─────────────────────────────────────────────────────────────────────────────
//  A.  STAKING HUB  (deployed on the home / token chain)
// ─────────────────────────────────────────────────────────────────────────────

contract StakingHub is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    bytes32 public constant LAYER_ID      = keccak256("LAYER_8_HUB_SPOKE");
    bytes32 public constant UNSTAKE_ACTION = keccak256("UNSTAKE_ACTION");

    // ── Errors ────────────────────────────────────────────────────────────────
    error ZeroAmount();
    error ZeroAddress();
    error InvalidSource();
    error InsufficientStake();
    error AlreadyProcessed();
    error InsufficientFee();

    // ── Events ────────────────────────────────────────────────────────────────
    event StakeReceived(address indexed staker, uint256 amount, uint16 srcChain);
    event UnstakeQueued(address indexed staker, uint256 amount, uint16 dstChain, uint64 seq);
    event RewardDistributed(address indexed staker, uint256 reward);
    event RewardRateUpdated(uint256 newRatePerSecond);

    // ── Adapters ──────────────────────────────────────────────────────────────
    ILayerZeroEndpoint public immutable lzEndpoint;

    // ── State ─────────────────────────────────────────────────────────────────
    IERC20 public immutable stakingToken;

    struct StakeInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint128 lastUpdateTime;
        uint16  homeChain;
    }

    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;
    uint256 public accRewardPerToken;
    uint256 public rewardRatePerSecond;
    uint256 public lastRewardTimestamp;
    mapping(uint16 => bytes) public trustedSatellites;
    mapping(bytes32 => bool) public processedMessages;
    mapping(uint16 => uint64) public outSeq;

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address _stakingToken,
        address _lzEndpoint,
        uint256 _rewardRatePerSecond,
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
        stakingToken         = IERC20(_stakingToken);
        lzEndpoint           = ILayerZeroEndpoint(_lzEndpoint);
        rewardRatePerSecond  = _rewardRatePerSecond;
        lastRewardTimestamp  = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);
        _grantRole(GUARDIAN_ROLE,      _guardian);

        _initSecurityModules(_access, _time, _state, _rate, _verify);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setTrustedSatellite(uint16 chainId, bytes calldata path) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
    {
        trustedSatellites[chainId] = path;
    }

    function setRewardRate(uint256 rate) external onlyRole(GOVERNOR_ROLE) whenProtocolNotPaused {
        _updateGlobalReward();
        rewardRatePerSecond = rate;
        emit RewardRateUpdated(rate);
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }

    // ── Reward accounting ─────────────────────────────────────────────────────

    function _updateGlobalReward() internal {
        if (totalStaked == 0) {
            lastRewardTimestamp = block.timestamp;
            return;
        }
        uint256 elapsed = block.timestamp - lastRewardTimestamp;
        uint256 reward  = elapsed * rewardRatePerSecond;
        accRewardPerToken    += (reward * 1e18) / totalStaked;
        lastRewardTimestamp   = block.timestamp;
    }

    function _pendingReward(address staker) internal view returns (uint256) {
        StakeInfo storage s = stakes[staker];
        uint256 elapsed = block.timestamp - lastRewardTimestamp;
        uint256 acc = accRewardPerToken;
        if (totalStaked > 0) acc += (elapsed * rewardRatePerSecond * 1e18) / totalStaked;
        return (s.amount * (acc - s.rewardDebt)) / 1e18;
    }

    function pendingReward(address staker) external view returns (uint256) {
        return _pendingReward(staker);
    }

    // ── Inbound: receive stake from satellite ─────────────────────────────────

    /**
     * @notice LayerZero receive — credits a remote stake.
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
        if (keccak256(srcAddress) != keccak256(trustedSatellites[srcChainId]))
            revert InvalidSource();

        // Decode message type
        uint8 msgType = abi.decode(payload[:1], (uint8));

        if (msgType == 1) {
            _receiveStake(srcChainId, payload[1:]);
        } else if (msgType == 2) {
            _receiveUnstakeRequest(srcChainId, payload[1:]);
        }
    }

    function _receiveStake(uint16 srcChain, bytes calldata data) internal {
        (address staker, uint256 amount, bytes32 msgId) =
            abi.decode(data, (address, uint256, bytes32));

        if (processedMessages[msgId]) revert AlreadyProcessed();
        processedMessages[msgId] = true;

        _updateGlobalReward();

        StakeInfo storage s = stakes[staker];
        // Harvest pending rewards before updating balance
        if (s.amount > 0) {
            uint256 pending = (s.amount * (accRewardPerToken - s.rewardDebt)) / 1e18;
            if (pending > 0) {
                stakingToken.safeTransfer(staker, pending);
                emit RewardDistributed(staker, pending);
            }
        }

        s.amount      += amount;
        s.rewardDebt   = accRewardPerToken;
        s.lastUpdateTime = uint128(block.timestamp);
        s.homeChain    = srcChain;
        totalStaked   += amount;

        emit StakeReceived(staker, amount, srcChain);
    }

    /**
     * @dev Process unstake request with rate limiting on the Hub.
     */
    function _receiveUnstakeRequest(uint16 dstChain, bytes calldata data) internal nonReentrant {
        (address staker, uint256 amount, bytes32 msgId, bytes memory adapterParams) =
            abi.decode(data, (address, uint256, bytes32, bytes));

        if (processedMessages[msgId]) revert AlreadyProcessed();
        processedMessages[msgId] = true;

        // RATE LOCK: Hub-level outflow protection
        _checkRateLimit(UNSTAKE_ACTION, amount);

        StakeInfo storage s = stakes[staker];
        if (s.amount < amount) revert InsufficientStake();

        _updateGlobalReward();

        // Harvest
        uint256 pending = (s.amount * (accRewardPerToken - s.rewardDebt)) / 1e18;
        s.amount     -= amount;
        s.rewardDebt  = accRewardPerToken;
        totalStaked  -= amount;

        uint256 total = amount + pending;
        uint64  seq   = ++outSeq[dstChain];

        // Send tokens back to satellite
        bytes memory path = trustedSatellites[dstChain];
        bytes memory returnPayload = abi.encode(staker, total, seq);

        emit UnstakeQueued(staker, total, dstChain, seq);

        lzEndpoint.send{value: address(this).balance / 10}( 
            dstChain,
            path,
            returnPayload,
            payable(address(this)),
            address(0),
            adapterParams
        );
    }

    receive() external payable {}
}

// ─────────────────────────────────────────────────────────────────────────────
//  B.  STAKING SATELLITE  (deployed on remote chains)
// ─────────────────────────────────────────────────────────────────────────────

contract StakingSatellite is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    bytes32 public constant LAYER_ID      = keccak256("LAYER_8_HUB_SPOKE");

    // ── Errors ────────────────────────────────────────────────────────────────
    error ZeroAmount();
    error ZeroAddress();
    error InvalidSource();
    error InsufficientFee();
    error AlreadyProcessed();

    // ── Events ────────────────────────────────────────────────────────────────
    event StakeRelayed(address indexed staker, uint256 amount);
    event UnstakeRequested(address indexed staker, uint256 amount);
    event WithdrawalReceived(address indexed staker, uint256 amount);

    // ── Adapters ──────────────────────────────────────────────────────────────
    ILayerZeroEndpoint public immutable lzEndpoint;

    // ── State ─────────────────────────────────────────────────────────────────
    IERC20  public immutable stakingToken;
    uint16  public immutable hubChainId;
    bytes   public           trustedHub;
    mapping(bytes32 => bool) public processedMessages;

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address _token,
        address _lzEndpoint,
        uint16  _hubChainId,
        address _admin,
        address _governor,
        address _guardian,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    ) SecurityGated(_securityController) {
        token      = IERC20(_token);
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
        hubChainId = _hubChainId;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);
        _grantRole(GUARDIAN_ROLE,      _guardian);

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    function setTrustedHub(bytes calldata path) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
    {
        trustedHub = path;
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }

    // ── User actions ──────────────────────────────────────────────────────────

    function stake(
        uint256 amount,
        bytes calldata adapterParams
    ) 
        external 
        payable 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        if (amount == 0) revert ZeroAmount();

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        bytes32 msgId   = keccak256(abi.encodePacked(msg.sender, amount, block.timestamp));
        bytes memory innerPayload = abi.encode(msg.sender, amount, msgId);
        bytes memory payload = abi.encodePacked(uint8(1), innerPayload);

        (uint256 fee,) = lzEndpoint.estimateFees(hubChainId, address(this), payload, false, adapterParams);
        if (msg.value < fee) revert InsufficientFee();

        lzEndpoint.send{value: msg.value}(
            hubChainId,
            trustedHub,
            payload,
            payable(msg.sender),
            address(0),
            adapterParams
        );

        emit StakeRelayed(msg.sender, amount);
    }

    function requestUnstake(
        uint256 amount,
        bytes calldata adapterParams
    ) 
        external 
        payable 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        if (amount == 0) revert ZeroAmount();

        bytes32 msgId   = keccak256(abi.encodePacked(msg.sender, amount, block.timestamp, "unstake"));
        bytes memory innerPayload = abi.encode(msg.sender, amount, msgId, adapterParams);
        bytes memory payload = abi.encodePacked(uint8(2), innerPayload);

        (uint256 fee,) = lzEndpoint.estimateFees(hubChainId, address(this), payload, false, adapterParams);
        if (msg.value < fee) revert InsufficientFee();

        lzEndpoint.send{value: msg.value}(
            hubChainId,
            trustedHub,
            payload,
            payable(msg.sender),
            address(0),
            adapterParams
        );

        emit UnstakeRequested(msg.sender, amount);
    }

    // ── Inbound: receive withdrawal from hub ──────────────────────────────────

    function lzReceive(
        uint16         srcChainId,
        bytes calldata srcAddress,
        uint64         /*nonce*/,
        bytes calldata payload
    ) 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        if (msg.sender != address(lzEndpoint)) revert InvalidSource();
        if (srcChainId != hubChainId)          revert InvalidSource();
        if (keccak256(srcAddress) != keccak256(trustedHub)) revert InvalidSource();

        (address staker, uint256 amount, uint64 seq) =
            abi.decode(payload, (address, uint256, uint64));

        bytes32 msgId = keccak256(abi.encodePacked(staker, amount, seq));
        if (processedMessages[msgId]) revert AlreadyProcessed();
        processedMessages[msgId] = true;

        stakingToken.safeTransfer(staker, amount);

        emit WithdrawalReceived(staker, amount);
    }

    receive() external payable {}
}

    receive() external payable {}
}
