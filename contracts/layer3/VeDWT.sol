// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../layer7/SecurityGated.sol";

// DWT Token interface
interface IDWTTokenLocal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title VeDWT
 * @notice Vote-escrow token (non-transferable) for governance boosting
 * @dev Lock DWT for 1 week - 4 years to receive veDWT that decays linearly
 */
contract VeDWT is ReentrancyGuard, SecurityGated {
    using SafeERC20 for IERC20;
    
    // Lock structure
    struct Lock {
        int128 amount;
        int128 veDWTAmount;
        uint256 unlockTime;
        uint256 lockTime;
    }
    
    // State variables
    IERC20 public dwtToken;
    
    uint256 public constant MIN_LOCK_DURATION = 1 weeks;
    uint256 public constant MAX_LOCK_DURATION = 4 * 365 days;
    
    mapping(address => Lock) public locks; // user => Lock
    mapping(address => uint256) public veDWTBalance; // user => veDWT balance
    uint256 public totalVeDWT;
    uint256 public totalLocked;
    
    // Events
    event Deposited(address indexed user, uint256 amount, uint256 veDWTAmount, uint256 unlockTime);
    event Withdrawn(address indexed user, uint256 amount);
    event LockExtended(address indexed user, uint256 newUnlockTime, uint256 newVeDWTAmount);
    
    constructor(
        address _securityController,
        address _dwtToken
    ) SecurityGated(_securityController) {
        require(_dwtToken != address(0), "Invalid DWT token");
        dwtToken = IERC20(_dwtToken);
    }
    
    /**
     * @notice Lock DWT to receive veDWT
     * @param amount Amount of DWT to lock
     * @param unlockTime Lock duration (from now)
     */
    function createLock(uint256 amount, uint256 unlockTime) 
        external 
        nonReentrant 
    {
        require(amount > 0, "Invalid amount");
        require(unlockTime >= MIN_LOCK_DURATION, "Lock too short");
        require(unlockTime <= MAX_LOCK_DURATION, "Lock too long");
        
        // Cannot extend if lock exists and not expired
        if (locks[msg.sender].amount > 0) {
            require(
                block.timestamp >= locks[msg.sender].unlockTime,
                "Existing lock not expired"
            );
        }
        
        // Transfer DWT
        dwtToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate veDWT amount (linear decay)
        uint256 veDWTAmount = _calculateVeDWT(amount, unlockTime);
        
        // Create lock
        locks[msg.sender] = Lock({
            amount: int128(int256(amount)),
            veDWTAmount: int128(int256(veDWTAmount)),
            unlockTime: block.timestamp + unlockTime,
            lockTime: block.timestamp
        });
        
        veDWTBalance[msg.sender] = veDWTAmount;
        totalVeDWT += veDWTAmount;
        totalLocked += amount;
        
        emit Deposited(msg.sender, amount, veDWTAmount, block.timestamp + unlockTime);
    }
    
    /**
     * @notice Extend lock duration
     * @param newUnlockTime New unlock time (must be longer)
     */
    function extendLock(uint256 newUnlockTime) external nonReentrant {
        Lock storage userLock = locks[msg.sender];
        require(userLock.amount > 0, "No lock");
        require(block.timestamp < userLock.unlockTime, "Lock expired");
        
        uint256 currentTime = block.timestamp;
        uint256 absoluteUnlockTime = currentTime + newUnlockTime;
        
        require(
            absoluteUnlockTime > userLock.unlockTime,
            "Cannot shorten lock"
        );
        require(
            newUnlockTime <= MAX_LOCK_DURATION,
            "Lock too long"
        );
        
        // Recalculate veDWT with new duration
        uint256 remainingDWT = uint128(userLock.amount);
        uint256 newVeDWTAmount = _calculateVeDWT(remainingDWT, newUnlockTime);
        
        // Update totals
        totalVeDWT -= uint128(userLock.veDWTAmount);
        totalVeDWT += newVeDWTAmount;
        
        // Update lock
        userLock.veDWTAmount = int128(int256(newVeDWTAmount));
        userLock.unlockTime = absoluteUnlockTime;
        veDWTBalance[msg.sender] = newVeDWTAmount;
        
        emit LockExtended(msg.sender, absoluteUnlockTime, newVeDWTAmount);
    }
    
    /**
     * @notice Withdraw expired lock
     */
    function withdraw() external nonReentrant {
        Lock storage userLock = locks[msg.sender];
        require(userLock.amount > 0, "No lock");
        require(block.timestamp >= userLock.unlockTime, "Lock not expired");
        
        uint256 amount = uint128(userLock.amount);
        
        // Update totals
        totalVeDWT -= uint128(userLock.veDWTAmount);
        totalLocked -= amount;
        
        // Reset lock
        veDWTBalance[msg.sender] = 0;
        delete locks[msg.sender];
        
        // Return DWT
        dwtToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /**
     * @notice Calculate veDWT balance for a user at current time
     * @param user User address
     * @return Current veDWT balance
     */
    function balanceOf(address user) external view returns (uint256) {
        Lock storage userLock = locks[user];
        if (userLock.amount <= 0) return 0;
        
        // Linear decay calculation
        uint256 currentTime = block.timestamp;
        if (currentTime >= userLock.unlockTime) {
            return 0; // Expired
        }
        
        uint256 timeRemaining = userLock.unlockTime - currentTime;
        uint256 lockDuration = userLock.unlockTime - userLock.lockTime;
        
        return (uint128(userLock.veDWTAmount) * timeRemaining) / lockDuration;
    }
    
    /**
     * @notice Calculate veDWT amount for given lock parameters
     */
    function _calculateVeDWT(uint256 amount, uint256 duration) internal pure returns (uint256) {
        // Linear scaling: longer lock = more veDWT
        // 1 week = 5% of amount
        // 4 years = 100% of amount
        return (amount * duration) / MAX_LOCK_DURATION;
    }
    
    /**
     * @notice Get lock details for a user
     */
    function getLock(address user) external view returns (
        int128 amount,
        int128 veDWTAmount,
        uint256 unlockTime,
        uint256 lockTime
    ) {
        Lock storage userLock = locks[user];
        return (
            userLock.amount,
            userLock.veDWTAmount,
            userLock.unlockTime,
            userLock.lockTime
        );
    }
}
