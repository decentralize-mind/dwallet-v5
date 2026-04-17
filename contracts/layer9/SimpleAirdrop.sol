// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleAirdrop
 * @notice Simple airdrop contract for distributing 5 DWT tokens to new Toklo wallet users
 * @dev Users can claim once per wallet address. No backend required.
 * 
 * Security Features:
 * - One claim per address (prevents double-claiming from same wallet)
 * - Reentrancy protection
 * - Owner can pause/unpause in emergencies
 * - Owner can withdraw remaining tokens if needed
 * 
 * Future Enhancements (Phase 2):
 * - Email verification integration
 * - CAPTCHA protection
 * - Backend tracking for abuse detection
 */
contract SimpleAirdrop is Ownable, ReentrancyGuard {
    // ─── State Variables ─────────────────────────────────────────────────────
    
    /// @notice DWT token contract
    IERC20 public immutable dwtToken;
    
    /// @notice Amount of DWT tokens per claim (5 DWT)
    uint256 public constant CLAIM_AMOUNT = 5 * 1e18;
    
    /// @notice Track which addresses have claimed
    mapping(address => bool) public hasClaimed;
    
    /// @notice Total number of claims made
    uint256 public totalClaims;
    
    /// @notice Total DWT tokens distributed
    uint256 public totalDistributed;
    
    /// @notice Pause state for emergency stops
    bool public paused;
    
    // ─── Events ───────────────────────────────────────────────────────────────
    
    event Claimed(address claimant, uint256 amount, uint256 timestamp);
    event Paused(bool paused);
    event TokensDeposited(address from, uint256 amount);
    event TokensWithdrawn(address to, uint256 amount);
    
    // ─── Errors ───────────────────────────────────────────────────────────────
    
    error AlreadyClaimed();
    error InsufficientBalance();
    error ContractPaused();
    error ZeroAddress();
    
    // ─── Constructor ─────────────────────────────────────────────────────────
    
    /**
     * @param _dwtToken Address of the DWT ERC20 token contract
     */
    constructor(address _dwtToken) Ownable(msg.sender) {
        if (_dwtToken == address(0)) revert ZeroAddress();
        dwtToken = IERC20(_dwtToken);
    }
    
    // ─── Core Functions ───────────────────────────────────────────────────────
    
    /**
     * @notice Claim 5 DWT tokens (one-time per address)
     * @dev Transfers CLAIM_AMOUNT from this contract to claimant
     */
    function claim() external nonReentrant {
        if (paused) revert ContractPaused();
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();
        
        uint256 balance = dwtToken.balanceOf(address(this));
        if (balance < CLAIM_AMOUNT) revert InsufficientBalance();
        
        // Mark as claimed BEFORE transfer to prevent reentrancy
        hasClaimed[msg.sender] = true;
        totalClaims++;
        totalDistributed += CLAIM_AMOUNT;
        
        // Transfer tokens
        require(dwtToken.transfer(msg.sender, CLAIM_AMOUNT), "Transfer failed");
        
        emit Claimed(msg.sender, CLAIM_AMOUNT, block.timestamp);
    }
    
    /**
     * @notice Batch claim for multiple addresses (admin only)
     * @dev Useful for migrating from old airdrop system
     * @param recipients Array of addresses to send airdrop to
     */
    function batchClaim(address[] calldata recipients) external onlyOwner {
        if (paused) revert ContractPaused();
        
        uint256 balance = dwtToken.balanceOf(address(this));
        uint256 required = recipients.length * CLAIM_AMOUNT;
        if (balance < required) revert InsufficientBalance();
        
        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            if (recipient == address(0)) continue;
            if (hasClaimed[recipient]) continue;
            
            hasClaimed[recipient] = true;
            totalClaims++;
            totalDistributed += CLAIM_AMOUNT;
            
            require(dwtToken.transfer(recipient, CLAIM_AMOUNT), "Transfer failed");
        }
    }
    
    // ─── Admin Functions ─────────────────────────────────────────────────────
    
    /**
     * @notice Pause/unpause the airdrop contract
     * @param _paused New pause state
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }
    
    /**
     * @notice Withdraw remaining tokens (emergency only)
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external onlyOwner {
        uint256 balance = dwtToken.balanceOf(address(this));
        if (amount > balance) amount = balance;
        
        require(dwtToken.transfer(owner(), amount), "Withdraw failed");
        emit TokensWithdrawn(owner(), amount);
    }
    
    /**
     * @notice Deposit more DWT tokens into the airdrop pool
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAddress();
        
        require(dwtToken.transferFrom(msg.sender, address(this), amount), "Deposit failed");
        emit TokensDeposited(msg.sender, amount);
    }
    
    // ─── View Functions ───────────────────────────────────────────────────────
    
    /**
     * @notice Check if an address can claim
     * @param account Address to check
     * @return true if address can claim
     */
    function canClaim(address account) external view returns (bool) {
        return !hasClaimed[account] && !paused && dwtToken.balanceOf(address(this)) >= CLAIM_AMOUNT;
    }
    
    /**
     * @notice Get remaining airdrop balance
     * @return Balance of DWT tokens in contract
     */
    function getRemainingBalance() external view returns (uint256) {
        return dwtToken.balanceOf(address(this));
    }
    
    /**
     * @notice Get number of remaining claims possible
     * @return Number of claims that can still be made
     */
    function getRemainingClaims() external view returns (uint256) {
        return dwtToken.balanceOf(address(this)) / CLAIM_AMOUNT;
    }
}
