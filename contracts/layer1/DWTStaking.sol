// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../SecurityGated.sol";

/**
 * @title DWTStaking
 * @notice Staking pool where DWT is staked and ETH is distributed as rewards.
 *         Gated by Protocol-wide pause via Layer 7.
 */
contract DWTStaking is ReentrancyGuard, Ownable, SecurityGated {
    using SafeERC20 for IERC20;

    IERC20  public immutable stakingToken;

    uint256 public rewardRate;
    uint256 public rewardsDuration;
    uint256 public periodFinish;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    uint256 private _totalSupply;
    mapping(address => uint256) private  _balances;
    mapping(address => uint256) public   userRewardPerTokenPaid;
    mapping(address => uint256) public   rewards;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 ethAmount);
    event RewardAdded(uint256 reward);
    event Recovered(address token, uint256 amount);
    event RewardsDurationUpdated(uint256 newDuration);
    bytes32 public constant LAYER_ID = keccak256("LAYER_1_STAKING");
    bytes32 public constant STAKE_ACTION = keccak256("STAKE_ACTION");
    bytes32 public constant WITHDRAW_ACTION = keccak256("WITHDRAW_ACTION");
    bytes32 public constant RECOVER_ACTION = keccak256("RECOVER_ACTION");

    constructor(
        address _stakingToken,
        uint256 _rewardsDuration,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify,
        address initialOwner
    ) Ownable(initialOwner) SecurityGated(_securityController) {
        require(_stakingToken != address(0), "DWTStaking: zero staking token");
        
        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);

        stakingToken    = IERC20(_stakingToken);
        rewardsDuration = _rewardsDuration;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime       = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account]               = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function totalSupply() external view returns (uint256) { return _totalSupply; }
    function balanceOf(address a) external view returns (uint256) { return _balances[a]; }

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
    /**
     * @notice Stake tokens.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Rate: withRateLimit(STAKE_ACTION, amount)
     *      3. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function stake(uint256 amount)
        external
        nonReentrant
        whenProtocolNotPaused
        withStateGuard(LAYER_ID)
        withRateLimit(STAKE_ACTION, amount)
        updateReward(msg.sender)
    {
        require(amount > 0, "DWTStaking: cannot stake 0");
        _totalSupply          += amount;
        _balances[msg.sender] += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Withdraw staked tokens.
     * @dev Gated by Time-lock (cooldown after staking).
     */
    function withdraw(uint256 amount)
        public
        nonReentrant
        whenProtocolNotPaused
        withStateGuard(LAYER_ID)
        withTimeLock(WITHDRAW_ACTION)
        updateReward(msg.sender)
    {
        require(amount > 0,                      "DWTStaking: cannot withdraw 0");
        require(_balances[msg.sender] >= amount, "DWTStaking: insufficient balance");
        _totalSupply          -= amount;
        _balances[msg.sender] -= amount;
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Claim ETH rewards.
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
            (bool success, ) = msg.sender.call{value: reward}("");
            require(success, "DWTStaking: ETH transfer failed");
            emit RewardPaid(msg.sender, reward);
        }
    }

    function exit() external {
        withdraw(_balances[msg.sender]);
        getReward();
    }

    /**
     * @notice Notify pool of new ETH rewards.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function notifyRewardAmount()
        external
        payable
        onlyOwner
        whenProtocolNotPaused
        updateReward(address(0))
    {
        uint256 reward = msg.value;
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover  = remaining * rewardRate;
            rewardRate        = (reward + leftover) / rewardsDuration;
        }

        require(rewardRate > 0, "DWTStaking: zero reward rate");
        require(
            rewardRate * rewardsDuration <= address(this).balance,
            "DWTStaking: reward too high for balance"
        );

        lastUpdateTime = block.timestamp;
        periodFinish   = block.timestamp + rewardsDuration;
        emit RewardAdded(reward);
    }

    function setRewardsDuration(uint256 _duration) external onlyOwner {
        require(block.timestamp > periodFinish, "DWTStaking: active period not ended");
        rewardsDuration = _duration;
        emit RewardsDurationUpdated(_duration);
    }

    function recoverERC20(address token, uint256 amount) external onlyOwner {
        require(token != address(stakingToken), "DWTStaking: cannot recover staking token");
        IERC20(token).safeTransfer(owner(), amount);
        emit Recovered(token, amount);
    }

    receive() external payable {}
}
