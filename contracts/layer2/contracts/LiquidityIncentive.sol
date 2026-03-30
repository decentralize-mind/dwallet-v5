// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title LiquidityIncentive
 * @notice Distributes reward tokens to liquidity providers across multiple pools.
 *         Implements a MasterChef-style rewards model with per-pool allocation points
 *         and per-user reward debt tracking for gas-efficient accrual.
 * @dev    Multiple reward tokens are not supported per pool by design (keeps gas low).
 *         Use one deployment per reward token.
 */
contract LiquidityIncentive is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────

    struct PoolInfo {
        IERC20  lpToken;            // LP token staked into this pool
        uint256 allocPoint;         // Allocation weight for this pool
        uint256 lastRewardTimestamp;// Last timestamp rewards were updated
        uint256 accRewardPerShare;  // Accumulated rewards per share (1e12 precision)
        uint256 totalStaked;        // Total LP tokens staked in pool
        bool    emergencyPaused;    // Emergency stop for individual pool
    }

    struct UserInfo {
        uint256 amount;     // LP tokens deposited
        uint256 rewardDebt; // Reward debt for delta calculation
        uint256 pendingReward; // Claimable rewards not yet harvested
    }

    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────

    IERC20  public immutable rewardToken;
    uint256 public rewardPerSecond;          // Reward emission rate
    uint256 public totalAllocPoint;
    uint256 public startTimestamp;
    uint256 public endTimestamp;

    uint256 private constant ACC_PRECISION = 1e12;

    PoolInfo[] public poolInfo;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    // Prevent duplicate LP tokens
    mapping(address => bool) public addedPools;

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────

    event PoolAdded(uint256 indexed pid, address indexed lpToken, uint256 allocPoint);
    event PoolUpdated(uint256 indexed pid, uint256 accRewardPerShare, uint256 totalStaked);
    event AllocPointSet(uint256 indexed pid, uint256 allocPoint);
    event Deposited(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdrawn(address indexed user, uint256 indexed pid, uint256 amount);
    event Harvested(address indexed user, uint256 indexed pid, uint256 reward);
    event EmergencyWithdrawn(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardRateUpdated(uint256 newRate);

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    constructor(
        address _rewardToken,
        uint256 _rewardPerSecond,
        uint256 _startTimestamp,
        uint256 _endTimestamp,
        address _owner
    ) Ownable(_owner) {
        require(_rewardToken != address(0), "LiqIncentive: zero reward token");
        require(_endTimestamp > _startTimestamp, "LiqIncentive: invalid window");

        rewardToken       = IERC20(_rewardToken);
        rewardPerSecond   = _rewardPerSecond;
        startTimestamp    = _startTimestamp;
        endTimestamp      = _endTimestamp;
    }

    // ─────────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────────

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    /**
     * @notice Preview how much reward a user can harvest right now.
     */
    function pendingReward(uint256 pid, address user)
        external
        view
        returns (uint256 pending)
    {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage info = userInfo[pid][user];

        uint256 acc = pool.accRewardPerShare;
        if (block.timestamp > pool.lastRewardTimestamp && pool.totalStaked > 0) {
            uint256 elapsed = _capTimestamp(block.timestamp) - _capTimestamp(pool.lastRewardTimestamp);
            uint256 reward  = elapsed * rewardPerSecond * pool.allocPoint / totalAllocPoint;
            acc += reward * ACC_PRECISION / pool.totalStaked;
        }
        pending = info.pendingReward + (info.amount * acc / ACC_PRECISION) - info.rewardDebt;
    }

    // ─────────────────────────────────────────────
    // Pool Management (Owner)
    // ─────────────────────────────────────────────

    function addPool(
        uint256 _allocPoint,
        address _lpToken,
        bool    _withUpdate
    ) external onlyOwner {
        require(!addedPools[_lpToken], "LiqIncentive: pool already exists");
        if (_withUpdate) massUpdatePools();

        addedPools[_lpToken] = true;
        totalAllocPoint += _allocPoint;

        poolInfo.push(PoolInfo({
            lpToken:             IERC20(_lpToken),
            allocPoint:          _allocPoint,
            lastRewardTimestamp: block.timestamp > startTimestamp ? block.timestamp : startTimestamp,
            accRewardPerShare:   0,
            totalStaked:         0,
            emergencyPaused:     false
        }));

        emit PoolAdded(poolInfo.length - 1, _lpToken, _allocPoint);
    }

    function setAllocPoint(
        uint256 pid,
        uint256 _allocPoint,
        bool    _withUpdate
    ) external onlyOwner {
        if (_withUpdate) massUpdatePools();
        totalAllocPoint = totalAllocPoint - poolInfo[pid].allocPoint + _allocPoint;
        poolInfo[pid].allocPoint = _allocPoint;
        emit AllocPointSet(pid, _allocPoint);
    }

    function setRewardRate(uint256 _rewardPerSecond, bool _withUpdate) external onlyOwner {
        if (_withUpdate) massUpdatePools();
        rewardPerSecond = _rewardPerSecond;
        emit RewardRateUpdated(_rewardPerSecond);
    }

    function setEmergencyPause(uint256 pid, bool paused) external onlyOwner {
        poolInfo[pid].emergencyPaused = paused;
    }

    // ─────────────────────────────────────────────
    // Pool Update
    // ─────────────────────────────────────────────

    function massUpdatePools() public {
        for (uint256 i = 0; i < poolInfo.length; i++) {
            updatePool(i);
        }
    }

    function updatePool(uint256 pid) public {
        PoolInfo storage pool = poolInfo[pid];
        uint256 ts = _capTimestamp(block.timestamp);

        if (ts <= pool.lastRewardTimestamp) return;

        if (pool.totalStaked == 0 || pool.allocPoint == 0) {
            pool.lastRewardTimestamp = ts;
            return;
        }

        uint256 elapsed = ts - _capTimestamp(pool.lastRewardTimestamp);
        uint256 reward  = elapsed * rewardPerSecond * pool.allocPoint / totalAllocPoint;

        pool.accRewardPerShare   += reward * ACC_PRECISION / pool.totalStaked;
        pool.lastRewardTimestamp  = ts;

        emit PoolUpdated(pid, pool.accRewardPerShare, pool.totalStaked);
    }

    // ─────────────────────────────────────────────
    // User Interactions
    // ─────────────────────────────────────────────

    /**
     * @notice Deposit LP tokens to earn rewards.
     * @param pid    Pool id
     * @param amount Amount of LP tokens to deposit
     */
    function deposit(uint256 pid, uint256 amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[pid];
        require(!pool.emergencyPaused, "LiqIncentive: pool paused");

        updatePool(pid);

        UserInfo storage user = userInfo[pid][msg.sender];

        // Harvest outstanding rewards before changing balance
        if (user.amount > 0) {
            uint256 earned = (user.amount * pool.accRewardPerShare / ACC_PRECISION) - user.rewardDebt;
            user.pendingReward += earned;
        }

        if (amount > 0) {
            pool.lpToken.safeTransferFrom(msg.sender, address(this), amount);
            user.amount     += amount;
            pool.totalStaked += amount;
        }

        user.rewardDebt = user.amount * pool.accRewardPerShare / ACC_PRECISION;
        emit Deposited(msg.sender, pid, amount);
    }

    /**
     * @notice Withdraw LP tokens. Pending rewards are also harvested automatically.
     * @param pid    Pool id
     * @param amount Amount of LP tokens to withdraw (0 = harvest only)
     */
    function withdraw(uint256 pid, uint256 amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        require(user.amount >= amount, "LiqIncentive: insufficient balance");

        updatePool(pid);

        uint256 earned = (user.amount * pool.accRewardPerShare / ACC_PRECISION) - user.rewardDebt;
        user.pendingReward += earned;

        if (amount > 0) {
            user.amount      -= amount;
            pool.totalStaked -= amount;
            pool.lpToken.safeTransfer(msg.sender, amount);
        }

        user.rewardDebt = user.amount * pool.accRewardPerShare / ACC_PRECISION;
        emit Withdrawn(msg.sender, pid, amount);
    }

    /**
     * @notice Harvest all pending rewards for a pool.
     */
    function harvest(uint256 pid) external nonReentrant {
        updatePool(pid);

        UserInfo storage user = userInfo[pid][msg.sender];
        PoolInfo storage pool = poolInfo[pid];

        uint256 earned = (user.amount * pool.accRewardPerShare / ACC_PRECISION) - user.rewardDebt;
        uint256 total  = user.pendingReward + earned;

        user.pendingReward = 0;
        user.rewardDebt    = user.amount * pool.accRewardPerShare / ACC_PRECISION;

        if (total > 0) {
            _safeRewardTransfer(msg.sender, total);
            emit Harvested(msg.sender, pid, total);
        }
    }

    /**
     * @notice Emergency withdrawal without caring about rewards.
     *         Only available when pool is paused or in extreme situations.
     */
    function emergencyWithdraw(uint256 pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];

        uint256 amount = user.amount;
        pool.totalStaked -= amount;
        user.amount      = 0;
        user.rewardDebt  = 0;
        user.pendingReward = 0;

        pool.lpToken.safeTransfer(msg.sender, amount);
        emit EmergencyWithdrawn(msg.sender, pid, amount);
    }

    // ─────────────────────────────────────────────
    // Internal Helpers
    // ─────────────────────────────────────────────

    function _safeRewardTransfer(address to, uint256 amount) internal {
        uint256 bal = rewardToken.balanceOf(address(this));
        rewardToken.safeTransfer(to, amount > bal ? bal : amount);
    }

    function _capTimestamp(uint256 ts) internal view returns (uint256) {
        return ts > endTimestamp ? endTimestamp : ts;
    }
}
