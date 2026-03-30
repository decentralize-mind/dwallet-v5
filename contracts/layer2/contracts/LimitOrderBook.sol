// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "../../SecurityGated.sol";

/**
 * @title LimitOrderBook
 * @notice Off-chain fill, on-chain settlement limit order system.
 *         Gated by Layer 7 Protocol-wide pause state.
 */
contract LimitOrderBook is EIP712, Ownable, ReentrancyGuard, SecurityGated {
    using SafeERC20 for IERC20;
    using ECDSA     for bytes32;

    // ─────────────────────────────────────────────
    // EIP-712 Type Hash
    // ─────────────────────────────────────────────

    bytes32 public constant ORDER_TYPEHASH = keccak256(
        "LimitOrder("
        "address maker,"
        "address tokenIn,"
        "address tokenOut,"
        "uint256 amountIn,"
        "uint256 amountOutMin,"
        "uint256 nonce,"
        "uint256 expiry,"
        "address recipient"
        ")"
    );

    // ─────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────

    struct LimitOrder {
        address maker;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        uint256 nonce;
        uint256 expiry;
        address recipient;
    }

    // ─────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────

    /// @notice Filled input amount per order hash
    mapping(bytes32 => uint256) public filledAmountIn;

    /// @notice Cancelled nonces per maker
    mapping(address => mapping(uint256 => bool)) public cancelledNonces;

    /// @notice Filler fee in bps
    uint256 public fillerFeeBps = 10; // 0.10%
    uint256 public constant MAX_FILLER_FEE = 100; // 1%

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────

    event OrderFilled(
        bytes32 indexed orderHash,
        address indexed maker,
        address indexed filler,
        address tokenIn,
        address tokenOut,
        uint256 amountInFilled,
        uint256 amountOutSent,
        uint256 fillerFee
    );

    event OrderCancelled(bytes32 indexed orderHash, address indexed maker, uint256 nonce);
    event NonceCancelled(address indexed maker, uint256 nonce);
    event FillerFeeUpdated(uint256 newFeeBps);

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    constructor(
        address _owner,
        address _securityController
    )
        EIP712("LimitOrderBook", "1")
        Ownable(_owner)
        SecurityGated(_securityController)
    {}

    // ─────────────────────────────────────────────
    // Core: Fill
    // ─────────────────────────────────────────────

    /**
     * @notice Fill a signed limit order (partial or full).
     * @dev Gated by Protocol-wide pause/circuit-breaker via Layer 7.
     */
    function fillOrder(
        LimitOrder calldata order,
        bytes      calldata signature,
        uint256             amountInToFill
    ) external nonReentrant whenProtocolNotPaused {
        // ── Validation ──────────────────────────
        require(block.timestamp <= order.expiry, "LimitOrder: expired");
        require(order.amountIn > 0,              "LimitOrder: zero amountIn");
        require(amountInToFill > 0,              "LimitOrder: zero fill");

        bytes32 orderHash = _hashOrder(order);

        require(!cancelledNonces[order.maker][order.nonce], "LimitOrder: nonce cancelled");

        uint256 filled    = filledAmountIn[orderHash];
        uint256 remaining = order.amountIn - filled;
        require(remaining > 0,                   "LimitOrder: fully filled");
        require(amountInToFill <= remaining,      "LimitOrder: exceeds remaining");

        // ── Verify Signature ────────────────────
        address signer = ECDSA.recover(orderHash, signature);
        require(signer == order.maker, "LimitOrder: invalid signature");

        // ── Price Check ─────────────────────────
        uint256 proportionalOutMin = order.amountOutMin * amountInToFill / order.amountIn;

        // ── Compute Filler Fee ───────────────────
        uint256 fillerFee = amountInToFill * fillerFeeBps / 10_000;

        // ── Update State ────────────────────────
        filledAmountIn[orderHash] = filled + amountInToFill;

        // ── Token Transfers ──────────────────────
        address recipient = order.recipient == address(0) ? order.maker : order.recipient;

        // 1. Pull tokenOut from filler → recipient
        IERC20(order.tokenOut).safeTransferFrom(msg.sender, recipient, proportionalOutMin);

        // 2. Pull tokenIn from maker → filler (minus protocol fee)
        IERC20(order.tokenIn).safeTransferFrom(order.maker, msg.sender, amountInToFill - fillerFee);

        // 3. Pull filler fee portion of tokenIn → this contract
        if (fillerFee > 0) {
            IERC20(order.tokenIn).safeTransferFrom(order.maker, address(this), fillerFee);
        }

        emit OrderFilled(
            orderHash,
            order.maker,
            msg.sender,
            order.tokenIn,
            order.tokenOut,
            amountInToFill,
            proportionalOutMin,
            fillerFee
        );
    }

    // ─────────────────────────────────────────────
    // Cancellation
    // ─────────────────────────────────────────────

    /**
     * @notice Cancel a specific order by its hash (must be the maker).
     */
    function cancelOrder(LimitOrder calldata order) external {
        require(order.maker == msg.sender, "LimitOrder: not maker");
        bytes32 orderHash = _hashOrder(order);
        cancelledNonces[msg.sender][order.nonce] = true;
        emit OrderCancelled(orderHash, msg.sender, order.nonce);
    }

    /**
     * @notice Cancel all orders using a specific nonce (batch invalidation).
     */
    function cancelNonce(uint256 nonce) external {
        cancelledNonces[msg.sender][nonce] = true;
        emit NonceCancelled(msg.sender, nonce);
    }

    // ─────────────────────────────────────────────
    // View Helpers
    // ─────────────────────────────────────────────

    function getOrderHash(LimitOrder calldata order) external view returns (bytes32) {
        return _hashOrder(order);
    }

    function getRemainingAmountIn(LimitOrder calldata order)
        external
        view
        returns (uint256 remaining)
    {
        bytes32 h = _hashOrder(order);
        uint256 filled = filledAmountIn[h];
        if (filled >= order.amountIn) return 0;
        return order.amountIn - filled;
    }

    function isOrderValid(LimitOrder calldata order, bytes calldata signature)
        external
        view
        returns (bool valid, string memory reason)
    {
        if (block.timestamp > order.expiry)
            return (false, "expired");
        if (cancelledNonces[order.maker][order.nonce])
            return (false, "nonce cancelled");

        bytes32 h      = _hashOrder(order);
        uint256 filled = filledAmountIn[h];
        if (filled >= order.amountIn)
            return (false, "fully filled");

        address signer = ECDSA.recover(h, signature);
        if (signer != order.maker)
            return (false, "invalid signature");

        return (true, "");
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function setFillerFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FILLER_FEE, "LimitOrder: fee too high");
        fillerFeeBps = newFeeBps;
        emit FillerFeeUpdated(newFeeBps);
    }

    /**
     * @notice Sweep collected filler fees to treasury.
     */
    function sweepFees(address token, address to) external onlyOwner {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) IERC20(token).safeTransfer(to, bal);
    }

    // ─────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────

    function _hashOrder(LimitOrder calldata order) internal view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
            ORDER_TYPEHASH,
            order.maker,
            order.tokenIn,
            order.tokenOut,
            order.amountIn,
            order.amountOutMin,
            order.nonce,
            order.expiry,
            order.recipient
        )));
    }
}
