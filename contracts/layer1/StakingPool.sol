// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../SecurityGated.sol";

/**
 * @title StakingPool
 * @notice Synthetix-style staking pool with pause gating via Layer 7.
 */
contract StakingPool is ReentrancyGuard, Ownable, SecurityGated {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    uint256 public rewardRate;
    uint256 public rewardsDuration;
    uint256 public periodFinish;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => uint256) public  userRewardPerTokenPaid;
    mapping(address => uint256) public  rewards;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardAdded(uint256 reward);
    event RewardsDurationUpdated(uint256 newDuration);
    event Recovered(address token, uint256 amount);

    constructor(
        address _stakingToken,
        address _rewardToken,
        uint256 _rewardsDuration,
        address _securityController,
        address initialOwner
    ) Ownable(initialOwner) SecurityGated(_securityController) {
        require(_stakingToken != address(0), "StakingPool: zero staking token");
        require(_rewardToken  != address(0), "StakingPool: zero reward token");

        stakingToken     = IERC20(_stakingToken);
        rewardToken      = IERC20(_rewardToken);
        rewardsDuration  = _rewardsDuration;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime       = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account]              = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function totalSupply() external view returns (uint256) { return _totalSupply; }
    function balanceOf(address account) external view returns (uint256) { return _balances[account]; }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) return rewardPerTokenStored;
        return rewardPerTokenStored
            + ((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18) / _totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        return (_balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18
            + rewards[account];
    }

    /**
     * @notice Stake tokens.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function stake(uint256 amount)
        external
        nonReentrant
        whenProtocolNotPaused
        updateReward(msg.sender)
    {
        require(amount > 0, "StakingPool: cannot stake 0");
        _totalSupply              += amount;
        _balances[msg.sender]     += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Withdraw staked tokens.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function withdraw(uint256 amount)
        public
        nonReentrant
        whenProtocolNotPaused
        updateReward(msg.sender)
    {
        require(amount > 0,                            "StakingPool: cannot withdraw 0");
        require(_balances[msg.sender] >= amount,       "StakingPool: insufficient balance");
        _totalSupply              -= amount;
        _balances[msg.sender]     -= amount;
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Claim reward tokens.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function getReward()
        public
        nonReentrant
        whenProtocolNotPaused
        updateReward(msg.sender)
    {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function exit() external {
        withdraw(_balances[msg.sender]);
        getReward();
    }

    function notifyRewardAmount(uint256 reward)
        external
        onlyOwner
        whenProtocolNotPaused
        updateReward(address(0))
    {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining    = periodFinish - block.timestamp;
            uint256 leftover     = remaining * rewardRate;
            rewardRate           = (reward + leftover) / rewardsDuration;
        }

        require(rewardRate > 0, "StakingPool: zero reward rate");
        require(
            rewardRate * rewardsDuration <= rewardToken.balanceOf(address(this)),
            "StakingPool: reward too high for balance"
        );

        lastUpdateTime = block.timestamp;
        periodFinish   = block.timestamp + rewardsDuration;
        emit RewardAdded(reward);
    }

    function setRewardsDuration(uint256 _rewardsDuration) external onlyOwner {
        require(block.timestamp > periodFinish, "StakingPool: active period not ended");
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(_rewardsDuration);
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        require(tokenAddress != address(stakingToken), "StakingPool: cannot recover staking token");
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }
}
