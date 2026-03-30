// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../SecurityGated.sol";

/**
 * @title StakingPool
 * @notice DWT → DWT auto-compounding staking pool with pause gating via Layer 7.
 */
contract StakingPool is ERC20, Ownable, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    bytes32 public constant LAYER_ID = keccak256("LAYER_4_LIQUIDITY");
    bytes32 public constant STAKE_ACTION = keccak256("STAKE_ACTION");
    bytes32 public constant WITHDRAW_ACTION = keccak256("WITHDRAW_ACTION");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor(
        address _token,
        address _admin,
        address _governor,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    ) ERC20("Staked DWT", "sDWT") SecurityGated(_securityController) {
        token = IERC20(_token);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    function pricePerShare() external view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 1e18;
        return totalDWT * 1e18 / supply;
    }

    function sharesToDWT(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return shares;
        return shares * totalDWT / supply;
    }

    function dwtToShares(uint256 dwtAmount) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0 || totalDWT == 0) return dwtAmount;
        return dwtAmount * supply / totalDWT;
    }

    /**
     * @notice Stake DWT.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Rate: withRateLimit(STAKE_ACTION, dwtAmount)
     *      3. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function deposit(uint256 dwtAmount)
        external
        nonReentrant
        whenProtocolNotPaused
        withStateGuard(LAYER_ID)
        withRateLimit(STAKE_ACTION, dwtAmount)
        returns (uint256 shares)
    {
        require(dwtAmount > 0, "StakingPool: zero deposit");

        uint256 supply = totalSupply();
        if (supply == 0 || totalDWT == 0) {
            shares = dwtAmount;
            if (supply == 0) {
                _mint(address(0xdead), MIN_SHARES);
                shares = dwtAmount - MIN_SHARES;
                totalDWT += MIN_SHARES;
            }
        } else {
            shares = dwtAmount * supply / totalDWT;
        }

        require(shares > 0, "StakingPool: zero shares");
        dwtToken.safeTransferFrom(msg.sender, address(this), dwtAmount);
        totalDWT += dwtAmount;

        _mint(msg.sender, shares);

        emit Deposited(msg.sender, dwtAmount, shares);
    }

    /**
     * @notice Withdraw DWT.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Time: withTimeLock(WITHDRAW_ACTION)
     *      3. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function withdraw(uint256 shares)
        external
        nonReentrant
        whenProtocolNotPaused
        withStateGuard(LAYER_ID)
        withTimeLock(WITHDRAW_ACTION)
        returns (uint256 dwtOut)
    {
        require(shares > 0, "StakingPool: zero shares");
        require(balanceOf(msg.sender) >= shares, "StakingPool: insufficient shares");

        uint256 grossDWT = sharesToDWT(shares);
        uint256 fee      = grossDWT * withdrawFeeBps / BASIS_POINTS;
        dwtOut           = grossDWT - fee;

        totalDWT -= dwtOut;
        _burn(msg.sender, shares);

        dwtToken.safeTransfer(msg.sender, dwtOut);
        emit Withdrawn(msg.sender, shares, dwtOut, fee);
    }

    /**
     * @notice Inject rewards.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function injectRewards(uint256 dwtAmount) external nonReentrant whenProtocolNotPaused {
        require(
            msg.sender == rewardDistributor || msg.sender == owner(),
            "StakingPool: not authorized"
        );
        require(dwtAmount > 0, "StakingPool: zero reward");

        dwtToken.safeTransferFrom(msg.sender, address(this), dwtAmount);
        totalDWT += dwtAmount;

        emit RewardsInjected(msg.sender, dwtAmount);
    }

    function setWithdrawFee(uint256 newFeeBps) external onlyOwner whenProtocolNotPaused {
        require(newFeeBps <= MAX_WITHDRAW_FEE, "StakingPool: fee too high");
        withdrawFeeBps = newFeeBps;
        emit WithdrawFeeUpdated(newFeeBps);
    }

    function setWithdrawCooldown(uint256 seconds_) external onlyOwner whenProtocolNotPaused {
        require(seconds_ <= 30 days, "StakingPool: cooldown too long");
        withdrawCooldown = seconds_;
        emit CooldownUpdated(seconds_);
    }

    function setRewardDistributor(address distributor) external onlyOwner whenProtocolNotPaused {
        rewardDistributor = distributor;
        emit RewardDistributorSet(distributor);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function _update(address from, address to, uint256 amount)
        internal
        override
    {
        require(
            from == address(0) || to == address(0),
            "StakingPool: sDWT non-transferable"
        );
        super._update(from, to, amount);
    }
}
