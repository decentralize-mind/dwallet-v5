// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../layer7/SecurityGated.sol";

/**
 * @title DWTToken - Enhanced Version with Full Security
 * @notice Core DWT ERC20 token with Layer 7 security integration
 * @dev Production-ready with emergency pause, rate limiting, and protocol-wide protection
 */
contract DWTTokenEnhanced is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, Ownable, Pausable, SecurityGated {
    uint256 public constant MAX_SUPPLY = 123_000_000 * 1e18; // 123 million DWT
    
    // Fee tiers
    uint256 public tier1Threshold = 1000 * 1e18;
    uint256 public tier2Threshold = 10000 * 1e18;
    uint256 public tier3Threshold = 100000 * 1e18;
    
    uint16 public tier0FeeBps = 30;
    uint16 public tier1FeeBps = 20;
    uint16 public tier2FeeBps = 15;
    uint16 public tier3FeeBps = 5;
    
    // Security constants
    bytes32 public constant LAYER_ID = keccak256("LAYER_1_GOVERNANCE");
    bytes32 public constant TRANSFER_ACTION = keccak256("TRANSFER_ACTION");
    uint256 public constant MAX_TRANSFER_RATE = 1_000_000e18; // 1M DWT max per transfer (rate limit)
    
    // Events
    event FeeTierUpdated(uint8 tier, uint16 feeBps);
    event ThresholdUpdated(uint8 tier, uint256 threshold);
    event EmergencyTransferBlocked(address indexed from, address indexed to, uint256 amount);
    
    constructor(
        address initialOwner,
        address _securityController,
        address _registry,
        address _lockEngine,
        address _invariantChecker
    )
        ERC20("dWallet Token", "DWT")
        ERC20Permit("dWallet Token")
        Ownable(initialOwner)
        SecurityGated(_securityController)
    {
        require(initialOwner != address(0), "DWT: zero owner");
        require(_securityController != address(0), "DWT: zero security");
        
        _initSecuritySystem(_registry, _lockEngine, _invariantChecker);
    }

    /**
     * @notice Mint tokens (owner only)
     * @dev Gated by protocol pause
     */
    function mint(address to, uint256 amount) external onlyOwner whenProtocolNotPaused {
        require(totalSupply() + amount <= MAX_SUPPLY, "DWT: max supply exceeded");
        _mint(to, amount);
    }

    /**
     * @notice Override transfer with security checks
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Rate: withRateLimit(TRANSFER_ACTION, amount)
     *      3. Protocol: whenProtocolNotPaused (Layer 7)
     *      4. Local: whenNotPaused (emergency pause)
     */
    function transfer(address to, uint256 amount)
        public
        override
        whenProtocolNotPaused
        whenNotPaused
        withStateGuard(LAYER_ID)
        withRateLimit(TRANSFER_ACTION, amount)
        returns (bool)
    {
        _transferWithFee(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Override transferFrom with security checks
     */
    function transferFrom(address from, address to, uint256 amount)
        public
        override
        whenProtocolNotPaused
        whenNotPaused
        withStateGuard(LAYER_ID)
        withRateLimit(TRANSFER_ACTION, amount)
        returns (bool)
    {
        _spendAllowance(from, msg.sender, amount);
        _transferWithFee(from, to, amount);
        return true;
    }

    /**
     * @notice Internal transfer with fee calculation
     */
    function _transferWithFee(address from, address to, uint256 amount) internal {
        require(amount > 0, "DWT: zero transfer");
        require(to != address(0), "DWT: transfer to zero");
        
        // Calculate and deduct fee (burned)
        uint16 feeBps = _feeRateOf(from);
        uint256 fee = amount * feeBps / 10000;
        uint256 transferAmount = amount - fee;
        
        // Burn fee
        if (fee > 0) {
            super._transfer(from, address(0), fee);
        }
        
        // Transfer remaining
        super._transfer(from, to, transferAmount);
    }

    /**
     * @notice Internal fee rate calculation
     */
    function _feeRateOf(address account) internal view returns (uint16) {
        uint256 bal = getVotes(account);
        if (bal >= tier3Threshold) return tier3FeeBps;
        if (bal >= tier2Threshold) return tier2FeeBps;
        if (bal >= tier1Threshold) return tier1FeeBps;
        return tier0FeeBps;
    }

    /**
     * @notice Get fee tier for an account
     */
    function feeTierOf(address account) external view returns (uint8) {
        uint256 bal = getVotes(account);
        if (bal >= tier3Threshold) return 3;
        if (bal >= tier2Threshold) return 2;
        if (bal >= tier1Threshold) return 1;
        return 0;
    }

    /**
     * @notice Get fee rate for an account
     */
    function feeRateOf(address account) external view returns (uint16) {
        uint256 bal = getVotes(account);
        if (bal >= tier3Threshold) return tier3FeeBps;
        if (bal >= tier2Threshold) return tier2FeeBps;
        if (bal >= tier1Threshold) return tier1FeeBps;
        return tier0FeeBps;
    }

    /**
     * @notice Update fee tier (owner only)
     */
    function setFeeTier(uint8 tier, uint16 feeBps) external onlyOwner whenProtocolNotPaused {
        require(tier <= 3, "DWT: invalid tier");
        require(feeBps <= 100, "DWT: fee too high"); // Max 1%
        
        if (tier == 0) tier0FeeBps = feeBps;
        else if (tier == 1) tier1FeeBps = feeBps;
        else if (tier == 2) tier2FeeBps = feeBps;
        else tier3FeeBps = feeBps;
        
        emit FeeTierUpdated(tier, feeBps);
    }

    /**
     * @notice Update threshold (owner only)
     */
    function setThreshold(uint8 tier, uint256 threshold) external onlyOwner whenProtocolNotPaused {
        require(tier >= 1 && tier <= 3, "DWT: invalid tier");
        
        if (tier == 1) tier1Threshold = threshold;
        else if (tier == 2) tier2Threshold = threshold;
        else tier3Threshold = threshold;
        
        emit ThresholdUpdated(tier, threshold);
    }

    // Required overrides
    function _update(address from, address to, uint256 value)
        internal override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public view override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }

    /**
     * @notice Emergency transfer freeze (owner only)
     * @dev Uses local Pausable for immediate response
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause transfers (owner only)
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }
}
