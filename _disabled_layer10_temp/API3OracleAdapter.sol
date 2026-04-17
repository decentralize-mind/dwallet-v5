// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../layer7/SecurityGated.sol";

/**
 * @title API3 Oracle Interface
 * @notice Interface for API3 Airnode oracle system
 * 
 * API3 provides:
 * - First-party oracles (data providers operate their own nodes)
 * - Decentralized oracle networks (dAPIs)
 * - Continuous price updates
 * - No middlemen (direct from source)
 * 
 * Documentation: https://docs.api3.org
 */
interface IAPI3ServerV1 {
    function readDataParameterized(
        bytes32 endpointId,
        address sponsor,
        uint256 minimumHeartbeatCount
    ) external view returns (int224 value, uint256 timestamp);

    function readWithProxy(
        address dapiProxy,
        uint256 minimumHeartbeatCount
    ) external view returns (int224 value, uint256 timestamp);
}

/**
 * @title API3OracleAdapter
 * @notice Adapter for integrating API3 dAPI price feeds
 * 
 * Features:
 * - API3 dAPI integration
 * - First-party oracle data
 * - Heartbeat validation
 * - Decentralized data feeds
 * 
 * Usage:
 *   API3OracleAdapter adapter = new API3OracleAdapter(
 *       api3Server,
 *       endpointId,
 *       sponsorWallet,
 *       maxStaleness
 *   );
 *   
 *   uint256 price = adapter.getPrice();
 */
contract API3OracleAdapter is SecurityGated {
    IAPI3ServerV1 public api3Server;
    bytes32 public endpointId;
    address public sponsorWallet;
    uint256 public maxStaleness;
    uint256 public minimumHeartbeatCount;

    bytes32 public constant LAYER_ID = keccak256("LAYER_3_ORACLE");

    event PriceRead(int224 value, uint256 timestamp);
    event EndpointConfigured(bytes32 newEndpointId, address newSponsor);

    constructor(
        address _api3Server,
        bytes32 _endpointId,
        address _sponsorWallet,
        uint256 _maxStaleness,
        uint256 _minimumHeartbeatCount,
        address _securityController,
        address _registry,
        address _lockEngine,
        address _invariantChecker
    ) SecurityGated(_securityController) {
        api3Server = IAPI3ServerV1(_api3Server);
        endpointId = _endpointId;
        sponsorWallet = _sponsorWallet;
        maxStaleness = _maxStaleness;
        minimumHeartbeatCount = _minimumHeartbeatCount;
        _initSecuritySystem(_registry, _lockEngine, _invariantChecker);
    }

    /**
     * @notice Get latest price from API3
     * @return price Price with 18 decimals
     * @return timestamp Price timestamp
     */
    function getPrice() external view withStateGuard(LAYER_ID) returns (
        uint256 price,
        uint256 timestamp
    ) {
        (int224 value, uint256 dataTimestamp) = api3Server.readDataParameterized(
            endpointId,
            sponsorWallet,
            minimumHeartbeatCount
        );

        // Validate staleness
        require(
            block.timestamp - dataTimestamp <= maxStaleness,
            "API3Oracle: Price too old"
        );

        // Validate value is positive
        require(value > 0, "API3Oracle: Invalid price");

        price = uint256(value);
        timestamp = dataTimestamp;

        emit PriceRead(value, dataTimestamp);
    }

    /**
     * @notice Get price using dAPI proxy
     */
    function getPriceViaProxy(
        address dapiProxy
    ) external view returns (uint256 price, uint256 timestamp) {
        (int224 value, uint256 dataTimestamp) = api3Server.readWithProxy(
            dapiProxy,
            minimumHeartbeatCount
        );

        require(value > 0, "API3Oracle: Invalid price");
        require(
            block.timestamp - dataTimestamp <= maxStaleness,
            "API3Oracle: Price too old"
        );

        price = uint256(value);
        timestamp = dataTimestamp;
    }

    /**
     * @notice Update endpoint configuration
     */
    function setEndpointConfig(
        bytes32 _newEndpointId,
        address _newSponsorWallet,
        uint256 _newMaxStaleness
    ) external withTimeLock(keccak256("ORACLE_CONFIG_ACTION")) {
        endpointId = _newEndpointId;
        sponsorWallet = _newSponsorWallet;
        maxStaleness = _newMaxStaleness;
        emit EndpointConfigured(_newEndpointId, _newSponsorWallet);
    }
}
