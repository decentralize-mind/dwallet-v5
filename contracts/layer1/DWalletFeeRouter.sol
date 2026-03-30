// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../SecurityGated.sol";

interface IV3SwapRouter {
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
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IVotes {
    function getPastVotes(address account, uint256 timepoint) external view returns (uint256);
}

interface IDWTToken is IERC20, IVotes {
    function feeTierOf(address account) external view returns (uint8);
    function feeRateOf(address account) external view returns (uint16);
    function tier1Threshold() external view returns (uint256);
    function tier2Threshold() external view returns (uint256);
    function tier3Threshold() external view returns (uint256);
    function tier0FeeBps() external view returns (uint16);
    function tier1FeeBps() external view returns (uint16);
    function tier2FeeBps() external view returns (uint16);
    function tier3FeeBps() external view returns (uint16);
}

/**
 * @title DWalletFeeRouter
 * @notice Routes Uniswap V3 swaps with pause gating via Layer 7.
 */
contract DWalletFeeRouter is ReentrancyGuard, Ownable, SecurityGated {
    using SafeERC20 for IERC20;

    IV3SwapRouter public immutable uniswapRouter;
    IDWTToken public immutable dwtToken;
    address public treasury;

    uint16 public constant BPS = 10000;

    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeCollected,
        uint8   feeTier
    );
    event TreasuryUpdated(address indexed newTreasury);
    event TokensRescued(address indexed token, uint256 amount);

    constructor(
        address _uniswapRouter,
        address _dwtToken,
        address _treasury,
        address _securityController,
        address _initialOwner
    ) Ownable(_initialOwner) SecurityGated(_securityController) {
        uniswapRouter = IV3SwapRouter(_uniswapRouter);
        dwtToken = IDWTToken(_dwtToken);
        treasury = _treasury;
    }

    /**
     * @notice Performs a single-hop swap on Uniswap V3 after taking a protocol fee.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24  poolFee,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant whenProtocolNotPaused returns (uint256 amountOut) {
        require(amountIn > 0, "FeeRouter: zero amount");
        require(tokenIn != tokenOut, "FeeRouter: same token");

        uint16 feeBps = dwtToken.feeRateOf(msg.sender);

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 feeAmount  = (amountIn * feeBps) / BPS;
        uint256 swapAmount = amountIn - feeAmount;

        if (feeAmount > 0) {
            IERC20(tokenIn).safeTransfer(treasury, feeAmount);
        }

        IERC20(tokenIn).forceApprove(address(uniswapRouter), swapAmount);

        amountOut = uniswapRouter.exactInputSingle(
            IV3SwapRouter.ExactInputSingleParams({
                tokenIn:           tokenIn,
                tokenOut:          tokenOut,
                fee:               poolFee,
                recipient:         msg.sender,
                deadline:          deadline,
                amountIn:          swapAmount,
                amountOutMinimum:  amountOutMin,
                sqrtPriceLimitX96: 0
            })
        );

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut, feeAmount, dwtToken.feeTierOf(msg.sender));
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "FeeRouter: zero treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensRescued(token, amount);
    }
}
