// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../layer7/SecurityGated.sol";

/**
 * @notice ERC-3156 Flash Loan interface
 */
interface IFlashLoanReceiver {
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}

/**
 * @title FlashLoan
 * @notice ERC-3156 compliant flash loan pool
 * 
 * FEATURES:
 *   - Callback must return keccak256("ERC3156FlashBorrower.onFlashLoan")
 *   - Pool balance and fees tracked separately
 *   - 50% cap on single flash loan
 *   - Reentrancy guard prevents recursive loans
 *   - Configurable flash loan fees
 */
contract FlashLoan is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTANTS & ROLES
    // ─────────────────────────────────────────────────────────────────────────
    
    bytes32 public constant ADMIN_ROLE = keccak256("FLASHLOAN_ADMIN");
    bytes32 public constant GUARDIAN_ROLE = keccak256("FLASHLOAN_GUARDIAN");
    
    bytes32 public constant LAYER_ID = keccak256("LAYER_5_FLASHLOAN");
    
    /// @dev ERC-3156 callback return value
    bytes32 private constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");
    
    // ─────────────────────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────────────────────
    
    /// @dev Supported tokens for flash loans
    mapping(address => bool) public supportedTokens;
    
    /// @dev Flash loan fee in basis points (default 0.09% = 9 bps)
    mapping(address => uint256) public flashLoanFees;
    
    /// @dev Max flash loan amount per token (50% of pool balance)
    uint256 public constant MAX_FLASH_LOAN_PERCENT = 5000; // 50% in bps
    
    /// @dev Total fees collected per token
    mapping(address => uint256) public totalFeesCollected;
    
    /// @dev Flash loan statistics
    struct FlashLoanStats {
        uint256 totalLoans;
        uint256 totalVolume;
        uint256 lastLoanTimestamp;
    }
    
    mapping(address => FlashLoanStats) public tokenStats;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────────────
    
    event FlashLoanExecuted(
        address recipient,
        address token,
        uint256 amount,
        uint256 fee,
        address initiator
    );
    
    event TokenAdded(address token);
    event TokenRemoved(address token);
    event FeeUpdated(address token, uint256 newFee);
    event FeesCollected(address token, uint256 amount);
    event FeesWithdrawn(address token, uint256 amount, address to);
    
    // ─────────────────────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────────────────────
    
    error TokenNotSupported();
    error InsufficientLiquidity();
    error FlashLoanNotRepaid();
    error CallbackFailed();
    error ExceedsMaxLoanAmount();
    error ZeroAmount();
    error ZeroAddress();
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────
    
    constructor(
        address _admin,
        address _guardian,
        address _layer7Security
    ) SecurityGated(_layer7Security) {
        if (_admin == address(0) || _guardian == address(0)) revert ZeroAddress();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(GUARDIAN_ROLE, _guardian);
        
        // Default fee: 0.09% (9 bps)
        flashLoanFees[address(0)] = 9;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CORE FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Execute a flash loan
     * @param token Token to borrow
     * @param amount Amount to borrow
     * @param data Additional data to pass to callback
     * @return True if flash loan succeeded
     */
    function flashLoan(
        address token,
        uint256 amount,
        bytes calldata data
    ) external whenNotPaused nonReentrant withStateGuard(LAYER_ID) returns (bool) {
        if (amount == 0) revert ZeroAmount();
        if (!supportedTokens[token]) revert TokenNotSupported();
        
        // Calculate fee
        uint256 fee = _calculateFee(token, amount);
        uint256 amountToRepay = amount + fee;
        
        // Check liquidity and max loan amount
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (amount > balance) revert InsufficientLiquidity();
        
        // Enforce 50% max loan limit
        uint256 maxLoan = (balance * MAX_FLASH_LOAN_PERCENT) / 10000;
        if (amount > maxLoan) revert ExceedsMaxLoanAmount();
        
        // Transfer tokens to recipient
        IERC20(token).safeTransfer(msg.sender, amount);
        
        // Execute callback
        bytes32 callbackResult = IFlashLoanReceiver(msg.sender).onFlashLoan(
            msg.sender,
            token,
            amount,
            fee,
            data
        );
        
        if (callbackResult != CALLBACK_SUCCESS) revert CallbackFailed();
        
        // Repay loan
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        if (balanceAfter < balance + fee) revert FlashLoanNotRepaid();
        
        // Update stats
        tokenStats[token].totalLoans++;
        tokenStats[token].totalVolume += amount;
        tokenStats[token].lastLoanTimestamp = block.timestamp;
        
        // Track fees
        totalFeesCollected[token] += fee;
        
        emit FlashLoanExecuted(msg.sender, token, amount, fee, msg.sender);
        
        return true;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  TOKEN MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Add supported token
     * @param token Token address
     * @param fee Flash loan fee in bps
     */
    function addToken(address token, uint256 fee) external onlyRole(ADMIN_ROLE) {
        if (token == address(0)) revert ZeroAddress();
        
        supportedTokens[token] = true;
        flashLoanFees[token] = fee;
        
        emit TokenAdded(token);
        emit FeeUpdated(token, fee);
    }
    
    /**
     * @notice Remove supported token
     * @param token Token address
     */
    function removeToken(address token) external onlyRole(ADMIN_ROLE) {
        supportedTokens[token] = false;
        emit TokenRemoved(token);
    }
    
    /**
     * @notice Update flash loan fee for a token
     * @param token Token address
     * @param fee New fee in bps
     */
    function updateFee(address token, uint256 fee) external onlyRole(ADMIN_ROLE) {
        flashLoanFees[token] = fee;
        emit FeeUpdated(token, fee);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  FEE MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Withdraw collected fees
     * @param token Token address
     * @param to Recipient address
     */
    function withdrawFees(address token, address to) external onlyRole(ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        
        uint256 amount = totalFeesCollected[token];
        if (amount > 0) {
            totalFeesCollected[token] = 0;
            IERC20(token).safeTransfer(to, amount);
            emit FeesWithdrawn(token, amount, to);
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EMERGENCY FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Guardian halt - pause flash loans
     */
    function guardianHalt() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Admin resume - unpause flash loans
     */
    function adminResume() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Emergency token withdrawal (admin only)
     * @param token Token address
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyRole(ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Calculate flash loan fee
     * @param token Token address
     * @param amount Loan amount
     * @return Fee amount
     */
    function _calculateFee(address token, uint256 amount) internal view returns (uint256) {
        uint256 feeBps = flashLoanFees[token];
        if (feeBps == 0) {
            feeBps = flashLoanFees[address(0)]; // Use default fee
        }
        return (amount * feeBps) / 10000;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Get max flash loan amount for a token
     * @param token Token address
     * @return Max loan amount
     */
    function getMaxFlashLoan(address token) external view returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        return (balance * MAX_FLASH_LOAN_PERCENT) / 10000;
    }
    
    /**
     * @notice Get flash loan fee for a token
     * @param token Token address
     * @param amount Loan amount
     * @return Fee amount
     */
    function getFlashLoanFee(address token, uint256 amount) external view returns (uint256) {
        return _calculateFee(token, amount);
    }
    
    /**
     * @notice Check if token is supported
     * @param token Token address
     * @return True if supported
     */
    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }
}
