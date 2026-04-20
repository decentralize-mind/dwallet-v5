// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../layer7/SecurityGated.sol";

/**
 * @title ReferralPool - Upgradeable Version
 * @notice On-chain referral reward distribution contract with proxy support
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
 *   - Owner can fund the pool and withdraw if needed (with protection)
 *   - Referral code validation
 *   - Protocol-wide pause via SecurityGated (Layer 7)
 *   - Sybil attack prevention (cooldown + reserve protection)
 */
contract ReferralPoolUpgradeable is OwnableUpgradeable, ReentrancyGuardUpgradeable, SecurityGated {
    using SafeERC20 for IERC20;
    
    // ─── State Variables ─────────────────────────────────────────────────────
    
    /// @notice DWT token contract
    IERC20 public dwtToken;
    
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
    
    /// @notice Minimum time between referrals per referrer (Sybil prevention)
    uint256 public referralCooldown;
    
    /// @notice Track last referral timestamp per referrer
    mapping(address => uint256) public lastReferralTime;
    
    /// @notice Minimum reserve to protect pending rewards (prevent owner draining)
    uint256 public minReserve;

    // ─── Events ───────────────────────────────────────────────────────────────
    
    event ReferralRegistered(address referee, address referrer, uint256 timestamp);
    event ReferralRewardClaimed(address user, uint256 amount, uint256 timestamp);
    event PoolFunded(address from, uint256 amount);
    event TokensWithdrawn(address to, uint256 amount);
    event Paused(bool paused);
    event ReferralCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);
    event MinReserveUpdated(uint256 oldReserve, uint256 newReserve);
    
    // ─── Errors ───────────────────────────────────────────────────────────────
    
    error AlreadyClaimed();
    error ZeroAddress();
    error SelfReferral();
    error InvalidReferrer();
    error InsufficientPoolBalance();
    error TransferFailed();
    error ReferralCooldownActive();
    error InsufficientReserve();
    
    // ─── Constructor ─────────────────────────────────────────────────────────
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the ReferralPool contract
     * @param _dwtToken Address of the DWT token contract
     * @param _securityController Address of the security controller
     * @param _owner Address of the contract owner
     */
    function initialize(address _dwtToken, address _securityController, address _owner) 
        external initializer
    {
        if (_dwtToken == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();
        
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __SecurityGated_init(_securityController);
        
        dwtToken = IERC20(_dwtToken);
        referralCooldown = 1 hours;
        minReserve = 1000 * 1e18; // 1000 DWT reserve
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
        whenProtocolNotPaused
        nonReentrant 
    {
        address referee = msg.sender;
        
        // Validation checks
        if (referrer == address(0)) revert ZeroAddress();
        if (referrer == referee) revert SelfReferral();
        if (hasClaimedReferral[referee]) revert AlreadyClaimed();
        
        // Sybil prevention: Check referral cooldown
        if (lastReferralTime[referrer] > 0 && 
            block.timestamp < lastReferralTime[referrer] + referralCooldown) {
            revert ReferralCooldownActive();
        }
        
        // Check pool has enough balance for both rewards (20 DWT total)
        uint256 poolBalance = dwtToken.balanceOf(address(this));
        if (poolBalance < REWARD_AMOUNT * 2) revert InsufficientPoolBalance();
        
        // Mark as claimed
        hasClaimedReferral[referee] = true;
        referredBy[referee] = referrer;
        referrerStats[referrer]++;
        totalReferrals++;
        
        // Update last referral time for Sybil prevention
        lastReferralTime[referrer] = block.timestamp;
        
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
    function registerReferral(address referrer) 
        external 
        whenNotPaused 
        whenProtocolNotPaused
    {
        address referee = msg.sender;
        
        if (referrer == address(0)) revert ZeroAddress();
        if (referrer == referee) revert SelfReferral();
        if (referredBy[referee] != address(0)) revert AlreadyClaimed();
        
        // Sybil prevention: Check referral cooldown
        if (lastReferralTime[referrer] > 0 && 
            block.timestamp < lastReferralTime[referrer] + referralCooldown) {
            revert ReferralCooldownActive();
        }
        
        referredBy[referee] = referrer;
        lastReferralTime[referrer] = block.timestamp;
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
     * @dev Protected: Cannot withdraw below minimum reserve
     * @param to Address to send tokens to
     * @param amount Amount to withdraw
     */
    function withdrawTokens(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        
        uint256 poolBalance = dwtToken.balanceOf(address(this));
        uint256 remainingBalance = poolBalance - amount;
        
        // Prevent draining below minimum reserve
        if (remainingBalance < minReserve) revert InsufficientReserve();
        
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
    
    /**
     * @notice Set referral cooldown period (Sybil prevention)
     * @param newCooldown New cooldown period in seconds
     */
    function setReferralCooldown(uint256 newCooldown) external onlyOwner {
        uint256 oldCooldown = referralCooldown;
        referralCooldown = newCooldown;
        emit ReferralCooldownUpdated(oldCooldown, newCooldown);
    }
    
    /**
     * @notice Set minimum reserve to protect pending rewards
     * @param newReserve New minimum reserve amount
     */
    function setMinReserve(uint256 newReserve) external onlyOwner {
        uint256 oldReserve = minReserve;
        minReserve = newReserve;
        emit MinReserveUpdated(oldReserve, newReserve);
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
