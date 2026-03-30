// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../SecurityGated.sol";

/**
 * @title DWTETHRateFeed
 * @notice On-chain DWT/ETH rate feed with pause gating via Layer 7.
 */
contract DWTETHRateFeed is AccessControl, SecurityGated {
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");

    uint256 public currentRate;
    uint256 public lastUpdated;
    uint256 public maxDeviationBps;
    uint256 public maxStaleness;

    uint256 public constant BPS         = 10_000;
    uint256 public constant MAX_DEVIATION_CEILING = 3_000;

    event RateUpdated(uint256 oldRate, uint256 newRate, address updater, bool isEmergency);
    event MaxDeviationUpdated(uint256 newMaxDeviationBps);
    event MaxStalenessUpdated(uint256 newMaxStaleness);

    constructor(
        address admin,
        address keeper,
        uint256 initialRate,
        uint256 _maxDeviationBps,
        uint256 _maxStaleness,
        address _securityController
    ) SecurityGated(_securityController) {
        require(admin        != address(0),                    "RateFeed: zero admin");
        require(initialRate  > 0,                              "RateFeed: zero initial rate");
        require(_maxDeviationBps <= MAX_DEVIATION_CEILING,     "RateFeed: deviation too high");
        require(_maxStaleness    >= 300,                       "RateFeed: staleness too short");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(KEEPER_ROLE,        keeper);

        currentRate      = initialRate;
        lastUpdated      = block.timestamp;
        maxDeviationBps  = _maxDeviationBps;
        maxStaleness     = _maxStaleness;
    }

    function getRate() external view returns (uint256 rate, bool isStale) {
        rate    = currentRate;
        isStale = (block.timestamp - lastUpdated) > maxStaleness;
    }

    /**
     * @notice Update rate (KEEPER_ROLE).
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function updateRate(uint256 newRate) external onlyRole(KEEPER_ROLE) whenProtocolNotPaused {
        require(newRate > 0, "RateFeed: zero rate");

        uint256 prev = currentRate;
        if (prev > 0) {
            uint256 deviation = newRate > prev
                ? ((newRate - prev) * BPS) / prev
                : ((prev - newRate) * BPS) / prev;
            require(deviation <= maxDeviationBps, "RateFeed: deviation too large");
        }

        uint256 old  = currentRate;
        currentRate  = newRate;
        lastUpdated  = block.timestamp;
        emit RateUpdated(old, newRate, msg.sender, false);
    }

    /**
     * @notice Emergency rate override (ADMIN_ROLE).
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function emergencySetRate(uint256 newRate) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(newRate > 0, "RateFeed: zero rate");
        uint256 old = currentRate;
        currentRate = newRate;
        lastUpdated = block.timestamp;
        emit RateUpdated(old, newRate, msg.sender, true);
    }

    function setMaxDeviation(uint256 bps) external onlyRole(ADMIN_ROLE) {
        require(bps <= MAX_DEVIATION_CEILING, "RateFeed: deviation ceiling exceeded");
        maxDeviationBps = bps;
        emit MaxDeviationUpdated(bps);
    }

    function setMaxStaleness(uint256 seconds_) external onlyRole(ADMIN_ROLE) {
        require(seconds_ >= 300, "RateFeed: staleness too short");
        maxStaleness = seconds_;
        emit MaxStalenessUpdated(seconds_);
    }
}
