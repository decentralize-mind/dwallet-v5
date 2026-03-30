// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../SecurityGated.sol";

/**
 * @title BuybackAndBurn
 * @notice Buyback and burn DWT tokens with pause gating via Layer 7.
 */
interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256);
}

interface IBurnable {
    function burn(uint256 amount) external;
}

contract BuybackAndBurn is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    bytes32 public constant KEEPER_ROLE   = keccak256("KEEPER_ROLE");
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    IUniswapV3Router public immutable uniswapRouter;
    IERC20           public immutable dwtToken;

    uint256 public cooldown;
    uint256 public maxSingleBuyback;
    uint256 public lastBuyback;

    mapping(address => bool) public approvedInputTokens;

    uint256 public constant MIN_COOLDOWN = 1 hours;
    uint256 public constant BPS          = 10_000;

    event BuybackExecuted(
        address indexed inputToken,
        uint256 inputAmount,
        uint256 dwtReceived,
        uint256 dwtBurned
    );
    event TokenApproved(address token, bool approved);
    event ConfigUpdated(uint256 cooldown, uint256 maxSingleBuyback);
    event TokenRescued(address token, uint256 amount);

    constructor(
        address _uniswapRouter,
        address _dwtToken,
        uint256 _cooldown,
        uint256 _maxSingleBuyback,
        address _securityController,
        address admin,
        address keeper,
        address guardian
    ) SecurityGated(_securityController) {
        require(_uniswapRouter  != address(0), "Buyback: zero router");
        require(_dwtToken       != address(0), "Buyback: zero dwt");
        require(_cooldown       >= MIN_COOLDOWN, "Buyback: cooldown below floor");
        require(_maxSingleBuyback > 0,          "Buyback: zero max buyback");

        uniswapRouter   = IUniswapV3Router(_uniswapRouter);
        dwtToken        = IERC20(_dwtToken);
        cooldown        = _cooldown;
        maxSingleBuyback = _maxSingleBuyback;
        lastBuyback     = 0;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(KEEPER_ROLE,        keeper);
        _grantRole(GUARDIAN_ROLE,      guardian);
    }

    // ─── Emergency ────────────────────────────────────────────────────────────
    function pause() external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)  { _unpause(); }

    // ─── Buyback Execution ────────────────────────────────────────────────────
    /**
     * @notice Execute a DWT buyback and burn.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function executeBuyback(
        address inputToken,
        uint256 amountIn,
        uint256 minDwtOut,
        uint24  poolFee
    ) external nonReentrant whenNotPaused whenProtocolNotPaused onlyRole(KEEPER_ROLE) {
        require(approvedInputTokens[inputToken], "Buyback: token not approved");

        require(
            block.timestamp >= lastBuyback + cooldown,
            "Buyback: cooldown not elapsed"
        );

        uint256 toSpend = amountIn > maxSingleBuyback ? maxSingleBuyback : amountIn;

        IERC20(inputToken).forceApprove(address(uniswapRouter), toSpend);

        uint256 dwtReceived = uniswapRouter.exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn:           inputToken,
                tokenOut:          address(dwtToken),
                fee:               poolFee,
                recipient:         address(this),
                deadline:          block.timestamp + 300,
                amountIn:          toSpend,
                amountOutMinimum:  minDwtOut,
                sqrtPriceLimitX96: 0
            })
        );

        require(dwtReceived > 0, "Buyback: zero DWT received");

        uint256 dwtBurned = dwtReceived;
        try IBurnable(address(dwtToken)).burn(dwtReceived) {
            // burned via burn()
        } catch {
            dwtToken.safeTransfer(BURN_ADDRESS, dwtReceived);
        }

        lastBuyback = block.timestamp;
        emit BuybackExecuted(inputToken, toSpend, dwtReceived, dwtBurned);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function approveInputToken(address token, bool approved) external onlyRole(ADMIN_ROLE) {
        require(token != address(0), "Buyback: zero token");
        approvedInputTokens[token] = approved;
        emit TokenApproved(token, approved);
    }

    function setConfig(uint256 _cooldown, uint256 _maxSingleBuyback) external onlyRole(ADMIN_ROLE) {
        require(_cooldown        >= MIN_COOLDOWN, "Buyback: cooldown below 1 hour floor");
        require(_maxSingleBuyback > 0,            "Buyback: zero max buyback");
        cooldown         = _cooldown;
        maxSingleBuyback = _maxSingleBuyback;
        emit ConfigUpdated(_cooldown, _maxSingleBuyback);
    }

    function rescueToken(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(token != address(dwtToken), "Buyback: cannot rescue DWT");
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokenRescued(token, amount);
    }
}
