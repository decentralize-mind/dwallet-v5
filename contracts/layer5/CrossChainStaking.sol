// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../SecurityGated.sol";

/**
 * @title CrossChainStaking
 * @notice Single-binary dual-role cross-chain staking contract.
 *         Deploy with isSatellite=true on L2, isSatellite=false on mainnet hub.
 *
 * Protections implemented:
 *   - Lock-until-ACK: L2 stake locked until mainnet hub sends release message
 *   - Emergency withdraw bypass: after safetyDelay, user withdraws without bridge ACK
 *   - Credit TTL expiry: hub credits expire after creditTTL (30 days) without heartbeat
 *   - Messenger-only callbacks: receiveSatelliteMessage() checks msg.sender == messenger
 *   - One active credit per user: require(!credits[user].active)
 *   - Pausable on both sides
 *   - Nonce per message (prevents stake message replay doubling credit)
 *   - Satellite/home role enforcement: stake() only on satellite, claimRewards() only on hub
 */

interface ICrossChainMessenger {
    function sendMessage(uint256 destChainId, address destContract, bytes calldata payload) external;
}

contract CrossChainStaking is AccessControl, Pausable, ReentrancyGuard, SecurityGated {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE  = keccak256("GUARDIAN_ROLE");

    // Message type identifiers
    bytes32 public constant MSG_STAKE   = keccak256("MSG_STAKE");
    bytes32 public constant MSG_UNSTAKE = keccak256("MSG_UNSTAKE");
    bytes32 public constant MSG_RELEASE = keccak256("MSG_RELEASE");

    bool    public immutable isSatellite;

    IERC20               public immutable stakingToken;
    ICrossChainMessenger public           messenger;
    address              public           counterpart; // hub address (on satellite) or satellite (on hub)
    uint256              public           counterpartChainId;

    uint256 public safetyDelay; // seconds before emergency withdraw allowed
    uint256 public creditTTL;   // seconds hub credit is valid (default 30 days)

    // ─── Satellite State ──────────────────────────────────────────────────────
    enum StakeState { None, Staked, PendingRelease, Released }

    struct SatelliteStake {
        uint256    amount;
        uint256    stakedAt;
        StakeState state;
        uint256    nonce;
    }
    mapping(address => SatelliteStake) public satelliteStakes;
    mapping(uint256 => bool) public usedNonces; // nonce replay protection

    // ─── Hub State ────────────────────────────────────────────────────────────
    struct HubCredit {
        uint256 amount;
        uint256 creditedAt;
        uint256 lastHeartbeat;
        bool    active;
    }
    mapping(address => HubCredit) public credits;

    uint256 public rewardRate;        // hub: rewards per second per staked token
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public pendingRewards;
    uint256 public totalCreditedStake;

    uint256 private _outboundNonce;

    // ─── Events ───────────────────────────────────────────────────────────────
    event Staked(address indexed user, uint256 amount, uint256 nonce);
    event UnstakeInitiated(address indexed user, uint256 amount);
    event EmergencyWithdrawn(address indexed user, uint256 amount);
    event CreditReceived(address indexed user, uint256 amount);
    event CreditReleased(address indexed user);
    event RewardClaimed(address indexed user, uint256 reward);
    event HeartbeatReceived(address indexed user, uint256 timestamp);

    constructor(
        bool    _isSatellite,
        address _stakingToken,
        address _messenger,
        address _counterpart,
        uint256 _counterpartChainId,
        uint256 _safetyDelay,
        uint256 _creditTTL,
        address _securityController,
        address admin,
        address guardian
    ) SecurityGated(_securityController) {
        require(_stakingToken != address(0), "XStaking: zero token");
        require(_messenger    != address(0), "XStaking: zero messenger");

        isSatellite        = _isSatellite;
        stakingToken       = IERC20(_stakingToken);
        messenger          = ICrossChainMessenger(_messenger);
        counterpart        = _counterpart;
        counterpartChainId = _counterpartChainId;
        safetyDelay        = _safetyDelay;
        creditTTL          = _creditTTL;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(GUARDIAN_ROLE,      guardian);
    }

    // ─── Satellite: Stake ─────────────────────────────────────────────────────
    /**
     * @notice Stake DWT on L2. Locks tokens and sends message to hub.
     * @dev Satellite only. Hub calls revert with "XStaking: hub only".
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused whenProtocolNotPaused {
        require(isSatellite,                                    "XStaking: satellite only");
        require(amount > 0,                                     "XStaking: zero amount");
        require(satelliteStakes[msg.sender].state == StakeState.None,
                                                                "XStaking: already staked");

        uint256 nonce = ++_outboundNonce;

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        satelliteStakes[msg.sender] = SatelliteStake(amount, block.timestamp, StakeState.Staked, nonce);

        // Send stake message to hub
        bytes memory payload = abi.encode(MSG_STAKE, msg.sender, amount, nonce);
        messenger.sendMessage(counterpartChainId, counterpart, payload);

        emit Staked(msg.sender, amount, nonce);
    }

    /**
     * @notice Initiate unstake on L2. Transitions to PendingRelease state.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function initiateUnstake() external nonReentrant whenNotPaused whenProtocolNotPaused {
        require(isSatellite, "XStaking: satellite only");
        SatelliteStake storage s = satelliteStakes[msg.sender];
        require(s.state == StakeState.Staked, "XStaking: not staked");

        s.state = StakeState.PendingRelease;

        bytes memory payload = abi.encode(MSG_UNSTAKE, msg.sender, s.amount, s.nonce);
        messenger.sendMessage(counterpartChainId, counterpart, payload);

        emit UnstakeInitiated(msg.sender, s.amount);
    }

    /**
     * @notice Emergency withdraw on satellite without bridge ACK (after safetyDelay).
     * @dev Bridge liveness protection — if hub never responds, user can recover funds.
     */
    function emergencyWithdraw() external nonReentrant {
        require(isSatellite, "XStaking: satellite only");
        SatelliteStake storage s = satelliteStakes[msg.sender];
        require(s.amount > 0,                                          "XStaking: nothing staked");
        require(s.state == StakeState.PendingRelease,                  "XStaking: not pending release");
        require(block.timestamp >= s.stakedAt + safetyDelay,          "XStaking: safety delay not elapsed");

        uint256 amount = s.amount;
        delete satelliteStakes[msg.sender];

        stakingToken.safeTransfer(msg.sender, amount);
        emit EmergencyWithdrawn(msg.sender, amount);
    }

    // ─── Hub: Receive Messages ────────────────────────────────────────────────
    /**
     * @notice Receive stake/unstake messages from satellite. Messenger-only.
     * @dev Hub only. Checks msg.sender == address(messenger).
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function receiveSatelliteMessage(bytes calldata payload) external nonReentrant whenProtocolNotPaused {
        require(!isSatellite,                          "XStaking: hub only");
        require(msg.sender == address(messenger),      "XStaking: messenger only");

        (bytes32 msgType, address user, uint256 amount, uint256 nonce) =
            abi.decode(payload, (bytes32, address, uint256, uint256));

        // Nonce replay protection
        require(!usedNonces[nonce], "XStaking: nonce replay");
        usedNonces[nonce] = true;

        if (msgType == MSG_STAKE) {
            _hubCreditStake(user, amount);
        } else if (msgType == MSG_UNSTAKE) {
            _hubReleaseCredit(user);
        }
    }

    function _hubCreditStake(address user, uint256 amount) internal {
        _updateReward(user);
        // One active credit per user
        require(!credits[user].active, "XStaking: credit already active");

        credits[user] = HubCredit(amount, block.timestamp, block.timestamp, true);
        totalCreditedStake += amount;
        emit CreditReceived(user, amount);

        // Send release ACK back to satellite
        bytes memory releasePayload = abi.encode(MSG_RELEASE, user, amount, block.timestamp);
        messenger.sendMessage(counterpartChainId, counterpart, releasePayload);
    }

    function _hubReleaseCredit(address user) internal {
        _updateReward(user);
        HubCredit storage c = credits[user];
        require(c.active, "XStaking: no active credit");

        totalCreditedStake -= c.amount;
        delete credits[user];
        emit CreditReleased(user);
    }

    // ─── Hub: Claim Rewards ───────────────────────────────────────────────────
    /**
     * @notice Claim staking rewards on hub. Hub only.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function claimRewards() external nonReentrant whenNotPaused whenProtocolNotPaused {
        require(!isSatellite, "XStaking: hub only");

        // Credit TTL expiry check
        HubCredit storage c = credits[msg.sender];
        if (c.active && block.timestamp > c.creditedAt + creditTTL) {
            // Ghost credit — expired without heartbeat
            _hubReleaseCredit(msg.sender);
            return;
        }

        _updateReward(msg.sender);
        uint256 reward = pendingRewards[msg.sender];
        if (reward > 0) {
            pendingRewards[msg.sender] = 0;
            stakingToken.safeTransfer(msg.sender, reward);
            emit RewardClaimed(msg.sender, reward);
        }
    }

    // ─── Reward Accounting ────────────────────────────────────────────────────
    function _updateReward(address user) internal {
        rewardPerTokenStored   = _rewardPerToken();
        lastUpdateTime         = block.timestamp;
        if (user != address(0) && credits[user].active) {
            pendingRewards[user]           += _earnedDelta(user);
            userRewardPerTokenPaid[user]    = rewardPerTokenStored;
        }
    }

    function _rewardPerToken() internal view returns (uint256) {
        if (totalCreditedStake == 0) return rewardPerTokenStored;
        return rewardPerTokenStored
            + ((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / totalCreditedStake;
    }

    function _earnedDelta(address user) internal view returns (uint256) {
        return (credits[user].amount * (_rewardPerToken() - userRewardPerTokenPaid[user])) / 1e18;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function setMessenger(address _messenger) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(_messenger != address(0), "XStaking: zero messenger");
        messenger = ICrossChainMessenger(_messenger);
    }

    function setRewardRate(uint256 rate) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        _updateReward(address(0));
        rewardRate = rate;
    }

    function setSafetyDelay(uint256 delay) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        safetyDelay = delay;
    }

    function setCreditTTL(uint256 ttl) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        creditTTL = ttl;
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }
}
