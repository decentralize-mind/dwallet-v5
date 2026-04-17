// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../layer7/SecurityGated.sol";

/**
 * @title DWTStaking
 * @notice DWT → ETH reward staking.
 *         Gated by Layer 7 Protocol-wide pause state.
 */
contract DWTStaking is Ownable, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────
    uint256 private constant PRECISION = 1e18;

    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────
    IERC20  public immutable dwtToken;

    /// @notice Total DWT staked (raw, without boost)
    uint256 public totalStaked;

    /// @notice Accumulated ETH reward per staked DWT token
    uint256 public rewardPerTokenStored;

    /// @notice Snapshot of rewardPerTokenStored at last update
    mapping(address => uint256) public userRewardPerTokenPaid;

    /// @notice Pending ETH rewards
    mapping(address => uint256) public rewards;

    /// @notice Raw DWT staked by each user
    mapping(address => uint256) public stakedAmount;

    /// @notice Minimum lock period
    uint256 public lockPeriod = 7 days;
    mapping(address => uint256) public lockExpiry;

    address public rewardDistributor;
    uint256 public lastLockUpdate;
    uint256 public constant LOCK_UPDATE_COOLDOWN = 7 days;

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event ETHRewardClaimed(address indexed user, uint256 ethAmount);
    event ETHRewardDeposited(address indexed from, uint256 ethAmount);
    event LockPeriodUpdated(uint256 newPeriod);
    event RewardDistributorSet(address indexed distributor);
    event EmergencyWithdrawal(address indexed user, uint256 amount);

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────
    constructor(
        address _dwtToken,
        address _securityController,
        address _owner
    ) Ownable(_owner) SecurityGated(_securityController) {
        require(_dwtToken != address(0), "DWTStaking: zero DWT");
        require(_securityController != address(0), "DWTStaking: zero security");
        require(_owner != address(0), "DWTStaking: zero owner");
        dwtToken = IERC20(_dwtToken);
    }

    // ─────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────

    modifier updateReward(address user) {
        if (user != address(0)) {
            rewards[user] = earned(user);
            userRewardPerTokenPaid[user] = rewardPerTokenStored;
        }
        _;
    }

    // ─────────────────────────────────────────────
    // View
    // ─────────────────────────────────────────────

    function earned(address user) public view returns (uint256) {
        uint256 effective = effectiveBalance(user);
        return rewards[user]
            + effective * (rewardPerTokenStored - userRewardPerTokenPaid[user]) / PRECISION;
    }

    function effectiveBalance(address user) public view virtual returns (uint256) {
        return stakedAmount[user];
    }

    // ─────────────────────────────────────────────
    // Core: Stake
    // ─────────────────────────────────────────────

    /**
     * @notice Stake DWT to earn ETH rewards.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function stake(uint256 amount)
        external
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
        updateReward(msg.sender)
    {
        require(amount > 0, "DWTStaking: zero amount");

        dwtToken.safeTransferFrom(msg.sender, address(this), amount);
        stakedAmount[msg.sender] += amount;
        totalStaked              += amount;
        lockExpiry[msg.sender]    = block.timestamp + lockPeriod;

        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Unstake DWT after lock period expires.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function unstake(uint256 amount)
        external
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
        updateReward(msg.sender)
    {
        require(amount > 0, "DWTStaking: zero amount");
        require(stakedAmount[msg.sender] >= amount, "DWTStaking: insufficient stake");
        require(block.timestamp >= lockExpiry[msg.sender], "DWTStaking: still locked");

        stakedAmount[msg.sender] -= amount;
        totalStaked              -= amount;

        dwtToken.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    // ─────────────────────────────────────────────
    // Core: Claim ETH
    // ─────────────────────────────────────────────

    /**
     * @notice Claim all pending ETH rewards.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function claimETH()
        external
        nonReentrant
        whenProtocolNotPaused
        updateReward(msg.sender)
    {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "DWTStaking: nothing to claim");

        rewards[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: reward}("");
        require(ok, "DWTStaking: ETH transfer failed");

        emit ETHRewardClaimed(msg.sender, reward);
    }

    // ─────────────────────────────────────────────
    // Reward Push (from RewardDistributor)
    // ─────────────────────────────────────────────

    function depositETHReward() external payable nonReentrant whenProtocolNotPaused {
        require(
            msg.sender == rewardDistributor || msg.sender == owner(),
            "DWTStaking: not authorized"
        );
        require(msg.value > 0, "DWTStaking: zero ETH");
        require(totalStaked > 0, "DWTStaking: no stakers");

        rewardPerTokenStored += msg.value * PRECISION / totalStaked;

        emit ETHRewardDeposited(msg.sender, msg.value);
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function setLockPeriod(uint256 period) external onlyOwner whenProtocolNotPaused {
        require(period <= 90 days, "DWTStaking: lock too long");
        require(block.timestamp >= lastLockUpdate + LOCK_UPDATE_COOLDOWN, "DWTStaking: cooldown active");
        lockPeriod = period;
        lastLockUpdate = block.timestamp;
        emit LockPeriodUpdated(period);
    }

    function setRewardDistributor(address distributor) external onlyOwner whenProtocolNotPaused {
        require(distributor != address(0), "DWTStaking: zero address");
        rewardDistributor = distributor;
        emit RewardDistributorSet(distributor);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @notice Emergency withdrawal - allows users to withdraw stake even when paused
     * @dev Returns staked amount without rewards during emergencies
     */
    function emergencyWithdraw() external nonReentrant {
        uint256 amount = stakedAmount[msg.sender];
        require(amount > 0, "DWTStaking: no stake");
        
        stakedAmount[msg.sender] = 0;
        totalStaked -= amount;
        rewards[msg.sender] = 0; // Forfeit rewards
        
        dwtToken.safeTransfer(msg.sender, amount);
        emit EmergencyWithdrawal(msg.sender, amount);
    }

    receive() external payable {}
}
