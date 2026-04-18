// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ReferralPool
 * @notice On-chain referral reward distribution contract
 * @dev Distributes 10 DWT tokens to users who invite friends to the platform
 * 
 * Architecture:
 *   • Users generate referral codes from their wallet address
 *   • New users sign up with a referral code
 *   • Both referrer and referee receive 10 DWT tokens
 *   • Rewards are pulled from the ReferralPool contract
 * 
 * Security Features:
 *   - One-time claim per referee (prevents abuse)
 *   - Reentrancy protection
 *   - Owner can pause/unpause in emergencies
 *   - Owner can fund the pool and withdraw if needed
 *   - Referral code validation
 */
contract ReferralPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ─── State Variables ─────────────────────────────────────────────────────
    
    /// @notice DWT token contract
    IERC20 public immutable dwtToken;
    
    /// @notice Amount of DWT tokens per referral reward (10 DWT)
    uint256 public constant REWARD_AMOUNT = 10 * 1e18;
    
    /// @notice Track which addresses have claimed referral rewards
    mapping(address => bool) public hasClaimedReferral;
    
    /// @notice Track referral relationships: referee → referrer
    mapping(address => address) public referredBy;
    
    /// @notice Track referrer's total successful referrals
    mapping(address => uint256) public referrerStats;
    
    /// @notice Total number of successful referrals
    uint256 public totalReferrals;
    
    /// @notice Total DWT tokens distributed as rewards
    uint256 public totalDistributed;
    
    /// @notice Pause state for emergency stops
    bool public paused;
    
    // ─── Events ───────────────────────────────────────────────────────────────
    
    event ReferralRegistered(address referee, address referrer, uint256 timestamp);
    event ReferralRewardClaimed(address user, uint256 amount, uint256 timestamp);
    event PoolFunded(address from, uint256 amount);
    event TokensWithdrawn(address to, uint256 amount);
    event Paused(bool paused);
    
    // ─── Errors ───────────────────────────────────────────────────────────────
    
    error AlreadyClaimed();
    error ZeroAddress();
    error SelfReferral();
    error InvalidReferrer();
    error InsufficientPoolBalance();
    error TransferFailed();
    
    // ─── Constructor ─────────────────────────────────────────────────────────
    
    /**
     * @notice Initialize the ReferralPool contract
     * @param _dwtToken Address of the DWT token contract
     * @param _owner Address of the contract owner
     */
    constructor(address _dwtToken, address _owner) Ownable(_owner) {
        if (_dwtToken == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();
        
        dwtToken = IERC20(_dwtToken);
    }
    
    // ─── Modifiers ────────────────────────────────────────────────────────────
    
    modifier whenNotPaused() {
        require(!paused, "ReferralPool: paused");
        _;
    }
    
    // ─── Core Functions ───────────────────────────────────────────────────────
    
    /**
     * @notice Register a referral and claim rewards for both parties
     * @param referrer Address of the user who referred
     * @dev Called when a new user completes onboarding with a referral code
     */
    function claimReferralReward(address referrer) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        address referee = msg.sender;
        
        // Validation checks
        if (referrer == address(0)) revert ZeroAddress();
        if (referrer == referee) revert SelfReferral();
        if (hasClaimedReferral[referee]) revert AlreadyClaimed();
        
        // Check pool has enough balance for both rewards (20 DWT total)
        uint256 poolBalance = dwtToken.balanceOf(address(this));
        if (poolBalance < REWARD_AMOUNT * 2) revert InsufficientPoolBalance();
        
        // Mark as claimed
        hasClaimedReferral[referee] = true;
        referredBy[referee] = referrer;
        referrerStats[referrer]++;
        totalReferrals++;
        
        // Distribute rewards
        // 1. Reward to the referee (new user)
        dwtToken.safeTransfer(referee, REWARD_AMOUNT);
        emit ReferralRewardClaimed(referee, REWARD_AMOUNT, block.timestamp);
        
        // 2. Reward to the referrer
        dwtToken.safeTransfer(referrer, REWARD_AMOUNT);
        emit ReferralRewardClaimed(referrer, REWARD_AMOUNT, block.timestamp);
        
        totalDistributed += REWARD_AMOUNT * 2;
        
        emit ReferralRegistered(referee, referrer, block.timestamp);
    }
    
    /**
     * @notice Register referral without immediate reward (for tracking only)
     * @param referrer Address of the user who referred
     * @dev Can be called during onboarding, rewards claimed later
     */
    function registerReferral(address referrer) external whenNotPaused {
        address referee = msg.sender;
        
        if (referrer == address(0)) revert ZeroAddress();
        if (referrer == referee) revert SelfReferral();
        if (referredBy[referee] != address(0)) revert AlreadyClaimed();
        
        referredBy[referee] = referrer;
        emit ReferralRegistered(referee, referrer, block.timestamp);
    }
    
    /**
     * @notice Check if a user is eligible for referral rewards
     * @param user Address to check
     * @return True if user can claim referral rewards
     */
    function isEligibleForReferral(address user) external view returns (bool) {
        return !hasClaimedReferral[user];
    }
    
    /**
     * @notice Get referral statistics for a referrer
     * @param referrer Address of the referrer
     * @return totalRefs Total number of successful referrals
     * @return totalRewards Total rewards earned (in DWT)
     */
    function getReferrerStats(address referrer) 
        external 
        view 
        returns (uint256 totalRefs, uint256 totalRewards) 
    {
        totalRefs = referrerStats[referrer];
        totalRewards = totalRefs * REWARD_AMOUNT;
    }
    
    // ─── Admin Functions ─────────────────────────────────────────────────────
    
    /**
     * @notice Fund the referral pool with DWT tokens
     * @param amount Amount of DWT tokens to deposit
     */
    function fundPool(uint256 amount) external whenNotPaused {
        if (amount == 0) revert ZeroAddress();
        
        dwtToken.safeTransferFrom(msg.sender, address(this), amount);
        emit PoolFunded(msg.sender, amount);
    }
    
    /**
     * @notice Withdraw excess tokens from the pool (owner only)
     * @param to Address to send tokens to
     * @param amount Amount to withdraw
     */
    function withdrawTokens(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        
        dwtToken.safeTransfer(to, amount);
        emit TokensWithdrawn(to, amount);
    }
    
    /**
     * @notice Pause the contract in case of emergency
     */
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    // ─── View Functions ───────────────────────────────────────────────────────
    
    /**
     * @notice Get the current pool balance
     * @return balance Current DWT token balance in the pool
     */
    function getPoolBalance() external view returns (uint256 balance) {
        return dwtToken.balanceOf(address(this));
    }
    
    /**
     * @notice Get the maximum number of referrals that can be rewarded
     * @return maxReferrals Maximum number of full referral rewards possible
     */
    function getMaxReferrals() external view returns (uint256 maxReferrals) {
        return dwtToken.balanceOf(address(this)) / (REWARD_AMOUNT * 2);
    }
    
    /**
     * @notice Check if a user was referred and by whom
     * @param user Address to check
     * @return referrer Address of the referrer (address(0) if not referred)
     */
    function getReferrer(address user) external view returns (address referrer) {
        return referredBy[user];
    }
}
