// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../SecurityGated.sol";

/**
 * @title LimitOrders
 * @notice Limit order book with pause gating via Layer 7.
 */
interface IPriceOracle {
    function getPrice() external view returns (uint256);
}

contract LimitOrders is EIP712, AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    struct Order {
        address maker;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 targetPrice;
        bool    isBuy;
        uint256 deadline;
        uint256 nonce;
    }

    bytes32 public constant ORDER_TYPEHASH = keccak256(
        "Order(address maker,address tokenIn,address tokenOut,uint256 amountIn,"
        "uint256 targetPrice,bool isBuy,uint256 deadline,uint256 nonce)"
    );

    IPriceOracle public priceOracle;

    mapping(address => uint256) public nonces;
    mapping(bytes32 => bool)    public cancelled;
    mapping(bytes32 => uint256) public filledAmount;

    uint256 public executionFeeBps;
    uint256 public constant MAX_FEE_BPS = 100;
    uint256 public constant BPS         = 10_000;

    event OrderFilled(bytes32 indexed orderId, address indexed maker, address indexed keeper, uint256 inputFilled, uint256 outputReceived);
    event OrderCancelled(bytes32 indexed orderId, address indexed maker);
    event NonceCancelled(address indexed maker, uint256 newNonce);

    bytes32 public constant LAYER_ID = keccak256("LAYER_5_ORDERS");
    bytes32 public constant FILL_ACTION = keccak256("FILL_ACTION");

    constructor(
        address _priceOracle,
        uint256 _executionFeeBps,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify,
        address _admin,
        address _governor,
        address _guardian
    ) EIP712("DWalletLimitOrders", "1") SecurityGated(_securityController) {
        require(_admin != address(0),              "LimitOrders: zero admin");
        require(_guardian != address(0),           "LimitOrders: zero guardian");
        require(_priceOracle != address(0),        "LimitOrders: zero oracle");
        require(_executionFeeBps <= MAX_FEE_BPS,   "LimitOrders: fee too high");

        priceOracle      = IPriceOracle(_priceOracle);
        executionFeeBps  = _executionFeeBps;

        _initSecurityModules(_access, _time, _state, _rate, _verify);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(GUARDIAN_ROLE,      guardian);
    }

    function orderId(Order calldata order) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
            ORDER_TYPEHASH,
            order.maker,
            order.tokenIn,
            order.tokenOut,
            order.amountIn,
            order.targetPrice,
            order.isBuy,
            order.deadline,
            order.nonce
        )));
    }

    /**
     * @notice Execute a limit order.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Rate: withRateLimit(FILL_ACTION, fillAmount)
     *      3. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function fillOrder(
        Order calldata order,
        bytes calldata signature,
        uint256 fillAmount
    ) 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withRateLimit(FILL_ACTION, fillAmount)
        returns (bool) 
    {
        require(block.timestamp <= order.deadline, "LimitOrders: order expired");
        require(order.nonce == nonces[order.maker], "LimitOrders: stale nonce");

        bytes32 id = orderId(order);
        require(!cancelled[id], "LimitOrders: order cancelled");

        address signer = id.recover(signature);
        require(signer == order.maker, "LimitOrders: invalid signature");

        uint256 alreadyFilled = filledAmount[id];
        require(alreadyFilled < order.amountIn,    "LimitOrders: fully filled");
        uint256 remaining     = order.amountIn - alreadyFilled;
        uint256 inputForFill  = fillAmount > remaining ? remaining : fillAmount;
        require(inputForFill > 0, "LimitOrders: zero fill");

        uint256 currentPrice = priceOracle.getPrice();
        if (order.isBuy) {
            require(currentPrice <= order.targetPrice, "LimitOrders: price above target");
        } else {
            require(currentPrice >= order.targetPrice, "LimitOrders: price below target");
        }

        filledAmount[id] += inputForFill;
        uint256 outputAmount = (inputForFill * currentPrice) / 1e18;
        uint256 keeperFee    = (outputAmount * executionFeeBps) / BPS;
        uint256 makerOutput  = outputAmount - keeperFee;

        IERC20(order.tokenIn).safeTransferFrom(order.maker, address(this), inputForFill);
        IERC20(order.tokenOut).safeTransfer(order.maker,  makerOutput);
        if (keeperFee > 0) {
            IERC20(order.tokenOut).safeTransfer(msg.sender, keeperFee);
        }

        emit OrderFilled(id, order.maker, msg.sender, inputForFill, makerOutput);
    }

    /**
     * @notice Cancel a specific order.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function cancelOrder(Order calldata order) external whenNotPaused whenProtocolNotPaused {
        require(order.maker == msg.sender, "LimitOrders: not maker");
        bytes32 id = orderId(order);
        require(!cancelled[id], "LimitOrders: already cancelled");
        cancelled[id] = true;
        emit OrderCancelled(id, msg.sender);
    }

    /**
     * @notice Increment nonce — cancels all outstanding orders.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function incrementNonce() external whenNotPaused whenProtocolNotPaused {
        nonces[msg.sender]++;
        emit NonceCancelled(msg.sender, nonces[msg.sender]);
    }

    function setPriceOracle(address oracle) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(oracle != address(0), "LimitOrders: zero oracle");
        priceOracle = IPriceOracle(oracle);
    }

    function setExecutionFeeBps(uint256 bps) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(bps <= MAX_FEE_BPS, "LimitOrders: fee too high");
        executionFeeBps = bps;
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }
}
