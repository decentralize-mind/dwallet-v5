// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../SecurityGated.sol";

/**
 * @title LiquidityIncentive
 * @notice Uniswap V3 LP staking with pause gating via Layer 7.
 */
interface INonfungiblePositionManager {
    struct Position {
        uint96  nonce;
        address operator;
        address token0;
        address token1;
        uint24  fee;
        int24   tickLower;
        int24   tickUpper;
        uint128 liquidity;
        uint256 feeGrowthInside0LastX128;
        uint256 feeGrowthInside1LastX128;
        uint128 tokensOwed0;
        uint128 tokensOwed1;
    }

    function positions(uint256 tokenId) external view returns (Position memory);
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee()    external view returns (uint24);
}

contract LiquidityIncentive is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    INonfungiblePositionManager public immutable positionManager;
    IERC20                      public immutable rewardToken;
    address                     public immutable expectedPool;
    address                     public immutable token0;
    address                     public immutable token1;
    uint24                      public immutable poolFee;

    struct StakedPosition {
        address owner;
        uint128 liquidity;
        uint256 rewardDebt;
    }

    mapping(uint256 => StakedPosition) public stakedPositions;
    mapping(address => uint256[])      public userTokenIds;

    uint256 public rewardPerLiquidityStored;
    uint256 public totalLiquidity;
    uint256 public lastUpdateTime;
    uint256 public rewardRate;
    uint256 public periodFinish;
    uint256 public rewardsDuration;

    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public userRewardPerLiquidityPaid;

    event Staked(address indexed user, uint256 indexed tokenId, uint128 liquidity);
    event Unstaked(address indexed user, uint256 indexed tokenId, uint256 reward);
    event EmergencyUnstaked(address indexed user, uint256 indexed tokenId);
    event RewardAdded(uint256 reward);

    constructor(
        address _positionManager,
        address _rewardToken,
        address _expectedPool,
        uint256 _rewardsDuration,
        address _securityController,
        address admin,
        address guardian
    ) SecurityGated(_securityController) {
        require(admin != address(0), "LiqIncentive: zero admin");
        require(guardian != address(0), "LiqIncentive: zero guardian");
        require(_positionManager != address(0), "LiqIncentive: zero pm");
        require(_rewardToken     != address(0), "LiqIncentive: zero reward");
        require(_expectedPool    != address(0), "LiqIncentive: zero pool");

        positionManager = INonfungiblePositionManager(_positionManager);
        rewardToken     = IERC20(_rewardToken);
        expectedPool    = _expectedPool;
        rewardsDuration = _rewardsDuration;

        if (_expectedPool.code.length > 0) {
            token0  = IUniswapV3Pool(_expectedPool).token0();
            token1  = IUniswapV3Pool(_expectedPool).token1();
            poolFee = IUniswapV3Pool(_expectedPool).fee();
        } else {
            token0  = address(0);
            token1  = address(0);
            poolFee = 0;
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(GUARDIAN_ROLE,      guardian);
    }

    modifier updateReward(address user) {
        rewardPerLiquidityStored = rewardPerLiquidity();
        lastUpdateTime           = _lastTimeRewardApplicable();
        if (user != address(0)) {
            pendingRewards[user]               += _earned(user);
            userRewardPerLiquidityPaid[user]    = rewardPerLiquidityStored;
        }
        _;
    }

    /**
     * @notice Stake a Uniswap V3 LP NFT position.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function stake(uint256 tokenId)
        external
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
        updateReward(msg.sender)
    {
        require(positionManager.ownerOf(tokenId) == msg.sender, "LiqIncentive: not NFT owner");

        INonfungiblePositionManager.Position memory pos = positionManager.positions(tokenId);
        uint128 liquidity = pos.liquidity;
        require(liquidity > 0, "LiqIncentive: zero liquidity");

        require(pos.token0 == token0 && pos.token1 == token1 && pos.fee == poolFee,
                "LiqIncentive: wrong pool");

        positionManager.safeTransferFrom(msg.sender, address(this), tokenId);

        stakedPositions[tokenId] = StakedPosition({
            owner:      msg.sender,
            liquidity:  liquidity,
            rewardDebt: rewardPerLiquidityStored
        });

        totalLiquidity += liquidity;
        userTokenIds[msg.sender].push(tokenId);

        emit Staked(msg.sender, tokenId, liquidity);
    }

    /**
     * @notice Unstake a Uniswap V3 LP NFT position.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function unstake(uint256 tokenId)
        external
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
        updateReward(msg.sender)
    {
        StakedPosition memory sp = stakedPositions[tokenId];
        require(sp.owner == msg.sender, "LiqIncentive: not staker");

        delete stakedPositions[tokenId];
        totalLiquidity -= sp.liquidity;
        _removeUserTokenId(msg.sender, tokenId);

        uint256 reward = pendingRewards[msg.sender];
        if (reward > 0) {
            pendingRewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
        }

        positionManager.safeTransferFrom(address(this), msg.sender, tokenId);
        emit Unstaked(msg.sender, tokenId, reward);
    }

    function emergencyUnstake(uint256 tokenId) external nonReentrant {
        StakedPosition memory sp = stakedPositions[tokenId];
        require(sp.owner == msg.sender, "LiqIncentive: not staker");

        delete stakedPositions[tokenId];
        totalLiquidity -= sp.liquidity;
        _removeUserTokenId(msg.sender, tokenId);
        delete pendingRewards[msg.sender];

        positionManager.safeTransferFrom(address(this), msg.sender, tokenId);
        emit EmergencyUnstaked(msg.sender, tokenId);
    }

    function rewardPerLiquidity() public view returns (uint256) {
        if (totalLiquidity == 0) return rewardPerLiquidityStored;
        return rewardPerLiquidityStored
            + ((_lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18) / totalLiquidity;
    }

    function _lastTimeRewardApplicable() internal view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function _earned(address user) internal view returns (uint256 total) {
        uint256[] storage ids = userTokenIds[user];
        for (uint256 i = 0; i < ids.length; i++) {
            StakedPosition storage sp = stakedPositions[ids[i]];
            total += (sp.liquidity * (rewardPerLiquidityStored - userRewardPerLiquidityPaid[user])) / 1e18;
        }
    }

    function notifyRewardAmount(uint256 reward) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused updateReward(address(0)) {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            rewardRate = (reward + remaining * rewardRate) / rewardsDuration;
        }
        require(rewardRate > 0, "LiqIncentive: zero reward rate");
        require(rewardRate * rewardsDuration <= rewardToken.balanceOf(address(this)),
                "LiqIncentive: reward too high for balance");

        lastUpdateTime = block.timestamp;
        periodFinish   = block.timestamp + rewardsDuration;
        emit RewardAdded(reward);
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function _removeUserTokenId(address user, uint256 tokenId) internal {
        uint256[] storage ids = userTokenIds[user];
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == tokenId) {
                ids[i] = ids[ids.length - 1];
                ids.pop();
                break;
            }
        }
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
