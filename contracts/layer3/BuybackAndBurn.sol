// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../layer7/SecurityGated.sol";

// DWT Token interface
interface IDWTToken {
    function burn(uint256 amount) external;
    function totalSupply() external view returns (uint256);
}

// SwapRouter interface
interface ISwapRouter {
    function swapExactIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut);
}

/**
 * @title BuybackAndBurn
 * @notice Deflationary buyback mechanism with TWAP guard
 * @dev Buys DWT from market and burns to reduce total supply
 */
contract BuybackAndBurn is AccessControl, ReentrancyGuard, SecurityGated {
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    
    // State variables
    IDWTToken public dwtToken;
    ISwapRouter public swapRouter;
    
    uint256 public cooldown; // Time between buybacks
    uint256 public lastBuybackTime;
    uint256 public maxSingleBuyback; // Maximum single buyback amount
    uint256 public slippageTolerance; // Slippage tolerance in BPS
    
    uint256 public constant MAX_COOLDOWN = 7 days;
    uint256 public constant MIN_COOLDOWN = 1 hours;
    uint256 public constant MAX_SLIPPAGE = 500; // 5%
    
    // Events
    event BuybackExecuted(address tokenIn, uint256 amountIn, uint256 dwtBought, uint256 dwtBurned);
    event CooldownUpdated(uint256 newCooldown);
    event MaxSingleBuybackUpdated(uint256 newMax);
    event SlippageToleranceUpdated(uint256 newSlippage);
    event SwapRouterUpdated(address newRouter);
    
    constructor(
        address _securityController,
        address _dwtToken,
        address _swapRouter
    ) SecurityGated(_securityController) {
        require(_dwtToken != address(0), "Invalid DWT token");
        require(_swapRouter != address(0), "Invalid swap router");
        
        dwtToken = IDWTToken(_dwtToken);
        swapRouter = ISwapRouter(_swapRouter);
        
        cooldown = 1 days;
        maxSingleBuyback = 10000 * 10**18; // 10,000 DWT
        slippageTolerance = 200; // 2%
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(KEEPER_ROLE, msg.sender);
    }
    
    /**
     * @notice Execute buyback
     * @param tokenIn Token to swap (e.g., WETH, USDC)
     * @param minDWTOut Minimum DWT to receive
     */
    function executeBuyback(address tokenIn, uint256 minDWTOut) 
        external 
        onlyRole(KEEPER_ROLE) 
        nonReentrant 
    {
        require(block.timestamp >= lastBuybackTime + cooldown, "Cooldown not met");
        
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance > 0, "No balance");
        require(balance <= maxSingleBuyback, "Exceeds max buyback");
        
        // Execute swap
        uint256 dwtReceived = swapRouter.swapExactIn(
            tokenIn,
            address(dwtToken),
            balance,
            minDWTOut,
            address(this),
            block.timestamp + 15 minutes
        );
        
        require(dwtReceived >= minDWTOut, "Insufficient output");
        
        // Burn DWT
        dwtToken.burn(dwtReceived);
        
        lastBuybackTime = block.timestamp;
        
        emit BuybackExecuted(tokenIn, balance, dwtReceived, dwtReceived);
    }
    
    /**
     * @notice Update cooldown period
     * @param newCooldown New cooldown in seconds
     */
    function updateCooldown(uint256 newCooldown) external onlyRole(ADMIN_ROLE) {
        require(newCooldown >= MIN_COOLDOWN && newCooldown <= MAX_COOLDOWN, "Invalid cooldown");
        cooldown = newCooldown;
        emit CooldownUpdated(newCooldown);
    }
    
    /**
     * @notice Update max single buyback
     * @param newMax New maximum
     */
    function updateMaxSingleBuyback(uint256 newMax) external onlyRole(ADMIN_ROLE) {
        require(newMax > 0, "Invalid max");
        maxSingleBuyback = newMax;
        emit MaxSingleBuybackUpdated(newMax);
    }
    
    /**
     * @notice Update slippage tolerance
     * @param newSlippage New slippage in BPS
     */
    function updateSlippageTolerance(uint256 newSlippage) external onlyRole(ADMIN_ROLE) {
        require(newSlippage <= MAX_SLIPPAGE, "Too high");
        slippageTolerance = newSlippage;
        emit SlippageToleranceUpdated(newSlippage);
    }
    
    /**
     * @notice Update swap router
     * @param newRouter New router address
     */
    function updateSwapRouter(address newRouter) external onlyRole(ADMIN_ROLE) {
        require(newRouter != address(0), "Invalid router");
        swapRouter = ISwapRouter(newRouter);
        emit SwapRouterUpdated(newRouter);
    }
    
    /**
     * @notice Get time until next buyback allowed
     */
    function getTimeUntilNextBuyback() external view returns (uint256) {
        if (block.timestamp >= lastBuybackTime + cooldown) {
            return 0;
        }
        return (lastBuybackTime + cooldown) - block.timestamp;
    }
}
