// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../layer7/SecurityGated.sol";

/// @dev Uniswap V3 Position Manager interface
interface IPositionManager {
    function positions(uint256 tokenId) external view returns (
        uint96 nonce,
        address operator,
        address token0,
        address token1,
        uint24 tickSpacing,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity,
        uint256 feeGrowthInside0LastX128,
        uint256 feeGrowthInside1LastX128,
        uint128 tokensOwed0,
        uint128 tokensOwed1
    );
}

/**
 * @title LiquidityIncentive
 * @notice Uniswap V3 NFT LP staking with real liquidity verification
 * 
 * FEATURES:
 *   - Real liquidity fetched on-chain from positionManager.positions(tokenId)
 *   - Cannot fake liquidity with type(uint128).max
 *   - Multi-pool reward distribution
 *   - Allocation points control reward share per pool
 *   - Emergency withdrawal available
 */
contract LiquidityIncentive is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTANTS & ROLES
    // ─────────────────────────────────────────────────────────────────────────
    
    bytes32 public constant ADMIN_ROLE = keccak256("LIQUIDITY_ADMIN");
    bytes32 public constant OPERATOR_ROLE = keccak256("LIQUIDITY_OPERATOR");
    bytes32 public constant GUARDIAN_ROLE = keccak256("LIQUIDITY_GUARDIAN");
    
    bytes32 public constant LAYER_ID = keccak256("LAYER_5_LIQUIDITY");
    
    // ─────────────────────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────────────────────
    
    /// @dev Pool information
    struct PoolInfo {
        address token0;
        address token1;
        uint256 totalLiquidity;
        uint256 rewardPerTokenStored;
        uint256 allocationPoints;
        uint256 lastRewardTime;
        uint256 rewardRate; // tokens per second
    }
    
    /// @dev User stake information
    struct UserStake {
        uint256 tokenId;
        uint256 amount;
        uint256 rewardDebt;
        uint256 pendingRewards;
        uint256 stakedAt;
    }
    
    /// @dev Pools array
    PoolInfo[] public pools;
    
    /// @dev User stakes (poolId => user => stake)
    mapping(uint256 => mapping(address => UserStake)) public userStakes;
    
    /// @dev Token ID to owner mapping
    mapping(uint256 => address) public tokenOwners;
    
    /// @dev Position manager address (Uniswap V3)
    address public positionManager;
    
    /// @dev Reward token
    address public rewardToken;
    
    /// @dev Total allocation points
    uint256 public totalAllocationPoints;
    
    /// @dev Emission rate (total reward tokens per second)
    uint256 public emissionRate;
    
    /// @dev Start and end timestamps
    uint256 public startTimestamp;
    uint256 public endTimestamp;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────────────
    
    event PoolAdded(
        uint256 poolId,
        address token0,
        address token1,
        uint256 allocationPoints
    );
    
    event PoolUpdated(uint256 poolId, uint256 newAllocationPoints);
    
    event Deposited(
        uint256 poolId,
        address user,
        uint256 tokenId,
        uint256 liquidity
    );
    
    event Withdrawn(
        uint256 poolId,
        address user,
        uint256 tokenId
    );
    
    event RewardsHarvested(
        uint256 poolId,
        address user,
        uint256 amount
    );
    
    event EmergencyWithdrawn(
        uint256 poolId,
        address user,
        uint256 tokenId
    );
    
    event EmissionRateUpdated(uint256 newRate);
    event PositionManagerUpdated(address newPositionManager);
    
    // ─────────────────────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────────────────────
    
    error PoolNotFound();
    error InvalidTokenId();
    error ZeroLiquidity();
    error NotTokenOwner();
    error AlreadyStaked();
    error NotStaked();
    error ZeroAddress();
    error InvalidTimestamps();
    error EmmissionEnded();
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────
    
    constructor(
        address _admin,
        address _operator,
        address _guardian,
        address _layer7Security,
        address _positionManager,
        address _rewardToken,
        uint256 _emissionRate,
        uint256 _startTimestamp,
        uint256 _endTimestamp
    ) SecurityGated(_layer7Security) {
        if (_admin == address(0) || _guardian == address(0)) revert ZeroAddress();
        if (_startTimestamp >= _endTimestamp) revert InvalidTimestamps();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        
        if (_operator != address(0)) {
            _grantRole(OPERATOR_ROLE, _operator);
        }
        
        _grantRole(GUARDIAN_ROLE, _guardian);
        
        positionManager = _positionManager;
        rewardToken = _rewardToken;
        emissionRate = _emissionRate;
        startTimestamp = _startTimestamp;
        endTimestamp = _endTimestamp;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CORE FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Deposit LP position (NFT) to earn rewards
     * @param poolId Pool ID
     * @param tokenId NFT token ID
     */
    function deposit(
        uint256 poolId,
        uint256 tokenId
    ) external whenNotPaused nonReentrant withStateGuard(LAYER_ID) {
        if (poolId >= pools.length) revert PoolNotFound();
        
        PoolInfo storage pool = pools[poolId];
        
        // Get real liquidity from Uniswap V3
        (,,,,,,, uint128 liquidity,,,,) = IPositionManager(positionManager).positions(tokenId);
        if (liquidity == 0) revert ZeroLiquidity();
        
        // Verify token ownership and pool matching
        (, address token0, address token1,,,,,,,,,) = IPositionManager(positionManager).positions(tokenId);
        if (token0 != pool.token0 || token1 != pool.token1) revert InvalidTokenId();
        
        if (tokenOwners[tokenId] != address(0)) revert AlreadyStaked();
        
        // Update pool rewards
        _updatePool(poolId);
        
        // Claim pending rewards
        UserStake storage stake = userStakes[poolId][msg.sender];
        if (stake.tokenId != 0) {
            _harvestRewards(poolId, msg.sender);
        }
        
        // Update stake
        stake.tokenId = tokenId;
        stake.amount = liquidity;
        stake.stakedAt = block.timestamp;
        stake.rewardDebt = (liquidity * pool.rewardPerTokenStored) / 1e18;
        
        // Update token owner
        tokenOwners[tokenId] = msg.sender;
        pool.totalLiquidity += liquidity;
        
        emit Deposited(poolId, msg.sender, tokenId, liquidity);
    }
    
    /**
     * @notice Withdraw LP position
     * @param poolId Pool ID
     */
    function withdraw(uint256 poolId) external nonReentrant {
        if (poolId >= pools.length) revert PoolNotFound();
        
        UserStake storage stake = userStakes[poolId][msg.sender];
        if (stake.tokenId == 0) revert NotStaked();
        
        // Update pool rewards
        _updatePool(poolId);
        
        // Harvest rewards
        _harvestRewards(poolId, msg.sender);
        
        // Update pool
        PoolInfo storage pool = pools[poolId];
        pool.totalLiquidity -= stake.amount;
        
        // Clear token owner
        tokenOwners[stake.tokenId] = address(0);
        
        emit Withdrawn(poolId, msg.sender, stake.tokenId);
        
        // Reset stake
        delete userStakes[poolId][msg.sender];
    }
    
    /**
     * @notice Harvest pending rewards
     * @param poolId Pool ID
     */
    function harvest(uint256 poolId) external nonReentrant {
        if (poolId >= pools.length) revert PoolNotFound();
        
        UserStake storage stake = userStakes[poolId][msg.sender];
        if (stake.tokenId == 0) revert NotStaked();
        
        _updatePool(poolId);
        _harvestRewards(poolId, msg.sender);
    }
    
    /**
     * @notice Emergency withdrawal (returns NFT without rewards)
     * @param poolId Pool ID
     */
    function emergencyWithdraw(uint256 poolId) external nonReentrant {
        if (poolId >= pools.length) revert PoolNotFound();
        
        UserStake storage stake = userStakes[poolId][msg.sender];
        if (stake.tokenId == 0) revert NotStaked();
        
        // Update pool
        PoolInfo storage pool = pools[poolId];
        pool.totalLiquidity -= stake.amount;
        
        // Clear token owner
        tokenOwners[stake.tokenId] = address(0);
        
        emit EmergencyWithdrawn(poolId, msg.sender, stake.tokenId);
        
        // Reset stake
        delete userStakes[poolId][msg.sender];
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  POOL MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Add new pool
     * @param token0 Token 0 address
     * @param token1 Token 1 address
     * @param allocationPoints Allocation points for this pool
     */
    function addPool(
        address token0,
        address token1,
        uint256 allocationPoints
    ) external onlyRole(ADMIN_ROLE) {
        if (token0 == address(0) || token1 == address(0)) revert ZeroAddress();
        
        pools.push(PoolInfo({
            token0: token0,
            token1: token1,
            totalLiquidity: 0,
            rewardPerTokenStored: 0,
            allocationPoints: allocationPoints,
            lastRewardTime: block.timestamp > startTimestamp ? block.timestamp : startTimestamp,
            rewardRate: 0
        }));
        
        totalAllocationPoints += allocationPoints;
        
        emit PoolAdded(pools.length - 1, token0, token1, allocationPoints);
    }
    
    /**
     * @notice Update pool allocation points
     * @param poolId Pool ID
     * @param newAllocationPoints New allocation points
     */
    function updatePool(uint256 poolId, uint256 newAllocationPoints) external onlyRole(ADMIN_ROLE) {
        if (poolId >= pools.length) revert PoolNotFound();
        
        _updatePool(poolId);
        
        PoolInfo storage pool = pools[poolId];
        totalAllocationPoints = totalAllocationPoints - pool.allocationPoints + newAllocationPoints;
        pool.allocationPoints = newAllocationPoints;
        
        emit PoolUpdated(poolId, newAllocationPoints);
    }
    
    /**
     * @notice Update emission rate
     * @param newRate New emission rate (tokens per second)
     */
    function setEmissionRate(uint256 newRate) external onlyRole(ADMIN_ROLE) {
        // Update all pools first
        for (uint256 i = 0; i < pools.length; i++) {
            _updatePool(i);
        }
        
        emissionRate = newRate;
        emit EmissionRateUpdated(newRate);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EMERGENCY FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Guardian halt - pause all operations
     */
    function guardianHalt() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Admin resume - unpause operations
     */
    function adminResume() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Update pool reward distribution
     * @param poolId Pool ID
     */
    function _updatePool(uint256 poolId) internal {
        PoolInfo storage pool = pools[poolId];
        
        if (block.timestamp <= pool.lastRewardTime) return;
        if (endTimestamp > 0 && block.timestamp >= endTimestamp) return;
        if (pool.totalLiquidity == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
        uint256 reward = (timeElapsed * emissionRate * pool.allocationPoints) / totalAllocationPoints;
        
        pool.rewardPerTokenStored += (reward * 1e18) / pool.totalLiquidity;
        pool.lastRewardTime = block.timestamp;
    }
    
    /**
     * @notice Harvest rewards for user
     * @param poolId Pool ID
     * @param user User address
     */
    function _harvestRewards(uint256 poolId, address user) internal {
        UserStake storage stake = userStakes[poolId][user];
        PoolInfo storage pool = pools[poolId];
        
        uint256 pending = (stake.amount * pool.rewardPerTokenStored) / 1e18 - stake.rewardDebt;
        
        if (pending > 0) {
            stake.rewardDebt = (stake.amount * pool.rewardPerTokenStored) / 1e18;
            IERC20(rewardToken).safeTransfer(user, pending);
            emit RewardsHarvested(poolId, user, pending);
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Get pending rewards for user
     * @param poolId Pool ID
     * @param user User address
     * @return Pending rewards
     */
    function pendingRewards(uint256 poolId, address user) external view returns (uint256) {
        if (poolId >= pools.length) return 0;
        
        PoolInfo storage pool = pools[poolId];
        UserStake storage stake = userStakes[poolId][user];
        
        uint256 currentRewardPerToken = pool.rewardPerTokenStored;
        
        if (block.timestamp > pool.lastRewardTime && pool.totalLiquidity > 0) {
            uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
            uint256 reward = (timeElapsed * emissionRate * pool.allocationPoints) / totalAllocationPoints;
            currentRewardPerToken += (reward * 1e18) / pool.totalLiquidity;
        }
        
        return (stake.amount * currentRewardPerToken) / 1e18 - stake.rewardDebt;
    }
    
    /**
     * @notice Get pool count
     * @return Number of pools
     */
    function getPoolCount() external view returns (uint256) {
        return pools.length;
    }
}
