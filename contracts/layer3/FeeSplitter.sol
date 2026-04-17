// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../layer7/SecurityGated.sol";

/**
 * @title FeeSplitter
 * @notice Multi-destination fee splitter with per-token override capability
 * @dev Default split: 40% Treasury, 40% Rewards, 20% Buyback
 */
contract FeeSplitter is AccessControl, SecurityGated {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Split configuration
    struct SplitConfig {
        address treasury;
        address rewardDistributor;
        address buybackAndBurn;
        uint256 treasuryBps;
        uint256 rewardBps;
        uint256 buybackBps;
    }
    
    // Per-token override
    struct TokenOverride {
        address treasury;
        address rewardDistributor;
        address buybackAndBurn;
        uint256 treasuryBps;
        uint256 rewardBps;
        uint256 buybackBps;
        bool isActive;
    }
    
    // State variables
    SplitConfig public defaultConfig;
    mapping(address => TokenOverride) public tokenOverrides; // token => TokenOverride
    
    uint256 public constant TOTAL_BPS = 10000; // 100%
    
    // Events
    event DefaultConfigUpdated(
        address treasury,
        address rewardDistributor,
        address buybackAndBurn,
        uint256 treasuryBps,
        uint256 rewardBps,
        uint256 buybackBps
    );
    
    event TokenOverrideSet(
        address token,
        address treasury,
        address rewardDistributor,
        address buybackAndBurn,
        uint256 treasuryBps,
        uint256 rewardBps,
        uint256 buybackBps
    );
    
    event TokenOverrideRemoved(address token);
    
    event FeesSplit(address token, uint256 amount, address treasury, address rewards, address buyback);
    
    constructor(
        address _securityController,
        address _treasury,
        address _rewardDistributor,
        address _buybackAndBurn
    ) SecurityGated(_securityController) {
        require(_treasury != address(0), "Invalid treasury");
        require(_rewardDistributor != address(0), "Invalid reward distributor");
        require(_buybackAndBurn != address(0), "Invalid buyback");
        
        defaultConfig = SplitConfig({
            treasury: _treasury,
            rewardDistributor: _rewardDistributor,
            buybackAndBurn: _buybackAndBurn,
            treasuryBps: 4000, // 40%
            rewardBps: 4000,  // 40%
            buybackBps: 2000  // 20%
        });
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @notice Update default split configuration
     */
    function updateDefaultConfig(
        address _treasury,
        address _rewardDistributor,
        address _buybackAndBurn,
        uint256 _treasuryBps,
        uint256 _rewardBps,
        uint256 _buybackBps
    ) external onlyRole(ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid treasury");
        require(_rewardDistributor != address(0), "Invalid reward distributor");
        require(_buybackAndBurn != address(0), "Invalid buyback");
        require(
            _treasuryBps + _rewardBps + _buybackBps == TOTAL_BPS,
            "BPS must sum to 10000"
        );
        
        defaultConfig = SplitConfig({
            treasury: _treasury,
            rewardDistributor: _rewardDistributor,
            buybackAndBurn: _buybackAndBurn,
            treasuryBps: _treasuryBps,
            rewardBps: _rewardBps,
            buybackBps: _buybackBps
        });
        
        emit DefaultConfigUpdated(
            _treasury,
            _rewardDistributor,
            _buybackAndBurn,
            _treasuryBps,
            _rewardBps,
            _buybackBps
        );
    }
    
    /**
     * @notice Set per-token override
     */
    function setTokenOverride(
        address token,
        address _treasury,
        address _rewardDistributor,
        address _buybackAndBurn,
        uint256 _treasuryBps,
        uint256 _rewardBps,
        uint256 _buybackBps
    ) external onlyRole(ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid treasury");
        require(_rewardDistributor != address(0), "Invalid reward distributor");
        require(_buybackAndBurn != address(0), "Invalid buyback");
        require(
            _treasuryBps + _rewardBps + _buybackBps == TOTAL_BPS,
            "BPS must sum to 10000"
        );
        
        tokenOverrides[token] = TokenOverride({
            treasury: _treasury,
            rewardDistributor: _rewardDistributor,
            buybackAndBurn: _buybackAndBurn,
            treasuryBps: _treasuryBps,
            rewardBps: _rewardBps,
            buybackBps: _buybackBps,
            isActive: true
        });
        
        emit TokenOverrideSet(
            token,
            _treasury,
            _rewardDistributor,
            _buybackAndBurn,
            _treasuryBps,
            _rewardBps,
            _buybackBps
        );
    }
    
    /**
     * @notice Remove per-token override
     */
    function removeTokenOverride(address token) external onlyRole(ADMIN_ROLE) {
        require(tokenOverrides[token].isActive, "Override not active");
        delete tokenOverrides[token];
        emit TokenOverrideRemoved(token);
    }
    
    /**
     * @notice Split fees for a specific token
     * @param token Token address
     * @param amount Amount to split
     */
    function splitToken(address token, uint256 amount) external {
        require(amount > 0, "Invalid amount");
        
        // Transfer tokens to this contract first
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        _splitFees(token, amount);
    }
    
    /**
     * @notice Split all tokens held by this contract
     * @param token Token address
     */
    function splitAll(address token) external {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        _splitFees(token, balance);
    }
    
    /**
     * @notice Internal fee splitting logic
     */
    function _splitFees(address token, uint256 amount) internal {
        TokenOverride storage tokenOverride = tokenOverrides[token];
        
        address treasury;
        address rewardDistributor;
        address buybackAndBurn;
        uint256 treasuryBps;
        uint256 rewardBps;
        uint256 buybackBps;
        
        if (tokenOverride.isActive) {
            treasury = tokenOverride.treasury;
            rewardDistributor = tokenOverride.rewardDistributor;
            buybackAndBurn = tokenOverride.buybackAndBurn;
            treasuryBps = tokenOverride.treasuryBps;
            rewardBps = tokenOverride.rewardBps;
            buybackBps = tokenOverride.buybackBps;
        } else {
            treasury = defaultConfig.treasury;
            rewardDistributor = defaultConfig.rewardDistributor;
            buybackAndBurn = defaultConfig.buybackAndBurn;
            treasuryBps = defaultConfig.treasuryBps;
            rewardBps = defaultConfig.rewardBps;
            buybackBps = defaultConfig.buybackBps;
        }
        
        // Calculate amounts
        uint256 treasuryAmount = (amount * treasuryBps) / TOTAL_BPS;
        uint256 rewardAmount = (amount * rewardBps) / TOTAL_BPS;
        uint256 buybackAmount = (amount * buybackBps) / TOTAL_BPS;
        
        // Distribute
        if (treasuryAmount > 0) {
            IERC20(token).safeTransfer(treasury, treasuryAmount);
        }
        if (rewardAmount > 0) {
            IERC20(token).safeTransfer(rewardDistributor, rewardAmount);
        }
        if (buybackAmount > 0) {
            IERC20(token).safeTransfer(buybackAndBurn, buybackAmount);
        }
        
        emit FeesSplit(token, amount, treasury, rewardDistributor, buybackAndBurn);
    }
    
    /**
     * @notice Get configuration for a token
     */
    function getConfigForToken(address token) external view returns (
        address treasury,
        address rewardDistributor,
        address buybackAndBurn,
        uint256 treasuryBps,
        uint256 rewardBps,
        uint256 buybackBps
    ) {
        TokenOverride storage tokenOverride = tokenOverrides[token];
        
        if (tokenOverride.isActive) {
            return (
                tokenOverride.treasury,
                tokenOverride.rewardDistributor,
                tokenOverride.buybackAndBurn,
                tokenOverride.treasuryBps,
                tokenOverride.rewardBps,
                tokenOverride.buybackBps
            );
        } else {
            return (
                defaultConfig.treasury,
                defaultConfig.rewardDistributor,
                defaultConfig.buybackAndBurn,
                defaultConfig.treasuryBps,
                defaultConfig.rewardBps,
                defaultConfig.buybackBps
            );
        }
    }
}
