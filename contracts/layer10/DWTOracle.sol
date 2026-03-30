// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IDWTOracle
 * @notice Minimal oracle interface used by Options, Perpetuals, and Vaults.
 *         Implement with a Chainlink aggregator wrapper or custom TWAP oracle.
 */
interface IDWTOracle {
    /// @notice Returns the latest DWT/USD price with 18 decimal precision.
    function latestPrice() external view returns (uint256 price);

    /// @notice Returns the timestamp of the last price update.
    function lastUpdated() external view returns (uint256 timestamp);
}

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../SecurityGated.sol";

/**
 * @title DWTMockOracle
 * @notice Simple mock oracle for testing – committee can set the price manually.
 */
contract DWTMockOracle is IDWTOracle, AccessControl, SecurityGated {
    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    
    bytes32 public constant LAYER_ID      = keccak256("LAYER_10_ECOSYSTEM");

    uint256 private _price;
    uint256 private _lastUpdated;

    constructor(
        uint256 initialPrice, 
        address _admin,
        address _governor,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    ) SecurityGated(_securityController) {
        _price       = initialPrice;
        _lastUpdated = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    /**
     * @notice Set the DWT price. Requires Committee Multi-Sig.
     */
    function setPrice(uint256 newPrice, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    {
        _price       = newPrice;
        _lastUpdated = block.timestamp;
    }

    function latestPrice() external view override withStateGuard(LAYER_ID) returns (uint256) {
        return _price;
    }

    function lastUpdated() external view override returns (uint256) {
        return _lastUpdated;
    }
}

/**
 * @title DWTChainlinkOracle
 * @notice Production oracle wrapping a Chainlink AggregatorV3 feed.
 */
interface AggregatorV3Interface {
    function latestRoundData()
        external view
        returns (uint80 roundId, int256 answer, uint256 startedAt,
                 uint256 updatedAt, uint80 answeredInRound);
    function decimals() external view returns (uint8);
}

contract DWTChainlinkOracle is IDWTOracle, SecurityGated {
    AggregatorV3Interface public immutable feed;
    uint256 public constant STALENESS = 1 hours;
    
    bytes32 public constant LAYER_ID = keccak256("LAYER_10_ECOSYSTEM");

    constructor(
        address _feed,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    ) SecurityGated(_securityController) {
        feed = AggregatorV3Interface(_feed);
        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    function latestPrice() external view override withStateGuard(LAYER_ID) returns (uint256) {
        (, int256 answer, , uint256 updatedAt,) = feed.latestRoundData();
        require(answer > 0,                              "Negative price");
        require(block.timestamp - updatedAt <= STALENESS, "Stale price");
        uint8 dec = feed.decimals();
        // Normalise to 18 decimals
        if (dec < 18) return uint256(answer) * 10 ** (18 - dec);
        if (dec > 18) return uint256(answer) / 10 ** (dec - 18);
        return uint256(answer);
    }

    function lastUpdated() external view override returns (uint256) {
        (,,, uint256 updatedAt,) = feed.latestRoundData();
        return updatedAt;
    }
}
