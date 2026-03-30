// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title DWTStaking v2
/// @notice Stake DWT, earn ETH from dWallet swap fees.
///
///   Lock multipliers:
///     No lock   -> 1.00x
///     30 days   -> 1.25x
///     90 days   -> 1.50x
///     180 days  -> 2.00x
///     365 days  -> 3.00x
///
///   Rewards: ETH sent by DWalletFeeRouter (not DWT tokens).
///   This is separate from StakingPool which pays DWT rewards.
contract DWTStaking is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE            = keccak256("ADMIN_ROLE");
    bytes32 public constant REWARD_DEPOSITOR_ROLE = keccak256("REWARD_DEPOSITOR_ROLE");

    IERC20 public immutable dwtToken;

    uint256 private constant PRECISION      = 1e18;
    uint256 public  constant LOCK_30D_MULT  = 125;
    uint256 public  constant LOCK_90D_MULT  = 150;
    uint256 public  constant LOCK_180D_MULT = 200;
    uint256 public  constant LOCK_365D_MULT = 300;
    uint256 public  constant BASE_MULT      = 100;

    struct StakeInfo {
        uint256 amount;
        uint256 weightedAmount;
        uint256 lockExpiry;
        uint256 lockMultiplier;
        uint256 rewardDebt;
        uint256 pendingRewards;
        uint256 stakedAt;
    }

    mapping(address => StakeInfo) public stakes;

    uint256 public totalStaked;
    uint256 public totalWeightedStake;
    uint256 public accRewardPerShare;
    uint256 public totalRewardsDeposited;
    uint256 public totalRewardsClaimed;

    event Staked(address indexed user, uint256 amount, uint256 lockDays, uint256 multiplier);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardsAdded(address indexed depositor, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    constructor(address _dwtToken, address _admin) {
        require(_dwtToken != address(0), "Staking: zero token");
        require(_admin    != address(0), "Staking: zero admin");
        dwtToken = IERC20(_dwtToken);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(REWARD_DEPOSITOR_ROLE, _admin);
    }

    function stake(uint256 amount, uint256 lockDays) external nonReentrant whenNotPaused {
        require(amount > 0, "Staking: zero amount");
        require(
            lockDays == 0 || lockDays == 30 || lockDays == 90 || lockDays == 180 || lockDays == 365,
            "Staking: invalid lock period"
        );

        StakeInfo storage info = stakes[msg.sender];
        _settle(msg.sender);

        uint256 multiplier = lockDays == 365 ? LOCK_365D_MULT
                           : lockDays == 180 ? LOCK_180D_MULT
                           : lockDays == 90  ? LOCK_90D_MULT
                           : lockDays == 30  ? LOCK_30D_MULT
                           : BASE_MULT;

        uint256 oldWeighted = info.weightedAmount;
        dwtToken.safeTransferFrom(msg.sender, address(this), amount);

        info.amount         += amount;
        info.lockExpiry      = lockDays > 0 ? block.timestamp + (lockDays * 1 days) : 0;
        info.lockMultiplier  = multiplier;
        info.weightedAmount  = (info.amount * multiplier) / 100;
        info.stakedAt        = block.timestamp;
        info.rewardDebt      = accRewardPerShare;

        totalStaked         += amount;
        totalWeightedStake   = totalWeightedStake - oldWeighted + info.weightedAmount;

        emit Staked(msg.sender, amount, lockDays, multiplier);
    }

    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        StakeInfo storage info = stakes[msg.sender];
        require(amount > 0 && amount <= info.amount, "Staking: invalid amount");
        require(
            info.lockExpiry == 0 || block.timestamp >= info.lockExpiry,
            "Staking: tokens locked"
        );

        _settle(msg.sender);

        uint256 reward      = info.pendingRewards;
        info.pendingRewards = 0;

        uint256 oldWeighted = info.weightedAmount;
        info.amount        -= amount;
        info.weightedAmount = (info.amount * info.lockMultiplier) / 100;
        info.rewardDebt     = accRewardPerShare;

        totalStaked        -= amount;
        totalWeightedStake  = totalWeightedStake - oldWeighted + info.weightedAmount;

        dwtToken.safeTransfer(msg.sender, amount);

        if (reward > 0) {
            totalRewardsClaimed += reward;
            (bool sent,) = payable(msg.sender).call{value: reward}("");
            require(sent, "Staking: ETH transfer failed");
        }

        emit Unstaked(msg.sender, amount, reward);
    }

    function claimRewards() external nonReentrant whenNotPaused {
        _settle(msg.sender);
        StakeInfo storage info = stakes[msg.sender];
        uint256 reward = info.pendingRewards;
        require(reward > 0, "Staking: no rewards");
        info.pendingRewards  = 0;
        totalRewardsClaimed += reward;
        (bool sent,) = payable(msg.sender).call{value: reward}("");
        require(sent, "Staking: ETH transfer failed");
        emit RewardClaimed(msg.sender, reward);
    }

    function addRewards() external payable onlyRole(REWARD_DEPOSITOR_ROLE) {
        require(msg.value > 0, "Staking: zero rewards");
        if (totalWeightedStake > 0) {
            accRewardPerShare += (msg.value * PRECISION) / totalWeightedStake;
        }
        totalRewardsDeposited += msg.value;
        emit RewardsAdded(msg.sender, msg.value);
    }

    function _settle(address user) internal {
        StakeInfo storage info = stakes[user];
        if (info.weightedAmount > 0) {
            uint256 earned = (info.weightedAmount * (accRewardPerShare - info.rewardDebt)) / PRECISION;
            info.pendingRewards += earned;
        }
        info.rewardDebt = accRewardPerShare;
    }

    function pendingRewards(address user) external view returns (uint256) {
        StakeInfo storage info = stakes[user];
        if (info.weightedAmount == 0) return info.pendingRewards;
        uint256 earned = (info.weightedAmount * (accRewardPerShare - info.rewardDebt)) / PRECISION;
        return info.pendingRewards + earned;
    }

    function getStakeInfo(address user) external view returns (
        uint256 amount, uint256 weighted, uint256 lockExpiry,
        uint256 multiplier, uint256 pending, uint256 stakedAt, bool isLocked
    ) {
        StakeInfo storage info = stakes[user];
        uint256 extra;
        if (info.weightedAmount > 0) {
            extra = (info.weightedAmount * (accRewardPerShare - info.rewardDebt)) / PRECISION;
        }
        return (
            info.amount, info.weightedAmount, info.lockExpiry,
            info.lockMultiplier, info.pendingRewards + extra,
            info.stakedAt,
            info.lockExpiry > 0 && block.timestamp < info.lockExpiry
        );
    }

    function getProtocolStats() external view returns (
        uint256 _totalStaked, uint256 _totalWeighted,
        uint256 _totalDeposited, uint256 _totalClaimed,
        uint256 _contractBalance, uint256 _accRewardPerShare
    ) {
        return (
            totalStaked, totalWeightedStake,
            totalRewardsDeposited, totalRewardsClaimed,
            address(this).balance, accRewardPerShare
        );
    }

    function pause()   external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function addRewardDepositor(address depositor) external onlyRole(ADMIN_ROLE) {
        require(depositor != address(0), "Staking: zero address");
        _grantRole(REWARD_DEPOSITOR_ROLE, depositor);
    }

    function emergencyWithdraw() external nonReentrant {
        require(paused(), "Staking: only when paused");
        StakeInfo storage info = stakes[msg.sender];
        require(info.amount > 0, "Staking: nothing staked");
        uint256 amount = info.amount;
        totalStaked        -= amount;
        totalWeightedStake -= info.weightedAmount;
        delete stakes[msg.sender];
        dwtToken.safeTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    receive() external payable {
        if (totalWeightedStake > 0) {
            accRewardPerShare += (msg.value * PRECISION) / totalWeightedStake;
        }
        totalRewardsDeposited += msg.value;
    }
}
