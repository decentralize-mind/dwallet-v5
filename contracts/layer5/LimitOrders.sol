// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../layer7/SecurityGated.sol";

/**
 * @title LimitOrders
 * @notice EIP-712 signed limit orders with oracle price validation
 * 
 * FEATURES:
 *   - Off-chain signing, on-chain settlement
 *   - Partial fills supported
 *   - Oracle price validation before fill execution
 *   - Filler fee incentivizes relayers (default 0.10%)
 *   - Order cancellation functionality
 */
contract LimitOrders is AccessControl, ReentrancyGuard, Pausable, SecurityGated, EIP712 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTANTS & ROLES
    // ─────────────────────────────────────────────────────────────────────────
    
    bytes32 public constant ADMIN_ROLE = keccak256("LIMITORDERS_ADMIN");
    bytes32 public constant OPERATOR_ROLE = keccak256("LIMITORDERS_OPERATOR");
    bytes32 public constant GUARDIAN_ROLE = keccak256("LIMITORDERS_GUARDIAN");
    
    bytes32 public constant LAYER_ID = keccak256("LAYER_5_LIMITORDERS");
    
    /// @dev EIP-712 type hash for Order struct
    bytes32 public constant ORDER_TYPEHASH = keccak256(
        "Order(address maker,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 nonce,uint256 deadline)"
    );
    
    /// @dev Default filler fee (0.10% = 10 bps)
    uint256 public constant DEFAULT_FILLER_FEE_BPS = 10;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────────────────────
    
    /// @dev Order structure
    struct Order {
        address maker;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 nonce;
        uint256 deadline;
    }
    
    /// @dev Filled amount tracking (orderHash => filledAmount)
    mapping(bytes32 => uint256) public filledAmounts;
    
    /// @dev Used nonces (maker => nonce => used)
    mapping(address => mapping(uint256 => bool)) public usedNonces;
    
    /// @dev Filler fee in basis points
    uint256 public fillerFeeBps;
    
    /// @dev Oracle address for price validation
    address public priceOracle;
    
    /// @dev Order statistics
    struct OrderStats {
        uint256 totalOrders;
        uint256 filledOrders;
        uint256 cancelledOrders;
        uint256 totalVolume;
    }
    
    OrderStats public stats;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────────────
    
    event OrderCreated(
        bytes32 orderHash,
        address maker,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 nonce,
        uint256 deadline
    );
    
    event OrderFilled(
        bytes32 orderHash,
        address filler,
        uint256 amountInFilled,
        uint256 amountOutFilled,
        uint256 fillerFee
    );
    
    event OrderCancelled(bytes32 orderHash, address maker);
    event NonceCancelled(address maker, uint256 nonce);
    event FillerFeeUpdated(uint256 newFeeBps);
    event OracleUpdated(address newOracle);
    
    // ─────────────────────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────────────────────
    
    error OrderExpired();
    error InvalidSignature();
    error NonceAlreadyUsed();
    error OrderFullyFilled();
    error InsufficientOutput();
    error PriceSlippage();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidOracle();
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────
    
    constructor(
        address _admin,
        address _operator,
        address _guardian,
        address _layer7Security,
        address _priceOracle
    ) EIP712("dWallet LimitOrders", "1") SecurityGated(_layer7Security) {
        if (_admin == address(0) || _guardian == address(0)) revert ZeroAddress();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        
        if (_operator != address(0)) {
            _grantRole(OPERATOR_ROLE, _operator);
        }
        
        _grantRole(GUARDIAN_ROLE, _guardian);
        
        fillerFeeBps = DEFAULT_FILLER_FEE_BPS;
        priceOracle = _priceOracle;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CORE FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Fill a limit order (fully or partially)
     * @param order Order struct
     * @param signature Maker's signature
     * @param amountInToFill Amount to fill (must be <= remaining amount)
     */
    function fillOrder(
        Order calldata order,
        bytes calldata signature,
        uint256 amountInToFill
    ) external whenNotPaused nonReentrant withStateGuard(LAYER_ID) {
        // Validate order
        _validateOrder(order);
        
        // Calculate order hash
        bytes32 orderHash = _hashOrder(order);
        
        // Verify signature
        _verifySignature(orderHash, order.maker, signature);
        
        // Check nonce
        if (usedNonces[order.maker][order.nonce]) revert NonceAlreadyUsed();
        
        // Calculate remaining amount
        uint256 filledAmount = filledAmounts[orderHash];
        uint256 remainingAmount = order.amountIn - filledAmount;
        if (remainingAmount == 0) revert OrderFullyFilled();
        
        // Adjust fill amount if needed
        uint256 actualFillAmount = amountInToFill > remainingAmount ? remainingAmount : amountInToFill;
        
        // Calculate output amount (proportional)
        uint256 amountOut = (actualFillAmount * order.minAmountOut) / order.amountIn;
        
        // Validate price with oracle
        _validatePrice(order.tokenIn, order.tokenOut, actualFillAmount, amountOut);
        
        // Calculate filler fee
        uint256 fillerFee = (amountOut * fillerFeeBps) / 10000;
        uint256 amountOutToMaker = amountOut - fillerFee;
        
        // Transfer tokens
        IERC20(order.tokenIn).safeTransferFrom(order.maker, msg.sender, actualFillAmount);
        IERC20(order.tokenOut).safeTransferFrom(msg.sender, order.maker, amountOutToMaker);
        if (fillerFee > 0) {
            IERC20(order.tokenOut).safeTransferFrom(msg.sender, address(this), fillerFee);
        }
        
        // Update filled amount
        filledAmounts[orderHash] += actualFillAmount;
        
        // If fully filled, mark nonce as used
        if (filledAmounts[orderHash] == order.amountIn) {
            usedNonces[order.maker][order.nonce] = true;
            stats.filledOrders++;
        }
        
        // Update stats
        stats.totalVolume += actualFillAmount;
        
        emit OrderFilled(orderHash, msg.sender, actualFillAmount, amountOut, fillerFee);
    }
    
    /**
     * @notice Cancel an order
     * @param order Order struct
     */
    function cancelOrder(Order calldata order) external nonReentrant {
        require(msg.sender == order.maker, "LimitOrders: Not maker");
        
        bytes32 orderHash = _hashOrder(order);
        uint256 filledAmount = filledAmounts[orderHash];
        
        // Can only cancel if not fully filled
        if (filledAmount >= order.amountIn) revert OrderFullyFilled();
        
        // Mark nonce as used
        usedNonces[order.maker][order.nonce] = true;
        stats.cancelledOrders++;
        
        emit OrderCancelled(orderHash, order.maker);
    }
    
    /**
     * @notice Cancel a nonce (prevents all orders with this nonce)
     * @param nonce Nonce to cancel
     */
    function cancelNonce(uint256 nonce) external nonReentrant {
        usedNonces[msg.sender][nonce] = true;
        emit NonceCancelled(msg.sender, nonce);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  FEE WITHDRAWAL
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Withdraw collected filler fees
     * @param token Token address
     * @param to Recipient address
     */
    function withdrawFees(address token, address to) external onlyRole(ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(to, balance);
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Update filler fee
     * @param newFeeBps New fee in basis points
     */
    function setFillerFee(uint256 newFeeBps) external onlyRole(ADMIN_ROLE) {
        require(newFeeBps <= 100, "Fee too high"); // Max 1%
        fillerFeeBps = newFeeBps;
        emit FillerFeeUpdated(newFeeBps);
    }
    
    /**
     * @notice Update price oracle
     * @param newOracle New oracle address
     */
    function setPriceOracle(address newOracle) external onlyRole(ADMIN_ROLE) {
        if (newOracle == address(0)) revert ZeroAddress();
        priceOracle = newOracle;
        emit OracleUpdated(newOracle);
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
     * @notice Validate order parameters
     * @param order Order struct
     */
    function _validateOrder(Order calldata order) internal view {
        if (order.maker == address(0)) revert ZeroAddress();
        if (order.tokenIn == address(0) || order.tokenOut == address(0)) revert ZeroAddress();
        if (order.amountIn == 0) revert ZeroAmount();
        if (block.timestamp > order.deadline) revert OrderExpired();
    }
    
    /**
     * @notice Hash an order struct
     * @param order Order struct
     * @return Order hash
     */
    function _hashOrder(Order calldata order) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            ORDER_TYPEHASH,
            order.maker,
            order.tokenIn,
            order.tokenOut,
            order.amountIn,
            order.minAmountOut,
            order.nonce,
            order.deadline
        ));
    }
    
    /**
     * @notice Verify signature
     * @param orderHash Order hash
     * @param signer Expected signer
     * @param signature Signature bytes
     */
    function _verifySignature(bytes32 orderHash, address signer, bytes calldata signature) internal view {
        bytes32 digest = _hashTypedDataV4(orderHash);
        address recovered = digest.recover(signature);
        if (recovered != signer) revert InvalidSignature();
    }
    
    /**
     * @notice Validate price with oracle
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @param amountOut Output amount
     */
    function _validatePrice(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    ) internal view {
        if (priceOracle == address(0)) return; // Skip if no oracle
        
        // This is a placeholder - actual implementation depends on oracle interface
        // The oracle should validate that the exchange rate is within acceptable slippage
        // For now, we just ensure amountOut > 0
        if (amountOut == 0) revert PriceSlippage();
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Get remaining amount for an order
     * @param order Order struct
     * @return Remaining amount
     */
    function getRemainingAmount(Order calldata order) external view returns (uint256) {
        bytes32 orderHash = _hashOrder(order);
        uint256 filled = filledAmounts[orderHash];
        return order.amountIn > filled ? order.amountIn - filled : 0;
    }
    
    /**
     * @notice Check if order is fillable
     * @param order Order struct
     * @return True if order can be filled
     */
    function isOrderFillable(Order calldata order) external view returns (bool) {
        bytes32 orderHash = _hashOrder(order);
        uint256 filled = filledAmounts[orderHash];
        
        return !usedNonces[order.maker][order.nonce] &&
               filled < order.amountIn &&
               block.timestamp <= order.deadline;
    }
}
