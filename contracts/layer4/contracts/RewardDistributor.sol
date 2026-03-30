// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../SecurityGated.sol";

interface IDWTStaking {
    function depositETHReward() external payable;
    function totalStaked() external view returns (uint256);
}

interface IStakingPool {
    function injectRewards(uint256 amount) external;
}

interface ISwapRouter {
    function swapExactIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        uint256 deadline
    ) external payable returns (uint256 amountOut);
}

interface IPriceOracle {
    function getPrice(address token0, address token1) external returns (uint256 price, bool isChainlink);
}

/**
 * @title RewardDistributor
 * @notice Fee → ETH routing contract.
 *         Gated by Layer 7 Protocol-wide pause state.
 *         Validates swaps against Layer 2 TWAP/Chainlink Oracle.
 */
contract RewardDistributor is Ownable, ReentrancyGuard, SecurityGated {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────
    uint256 public constant BASIS_POINTS = 10_000;

    // ─────────────────────────────────────────────
    // Allocation Config
    // ─────────────────────────────────────────────
    struct Allocation {
        uint256 dwtStakingBps;
        uint256 stakingPoolBps;
        uint256 boostedStakingBps;
        uint256 treasuryBps;
    }

    Allocation public allocation = Allocation({
        dwtStakingBps:     5_000, // 50%
        stakingPoolBps:    2_000, // 20%
        boostedStakingBps: 2_000, // 20%
        treasuryBps:       1_000  // 10%
    });

    // ─────────────────────────────────────────────
    // Targets
    // ─────────────────────────────────────────────
    IDWTStaking  public dwtStaking;
    IStakingPool public stakingPool;
    address      public boostedStaking;
    address      public treasury;
    address      public dwtToken;
    ISwapRouter  public swapRouter;
    IPriceOracle public priceOracle;
    address      public weth;

    mapping(address => bool) public acceptedTokens;
    address[] public tokenList;

    uint256 public maxSwapSlippageBps = 200; // 2%
    uint256 public minDistributeAmount = 0.01 ether;

    // ─────────────────────────────────────────────
    // Tracking
    // ─────────────────────────────────────────────
    uint256 public totalDistributed;
    uint256 public lastDistributionTimestamp;

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────
    event FeesReceived(address indexed token, uint256 amount);
    event TokenSwapped(address indexed token, uint256 tokenAmount, uint256 ethReceived);
    event ETHDistributed(
        uint256 toDWTStaking,
        uint256 toStakingPool,
        uint256 toBoostedStaking,
        uint256 toTreasury,
        uint256 total
    );
    event AllocationUpdated(Allocation newAllocation);
    event TokenAccepted(address indexed token, bool accepted);
    event TargetsUpdated();
    event OracleUpdated(address indexed oracle);

    bytes32 public constant LAYER_ID = keccak256("LAYER_4_LIQUIDITY");
    bytes32 public constant DISTRIBUTE_ACTION = keccak256("DISTRIBUTE_ACTION");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    constructor(
        address _dwtStaking,
        address _stakingPool,
        address _boostedStaking,
        address _treasury,
        address _dwtToken,
        address _swapRouter,
        address _priceOracle,
        address _weth,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify,
        address _owner
    ) Ownable(_owner) SecurityGated(_securityController) {
        require(_dwtStaking      != address(0), "RD: zero dwtStaking");
        require(_stakingPool     != address(0), "RD: zero stakingPool");
        require(_treasury        != address(0), "RD: zero treasury");
        require(_dwtToken        != address(0), "RD: zero dwt");
        require(_swapRouter      != address(0), "RD: zero swapRouter");
        require(_priceOracle     != address(0), "RD: zero oracle");
        require(_weth            != address(0), "RD: zero weth");

        dwtStaking      = IDWTStaking(_dwtStaking);
        stakingPool     = IStakingPool(_stakingPool);
        boostedStaking  = _boostedStaking;
        treasury        = _treasury;
        dwtToken        = _dwtToken;
        swapRouter      = ISwapRouter(_swapRouter);
        priceOracle     = IPriceOracle(_priceOracle);
        weth            = _weth;

        _initSecurityModules(_access, _time, _state, _rate, _verify);
    }

    // ─────────────────────────────────────────────
    // Fee Ingestion
    // ─────────────────────────────────────────────

    receive() external payable {
        emit FeesReceived(address(0), msg.value);
    }

    function receiveFeeToken(address token, uint256 amount) external nonReentrant whenProtocolNotPaused {
        require(acceptedTokens[token], "RD: token not accepted");
        require(amount > 0, "RD: zero amount");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit FeesReceived(token, amount);
    }

    // ─────────────────────────────────────────────
    // Distribution
    // ─────────────────────────────────────────────

    /**
     * @notice Distribute rewards.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Rate: withRateLimit(DISTRIBUTE_ACTION, 0)
     *      3. Access: withAccessLock(KEEPER_ROLE)
     *      4. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function distribute() 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withRateLimit(DISTRIBUTE_ACTION, 0)
        withAccessLock(KEEPER_ROLE)
    {
        _swapTokensToETH();

        uint256 ethBalance = address(this).balance;
        require(ethBalance >= minDistributeAmount, "RD: insufficient ETH");

        uint256 toDWTStaking     = ethBalance * allocation.dwtStakingBps     / BASIS_POINTS;
        uint256 toStakingPool    = ethBalance * allocation.stakingPoolBps     / BASIS_POINTS;
        uint256 toBoostedStaking = ethBalance * allocation.boostedStakingBps  / BASIS_POINTS;
        uint256 toTreasury       = ethBalance - toDWTStaking - toStakingPool - toBoostedStaking;

        if (toDWTStaking > 0 && dwtStaking.totalStaked() > 0) {
            dwtStaking.depositETHReward{value: toDWTStaking}();
        } else if (toDWTStaking > 0) {
            toTreasury += toDWTStaking;
        }

        if (toStakingPool > 0) {
            _buyDWTAndInject(toStakingPool);
        }

        if (toBoostedStaking > 0 && boostedStaking != address(0)) {
            (bool ok1, ) = payable(boostedStaking).call{value: toBoostedStaking}("");
            require(ok1, "RD: boostedStaking transfer failed");
        } else {
            toTreasury += toBoostedStaking;
        }

        if (toTreasury > 0) {
            (bool ok2, ) = payable(treasury).call{value: toTreasury}("");
            require(ok2, "RD: treasury transfer failed");
        }

        totalDistributed           += ethBalance;
        lastDistributionTimestamp   = block.timestamp;

        emit ETHDistributed(toDWTStaking, toStakingPool, toBoostedStaking, toTreasury, ethBalance);
    }

    // ─────────────────────────────────────────────
    // Internal Helpers
    // ─────────────────────────────────────────────

    /**
     * @dev Swaps all accepted fee tokens for ETH using Oracle validation.
     */
    function _swapTokensToETH() internal {
        for (uint256 i = 0; i < tokenList.length; i++) {
            address token = tokenList[i];
            if (!acceptedTokens[token]) continue;

            uint256 bal = IERC20(token).balanceOf(address(this));
            if (bal == 0) continue;

            // Oracle Validation: Get expected ETH out
            (uint256 price, ) = priceOracle.getPrice(token, weth);
            uint256 expectedOut = (bal * price) / 1e18;
            uint256 minOut = expectedOut * (BASIS_POINTS - maxSwapSlippageBps) / BASIS_POINTS;

            IERC20(token).approve(address(swapRouter), bal);

            try swapRouter.swapExactIn(
                token,
                address(0), // ETH
                bal,
                minOut,
                address(this),
                block.timestamp + 5 minutes
            ) returns (uint256 ethOut) {
                emit TokenSwapped(token, bal, ethOut);
            } catch {
                // Continue if fails
            }
        }
    }

    /**
     * @dev Buys DWT back from market and injects into Staking Pool.
     */
    function _buyDWTAndInject(uint256 ethAmount) internal {
        // Oracle Validation: Get expected DWT out
        (uint256 price, ) = priceOracle.getPrice(weth, dwtToken);
        uint256 expectedOut = (ethAmount * price) / 1e18;
        uint256 minOut = expectedOut * (BASIS_POINTS - maxSwapSlippageBps) / BASIS_POINTS;

        try swapRouter.swapExactIn{value: ethAmount}(
            address(0), // ETH in
            dwtToken,
            ethAmount,
            minOut,
            address(this),
            block.timestamp + 5 minutes
        ) returns (uint256 dwtBought) {
            if (dwtBought > 0) {
                IERC20(dwtToken).approve(address(stakingPool), dwtBought);
                stakingPool.injectRewards(dwtBought);
            }
        } catch {
            (bool ok, ) = payable(treasury).call{value: ethAmount}("");
            require(ok, "RD: fallback treasury failed");
        }
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────

    function setAllocation(
        uint256 dwtStakingBps_,
        uint256 stakingPoolBps_,
        uint256 boostedStakingBps_,
        uint256 treasuryBps_
    ) external onlyOwner whenProtocolNotPaused {
        require(
            dwtStakingBps_ + stakingPoolBps_ + boostedStakingBps_ + treasuryBps_ == BASIS_POINTS,
            "RD: allocations must sum to 100%"
        );
        allocation = Allocation({
            dwtStakingBps:     dwtStakingBps_,
            stakingPoolBps:    stakingPoolBps_,
            boostedStakingBps: boostedStakingBps_,
            treasuryBps:       treasuryBps_
        });
        emit AllocationUpdated(allocation);
    }

    function setAcceptedToken(address token, bool accepted) external onlyOwner whenProtocolNotPaused {
        if (accepted && !acceptedTokens[token]) {
            tokenList.push(token);
        }
        acceptedTokens[token] = accepted;
        emit TokenAccepted(token, accepted);
    }

    function setPriceOracle(address _priceOracle) external onlyOwner whenProtocolNotPaused {
        require(_priceOracle != address(0), "RD: zero oracle");
        priceOracle = IPriceOracle(_priceOracle);
        emit OracleUpdated(_priceOracle);
    }

    function setTargets(
        address _dwtStaking,
        address _stakingPool,
        address _boostedStaking,
        address _treasury
    ) external onlyOwner whenProtocolNotPaused {
        if (_dwtStaking     != address(0)) dwtStaking     = IDWTStaking(_dwtStaking);
        if (_stakingPool    != address(0)) stakingPool    = IStakingPool(_stakingPool);
        if (_boostedStaking != address(0)) boostedStaking = _boostedStaking;
        if (_treasury       != address(0)) treasury       = _treasury;
        emit TargetsUpdated();
    }

    function setMinDistributeAmount(uint256 amount) external onlyOwner whenProtocolNotPaused {
        minDistributeAmount = amount;
    }

    function setMaxSwapSlippage(uint256 bps) external onlyOwner whenProtocolNotPaused {
        require(bps <= 1000, "RD: slippage too high");
        maxSwapSlippageBps = bps;
    }

    function getTokenList() external view returns (address[] memory) {
        return tokenList;
    }
}
