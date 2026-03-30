// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../SecurityGated.sol";

/**
 * @title Treasury
 * @notice Protocol treasury with pause gating via Layer 7.
 */
contract Treasury is AccessControl, ReentrancyGuard, SecurityGated {
    using SafeERC20 for IERC20;

    bytes32 public constant LAYER_ID = keccak256("LAYER_1_TREASURY");
    bytes32 public constant SPEND_ACTION = keccak256("SPEND_ACTION");
    bytes32 public constant LARGE_SPEND_ACTION = keccak256("LARGE_SPEND_ACTION");

    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");

    uint256 public constant LARGE_SPEND_THRESHOLD = 10 ether;

    event ETHReceived(address indexed from, uint256 amount);
    event ETHSpent(address indexed to, uint256 amount, string reason);
    event ERC20Spent(address indexed token, address indexed to, uint256 amount, string reason);
    event StakingFunded(address indexed stakingPool, uint256 amount, bool isEth);

    constructor(
        address _admin,
        address _governor,
        address _guardian,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    ) SecurityGated(_securityController) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);
        _grantRole(GUARDIAN_ROLE,      _guardian);

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    /**
     * @notice Send ETH from treasury to recipient.
     * @dev Gated by 5 Universal Locks:
     *      1. Access: onlyRole(GOVERNOR_ROLE)
     *      2. State: withStateGuard(LAYER_ID)
     *      3. Rate: withRateLimit(SPEND_ACTION, amount)
     *      4. Time & Verification: Enforced internally for LARGE_SPEND_THRESHOLD.
     */
    function spendFunds(
        address payable recipient,
        uint256 amount,
        string calldata reason,
        bytes32 hash,
        bytes calldata signature
    ) 
        external 
        nonReentrant 
        withAccessLock(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withRateLimit(SPEND_ACTION, amount)
    {
        require(recipient != address(0),         "Treasury: zero recipient");
        require(address(this).balance >= amount, "Treasury: insufficient ETH balance");
        require(amount > 0,                      "Treasury: zero amount");

        // Enforce extra locks for large amounts
        if (amount >= LARGE_SPEND_THRESHOLD) {
            timeLockModule.verifyTimeLock(msg.sender, LARGE_SPEND_ACTION);
            verifyModule.verifySignature(msg.sender, hash, signature);
            timeLockModule.startCooldown(msg.sender, LARGE_SPEND_ACTION);
        }

        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "Treasury: ETH transfer failed");

        emit ETHSpent(recipient, amount, reason);
    }

    /**
     * @notice Send ERC20 tokens from treasury.
     */
    function spendERC20(
        address token,
        address recipient,
        uint256 amount,
        string calldata reason,
        bytes32 hash,
        bytes calldata signature
    ) 
        external 
        nonReentrant 
        withAccessLock(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withRateLimit(SPEND_ACTION, amount)
    {
        require(recipient != address(0), "Treasury: zero recipient");
        require(amount    > 0,           "Treasury: zero amount");

        // Enforce extra locks for large amounts (simplified value check for ERC20)
        if (amount >= LARGE_SPEND_THRESHOLD) {
            timeLockModule.verifyTimeLock(msg.sender, LARGE_SPEND_ACTION);
            verifyModule.verifySignature(msg.sender, hash, signature);
            timeLockModule.startCooldown(msg.sender, LARGE_SPEND_ACTION);
        }

        IERC20(token).safeTransfer(recipient, amount);
        emit ERC20Spent(token, recipient, amount, reason);
    }

    /**
     * @notice Fund an ETH staking pool.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function fundStakingETH(
        address stakingPool,
        uint256 amount
    ) external nonReentrant onlyRole(GOVERNOR_ROLE) whenProtocolNotPaused {
        require(stakingPool != address(0),       "Treasury: zero staking pool");
        require(address(this).balance >= amount, "Treasury: insufficient ETH balance");
        require(amount > 0,                      "Treasury: zero amount");

        (bool ok, ) = stakingPool.call{value: amount}(
            abi.encodeWithSignature("notifyRewardAmount()")
        );
        require(ok, "Treasury: staking fund failed");

        emit StakingFunded(stakingPool, amount, true);
    }

    /**
     * @notice Fund an ERC20 staking pool.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function fundStakingERC20(
        address token,
        address stakingPool,
        uint256 amount
    ) external nonReentrant onlyRole(GOVERNOR_ROLE) whenProtocolNotPaused {
        require(stakingPool != address(0), "Treasury: zero staking pool");
        require(amount      > 0,           "Treasury: zero amount");

        IERC20(token).safeTransfer(stakingPool, amount);
        emit StakingFunded(stakingPool, amount, false);
    }

    function emergencyWithdrawETH(address payable to, uint256 amount)
        external
        nonReentrant
        withAccessLock(ADMIN_ROLE)
    {
        require(to != address(0),                "Treasury: zero to");
        require(address(this).balance >= amount, "Treasury: insufficient ETH");

        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Treasury: emergency ETH failed");
    }

    function emergencyWithdrawERC20(address token, address to, uint256 amount)
        external
        nonReentrant
        onlyRole(ADMIN_ROLE)
    {
        require(to != address(0), "Treasury: zero to");
        IERC20(token).safeTransfer(to, amount);
    }

    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    fallback() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }
}
