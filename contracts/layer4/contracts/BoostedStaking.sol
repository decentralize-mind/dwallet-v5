// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../SecurityGated.sol";

/**
 * @title BoostedStaking
 * @notice veDWT-multiplier boosted DWT staking.
 *         Gated by Layer 7 Protocol-wide pause state.
 */
contract BoostedStaking is Ownable, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────
    uint256 public constant MAX_LOCK_SECONDS  = 4 * 365 days; // 4 years
    uint256 public constant MIN_LOCK_SECONDS  = 7 days;        // 1 week
    uint256 public constant PRECISION         = 1e18;

    // Boost parameters (Curve-style)
    uint256 public constant MAX_BOOST_NUM     = 25;  // 2.5x (numerator)
    uint256 public constant BOOST_DENOM       = 10;
    uint256 public constant BOOST_WEIGHT_NUM  = 15;  // pool-share component weight

    // ─────────────────────────────────────────────
    // Structs
    // ─────────────────────────────────────────────
    struct LockInfo {
        uint256 amount;     // DWT locked
        uint256 lockEnd;    // Unix timestamp when lock expires
    }

    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────
    IERC20 public immutable dwtToken;

    mapping(address => LockInfo) public locks;

    uint256 public totalLocked;
    uint256 public totalVeDWT;

    // ETH reward accounting
    uint256 public rewardPerTokenStored;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public pendingETH;

    address public rewardDistributor;

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────
    event Locked(address indexed user, uint256 amount, uint256 lockEnd, uint256 veDWT);
    event LockExtended(address indexed user, uint256 newLockEnd, uint256 veDWT);
    event LockIncreased(address indexed user, uint256 addedAmount, uint256 veDWT);
    event Unlocked(address indexed user, uint256 amount);
    event ETHRewardClaimed(address indexed user, uint256 amount);
    event ETHRewardDeposited(uint256 amount);
    event RewardDistributorSet(address indexed distributor);

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────
    bytes32 public constant LAYER_ID = keccak256("LAYER_4_LIQUIDITY");
    bytes32 public constant LOCK_ACTION = keccak256("LOCK_ACTION");
    bytes32 public constant CLAIM_ACTION = keccak256("CLAIM_ACTION");

    constructor(
        address _dwtToken,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify,
        address _owner
    ) Ownable(_owner) SecurityGated(_securityController) {
        require(_dwtToken != address(0), "BoostedStaking: zero DWT");
        dwtToken = IERC20(_dwtToken);
        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    // ─────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────
    modifier updateReward(address user) {
        if (user != address(0)) {
            pendingETH[user]               = earnedETH(user);
            userRewardPerTokenPaid[user]   = rewardPerTokenStored;
        }
        _;
    }

    // ─────────────────────────────────────────────
    // View: veDWT
    // ─────────────────────────────────────────────

    function veDWTOf(address user) public view returns (uint256) {
        LockInfo memory l = locks[user];
        if (l.amount == 0 || block.timestamp >= l.lockEnd) return 0;
        uint256 remaining = l.lockEnd - block.timestamp;
        return l.amount * remaining / MAX_LOCK_SECONDS;
    }

    function boostedBalanceOf(address user) public view returns (uint256) {
        LockInfo memory l   = locks[user];
        uint256 rawStake    = l.amount;
        if (rawStake == 0) return 0;

        uint256 component1 = rawStake * MAX_BOOST_NUM / BOOST_DENOM; // 2.5x cap

        uint256 component2;
        uint256 veUser = veDWTOf(user);
        uint256 veTotal = _approximateTotalVeDWT();
        if (veTotal == 0) {
            component2 = rawStake;
        } else {
            uint256 poolShare = totalLocked * veUser / veTotal;
            component2 = rawStake + poolShare * BOOST_WEIGHT_NUM / BOOST_DENOM;
        }

        return component1 < component2 ? component1 : component2;
    }

    function earnedETH(address user) public view returns (uint256) {
        uint256 boosted = boostedBalanceOf(user);
        return pendingETH[user]
            + boosted * (rewardPerTokenStored - userRewardPerTokenPaid[user]) / PRECISION;
    }

    function boostMultiplier(address user) external view returns (uint256) {
        uint256 raw     = locks[user].amount;
        if (raw == 0) return PRECISION; // 1x
        return boostedBalanceOf(user) * PRECISION / raw;
    }

    // ─────────────────────────────────────────────
    // Core: Lock
    // ─────────────────────────────────────────────

    /**
     * @notice Create a new lock or add to an existing one.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Rate: withRateLimit(LOCK_ACTION, amount)
     *      3. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function lock(uint256 amount, uint256 lockSeconds)
        external
        nonReentrant
        whenProtocolNotPaused
        withStateGuard(LAYER_ID)
        withRateLimit(LOCK_ACTION, amount)
        updateReward(msg.sender)
    {
        require(lockSeconds >= MIN_LOCK_SECONDS, "BoostedStaking: lock too short");
        require(lockSeconds <= MAX_LOCK_SECONDS, "BoostedStaking: lock too long");

        LockInfo storage l = locks[msg.sender];

        if (l.amount > 0) {
            uint256 newEnd = block.timestamp + lockSeconds;
            require(newEnd >= l.lockEnd, "BoostedStaking: cannot shorten lock");
            _updateVeDWTAccounting(msg.sender, -int256(veDWTOf(msg.sender)));
            l.lockEnd = newEnd;
            if (amount > 0) {
                dwtToken.safeTransferFrom(msg.sender, address(this), amount);
                l.amount   += amount;
                totalLocked += amount;
            }
        } else {
            require(amount > 0, "BoostedStaking: zero amount on new lock");
            dwtToken.safeTransferFrom(msg.sender, address(this), amount);
            l.amount    = amount;
            l.lockEnd   = block.timestamp + lockSeconds;
            totalLocked += amount;
        }

        uint256 newVe = veDWTOf(msg.sender);
        _updateVeDWTAccounting(msg.sender, int256(newVe));

        emit Locked(msg.sender, l.amount, l.lockEnd, newVe);
    }

    /**
     * @notice Withdraw DWT after lock expires.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function unlock() 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        updateReward(msg.sender) 
    {
        LockInfo storage l = locks[msg.sender];
        require(l.amount > 0,                      "BoostedStaking: nothing locked");
        require(block.timestamp >= l.lockEnd,       "BoostedStaking: still locked");

        uint256 amount = l.amount;
        _updateVeDWTAccounting(msg.sender, -int256(veDWTOf(msg.sender)));

        totalLocked  -= amount;
        l.amount      = 0;
        l.lockEnd     = 0;

        dwtToken.safeTransfer(msg.sender, amount);
        emit Unlocked(msg.sender, amount);
    }

    // ─────────────────────────────────────────
    // Core: Claim ETH
    // ─────────────────────────────────────────

    /**
     * @notice Claim all pending ETH rewards. Requires proof of authorization for safety.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Verification: withSignature(hash, signature)
     *      3. Time: withTimeLock(CLAIM_ACTION)
     *      4. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function claimETH(bytes32 hash, bytes calldata signature) 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withSignature(hash, signature)
        withTimeLock(CLAIM_ACTION)
        updateReward(msg.sender) 
    {
        uint256 reward = pendingETH[msg.sender];
        require(reward > 0, "BoostedStaking: nothing to claim");

        pendingETH[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: reward}("");
        require(ok, "BoostedStaking: ETH transfer failed");

        emit ETHRewardClaimed(msg.sender, reward);
    }

    // ─────────────────────────────────────────────
    // Reward Push
    // ─────────────────────────────────────────────

    /**
     * @notice Push ETH rewards into the pool.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function depositETHReward() external payable nonReentrant whenProtocolNotPaused {
        require(
            msg.sender == rewardDistributor || msg.sender == owner(),
            "BoostedStaking: not authorized"
        );
        require(msg.value > 0, "BoostedStaking: zero ETH");

        uint256 boostedSupply = _totalBoostedSupply();
        if (boostedSupply == 0) {
            (bool ok, ) = payable(owner()).call{value: msg.value}("");
            require(ok, "BoostedStaking: refund failed");
            return;
        }

        rewardPerTokenStored += msg.value * PRECISION / boostedSupply;
        emit ETHRewardDeposited(msg.value);
    }

    // ─────────────────────────────────────────────
    // Internal Helpers
    // ─────────────────────────────────────────────

    function _updateVeDWTAccounting(address user, int256 veDelta) internal {
        if (veDelta > 0) totalVeDWT += uint256(veDelta);
        else if (veDelta < 0) {
            uint256 sub = uint256(-veDelta);
            totalVeDWT = totalVeDWT > sub ? totalVeDWT - sub : 0;
        }
    }

    function _totalBoostedSupply() internal view returns (uint256) {
        if (totalLocked == 0) return 0;
        uint256 veRatio   = totalVeDWT * PRECISION / (totalLocked > 0 ? totalLocked : 1);
        uint256 avgBoost  = PRECISION + (veRatio * (MAX_BOOST_NUM - BOOST_DENOM)) / (BOOST_DENOM * PRECISION);
        if (avgBoost > MAX_BOOST_NUM * PRECISION / BOOST_DENOM)
            avgBoost = MAX_BOOST_NUM * PRECISION / BOOST_DENOM;
        return totalLocked * avgBoost / PRECISION;
    }

    function _approximateTotalVeDWT() internal view returns (uint256) {
        return totalVeDWT;
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function setRewardDistributor(address distributor) external onlyOwner whenProtocolNotPaused {
        rewardDistributor = distributor;
        emit RewardDistributorSet(distributor);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    receive() external payable {}
}
