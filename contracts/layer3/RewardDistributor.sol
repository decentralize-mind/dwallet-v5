// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../SecurityGated.sol";

/**
 * @title RewardDistributor
 * @notice Collects fees, swaps to ETH, and distributes with pause gating via Layer 7.
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
    function exactInputSingle(ExactInputSingleParams calldata params)
        external returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24  fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface IWETH {
    function withdraw(uint256 amount) external;
    function balanceOf(address) external view returns (uint256);
}

contract RewardDistributor is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    bytes32 public constant KEEPER_ROLE   = keccak256("KEEPER_ROLE");
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    IUniswapV3Router public immutable uniswapRouter;
    IUniswapV3Quoter public immutable uniswapQuoter;
    IWETH            public immutable weth;
    address          public immutable wethAddress;

    address public stakingPool;
    address public treasury;
    address[] public feeTokens;

    uint256 public distributionInterval;
    uint256 public lastDistribution;
    uint256 public stakingShareBps;
    uint256 public slippageToleranceBps;

    uint256 public constant BPS = 10_000;

    event Distributed(uint256 totalEth, uint256 toStaking, uint256 toTreasury, uint256 timestamp);
    event SwapFailed(address token, uint256 amount, bytes reason);
    event ConfigUpdated(string param);

    constructor(
        address _uniswapRouter,
        address _uniswapQuoter,
        address _weth,
        address _stakingPool,
        address _treasury,
        uint256 _distributionInterval,
        uint256 _stakingShareBps,
        address _securityController,
        address admin,
        address keeper,
        address guardian
    ) SecurityGated(_securityController) {
        require(_uniswapRouter != address(0), "Distributor: zero router");
        require(_weth          != address(0), "Distributor: zero weth");
        require(_stakingPool   != address(0), "Distributor: zero staking");
        require(_treasury      != address(0), "Distributor: zero treasury");
        require(_stakingShareBps <= BPS,       "Distributor: share overflow");

        uniswapRouter        = IUniswapV3Router(_uniswapRouter);
        uniswapQuoter        = IUniswapV3Quoter(_uniswapQuoter);
        weth                 = IWETH(_weth);
        wethAddress          = _weth;
        stakingPool          = _stakingPool;
        treasury             = _treasury;
        distributionInterval = _distributionInterval;
        stakingShareBps      = _stakingShareBps;
        slippageToleranceBps = 200;
        lastDistribution     = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(KEEPER_ROLE,        keeper);
        _grantRole(GUARDIAN_ROLE,      guardian);
    }

    function pause() external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)  { _unpause(); }

    /**
     * @notice Distribute rewards.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function distribute() external nonReentrant whenNotPaused whenProtocolNotPaused {
        require(
            block.timestamp >= lastDistribution + distributionInterval,
            "Distributor: interval not elapsed"
        );
        _executeDistribution();
    }

    /**
     * @notice Force distribution.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function forceDistribute() external nonReentrant whenNotPaused whenProtocolNotPaused onlyRole(KEEPER_ROLE) {
        _executeDistribution();
    }

    function _executeDistribution() internal {
        for (uint256 i = 0; i < feeTokens.length; i++) {
            address token = feeTokens[i];
            uint256 bal   = IERC20(token).balanceOf(address(this));
            if (bal == 0) continue;

            uint256 minOut = _getMinAmountOut(token, wethAddress, 3000, bal);
            IERC20(token).forceApprove(address(uniswapRouter), bal);

            try uniswapRouter.exactInputSingle(
                IUniswapV3Router.ExactInputSingleParams({
                    tokenIn:           token,
                    tokenOut:          wethAddress,
                    fee:               3000,
                    recipient:         address(this),
                    deadline:          block.timestamp + 300,
                    amountIn:          bal,
                    amountOutMinimum:  minOut,
                    sqrtPriceLimitX96: 0
                })
            ) returns (uint256) {
                // success
            } catch (bytes memory reason) {
                emit SwapFailed(token, bal, reason);
            }
        }

        uint256 wethBal = weth.balanceOf(address(this));
        if (wethBal > 0) {
            weth.withdraw(wethBal);
        }

        uint256 totalEth = address(this).balance;
        if (totalEth == 0) return;

        uint256 toStaking  = (totalEth * stakingShareBps) / BPS;
        uint256 toTreasury = totalEth - toStaking;

        if (toStaking > 0) {
            (bool ok, ) = stakingPool.call{value: toStaking}(
                abi.encodeWithSignature("notifyRewardAmount()")
            );
            if (!ok) {
                toTreasury += toStaking;
                toStaking   = 0;
            }
        }

        if (toTreasury > 0) {
            (bool ok2, ) = treasury.call{value: toTreasury}("");
            require(ok2, "Distributor: treasury transfer failed");
        }

        lastDistribution = block.timestamp;
        emit Distributed(totalEth, toStaking, toTreasury, block.timestamp);
    }

    function _getMinAmountOut(
        address tokenIn,
        address tokenOut,
        uint24  fee,
        uint256 amountIn
    ) internal returns (uint256 minOut) {
        try uniswapQuoter.quoteExactInputSingle(tokenIn, tokenOut, fee, amountIn, 0)
            returns (uint256 quoted)
        {
            minOut = (quoted * (BPS - slippageToleranceBps)) / BPS;
        } catch {
            minOut = 0;
        }
    }

    function addFeeToken(address token) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(token != address(0), "Distributor: zero token");
        feeTokens.push(token);
        emit ConfigUpdated("feeToken added");
    }

    function removeFeeToken(uint256 index) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(index < feeTokens.length, "Distributor: out of bounds");
        feeTokens[index] = feeTokens[feeTokens.length - 1];
        feeTokens.pop();
        emit ConfigUpdated("feeToken removed");
    }

    function setDistributionInterval(uint256 interval) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        distributionInterval = interval;
        emit ConfigUpdated("distributionInterval");
    }

    function setStakingShare(uint256 bps) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(bps <= BPS, "Distributor: share overflow");
        stakingShareBps = bps;
        emit ConfigUpdated("stakingShareBps");
    }

    function setSlippageTolerance(uint256 bps) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(bps <= 1000, "Distributor: slippage too high");
        slippageToleranceBps = bps;
        emit ConfigUpdated("slippageToleranceBps");
    }

    function setStakingPool(address pool) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(pool != address(0), "Distributor: zero pool");
        stakingPool = pool;
    }

    function setTreasury(address _treasury) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(_treasury != address(0), "Distributor: zero treasury");
        treasury = _treasury;
    }

    receive() external payable {}
}
