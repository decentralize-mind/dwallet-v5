// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../SecurityGated.sol";

/**
 * @title VeDWT
 * @notice Vote-escrow DWT with pause gating via Layer 7.
 */
contract VeDWT is ReentrancyGuard, Ownable, SecurityGated {
    using SafeERC20 for IERC20;

    IERC20 public immutable dwtToken;

    struct LockedBalance {
        uint256 amount;
        uint256 end;
    }

    uint256 public constant WEEK     = 7 days;
    uint256 public constant MIN_LOCK = 1 weeks;
    uint256 public constant MAX_LOCK = 4 * 365 days;

    mapping(address => LockedBalance) public locked;

    mapping(uint256 => uint256) public totalSupplyAt;
    uint256 public epoch;

    event Locked(address indexed user, uint256 amount, uint256 unlockTime);
    event Unlocked(address indexed user, uint256 amount);
    event LockIncreased(address indexed user, uint256 additionalAmount);
    event LockExtended(address indexed user, uint256 newEnd);

    constructor(
        address _dwtToken,
        address _securityController,
        address initialOwner
    ) Ownable(initialOwner) SecurityGated(_securityController) {
        require(_dwtToken != address(0), "VeDWT: zero token");
        dwtToken = IERC20(_dwtToken);
    }

    // ─── Lock / Unlock ────────────────────────────────────────────────────────
    /**
     * @notice Create a new DWT lock.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function lock(uint256 amount, uint256 duration) external nonReentrant whenProtocolNotPaused {
        require(locked[msg.sender].amount == 0, "VeDWT: already locked");
        require(amount    > 0,          "VeDWT: zero amount");
        require(duration  >= MIN_LOCK,  "VeDWT: lock too short");
        require(duration  <= MAX_LOCK,  "VeDWT: lock too long");

        uint256 unlockTime = _roundToWeek(block.timestamp + duration);

        locked[msg.sender] = LockedBalance(amount, unlockTime);
        dwtToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Locked(msg.sender, amount, unlockTime);
    }

    /**
     * @notice Increase the locked DWT amount.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function increaseLock(uint256 additionalAmount) external nonReentrant whenProtocolNotPaused {
        LockedBalance storage lb = locked[msg.sender];
        require(lb.amount > 0,                        "VeDWT: no existing lock");
        require(lb.end > block.timestamp,             "VeDWT: lock expired");
        require(additionalAmount > 0,                 "VeDWT: zero amount");

        lb.amount += additionalAmount;
        dwtToken.safeTransferFrom(msg.sender, address(this), additionalAmount);

        emit LockIncreased(msg.sender, additionalAmount);
    }

    /**
     * @notice Extend an existing lock.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function extendLock(uint256 additionalWeeks) external nonReentrant whenProtocolNotPaused {
        require(additionalWeeks > 0, "VeDWT: zero extension");
        LockedBalance storage lb = locked[msg.sender];
        require(lb.amount > 0, "VeDWT: no existing lock");

        uint256 currentEnd = lb.end > block.timestamp ? lb.end : block.timestamp;
        uint256 newEnd     = _roundToWeek(currentEnd + additionalWeeks * WEEK);

        require(newEnd > lb.end, "VeDWT: cannot shorten lock");
        require(newEnd <= _roundToWeek(block.timestamp + MAX_LOCK), "VeDWT: exceeds max lock");

        lb.end = newEnd;
        emit LockExtended(msg.sender, newEnd);
    }

    /**
     * @notice Withdraw all locked DWT after lock expires.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function withdraw() external nonReentrant whenProtocolNotPaused {
        LockedBalance memory lb = locked[msg.sender];
        require(lb.amount > 0,              "VeDWT: nothing to withdraw");
        require(block.timestamp >= lb.end,  "VeDWT: lock not expired");

        uint256 amount = lb.amount;
        delete locked[msg.sender];

        dwtToken.safeTransfer(msg.sender, amount);
        emit Unlocked(msg.sender, amount);
    }

    // ─── Voting Power ─────────────────────────────────────────────────────────
    function balanceOf(address user) external view returns (uint256) {
        return _balanceOf(user, block.timestamp);
    }

    function balanceOfAt(address user, uint256 timestamp) external view returns (uint256) {
        return _balanceOf(user, timestamp);
    }

    function _balanceOf(address user, uint256 timestamp) internal view returns (uint256) {
        LockedBalance memory lb = locked[user];
        if (lb.amount == 0 || timestamp >= lb.end) return 0;
        return (lb.amount * (lb.end - timestamp)) / MAX_LOCK;
    }

    function totalSupply() external pure returns (uint256 total) {
        return 0;
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────
    function _roundToWeek(uint256 timestamp) internal pure returns (uint256) {
        return (timestamp / WEEK) * WEEK;
    }
}
