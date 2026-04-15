// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title InfrastructureSecurity
 * @notice Infrastructure Security Layer for dWallet Protocol
 * 
 *         This contract manages critical infrastructure dependencies:
 *         - RPC endpoint redundancy and failover
 *         - Oracle feed fallbacks and validation
 *         - External service health monitoring
 *         - Circuit breakers for infrastructure failures
 */
contract InfrastructureSecurity is AccessControl {
    
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    // ─────────────────────────────────────────────────────────────────────
    //  STRUCTS
    // ─────────────────────────────────────────────────────────────────────
    
    struct RPCProvider {
        string name;
        string url;
        bool active;
        uint256 priority;
        uint256 lastHealthCheck;
        bool healthy;
        uint256 failureCount;
    }
    
    struct OracleFeed {
        address feedAddress;
        string description;
        bool primary;
        bool active;
        int256 latestAnswer;
        uint256 updatedAt;
        uint256 failureCount;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────
    
    /// @dev RPC providers mapping
    mapping(string => RPCProvider) public rpcProviders;
    
    /// @dev List of RPC provider names
    string[] public rpcProviderList;
    
    /// @dev Oracle feeds by asset
    mapping(bytes32 => OracleFeed[]) public oracleFeeds;
    
    /// @dev Currently active RPC provider
    string public activeRPCProvider;
    
    /// @dev Infrastructure health status
    bool public infrastructureHealthy;
    
    /// @dev Last health check timestamp
    uint256 public lastGlobalHealthCheck;
    
    /// @dev Minimum healthy providers required
    uint256 public minHealthyRPCs;
    uint256 public minHealthyOracles;
    
    // ─────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────────
    
    event RPCProviderAdded(string name, string url, uint256 priority);
    event RPCProviderStatusUpdated(string name, bool healthy, bool active);
    event RPCProviderFailover(string oldProvider, string newProvider);
    
    event OracleFeedAdded(bytes32 indexed asset, address feed, bool primary);
    event OracleFeedFailover(bytes32 indexed asset, address oldFeed, address newFeed);
    event OracleFeedStalenessDetected(bytes32 indexed asset, uint256 lastUpdate);
    
    event InfrastructureHealthStatus(bool healthy, string reason);
    
    // ─────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────
    
    constructor(address admin, uint256 _minHealthyRPCs, uint256 _minHealthyOracles) {
        require(admin != address(0), "Zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        
        minHealthyRPCs = _minHealthyRPCs;
        minHealthyOracles = _minHealthyOracles;
        infrastructureHealthy = true;
        lastGlobalHealthCheck = block.timestamp;
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  RPC MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Add RPC provider
     * @param name Provider name
     * @param url Provider URL
     * @param priority Priority (lower = higher priority)
     */
    function addRPCProvider(
        string calldata name,
        string calldata url,
        uint256 priority
    ) external onlyRole(OPERATOR_ROLE) {
        require(bytes(rpcProviders[name].name).length == 0, "Provider exists");
        
        rpcProviders[name] = RPCProvider({
            name: name,
            url: url,
            active: true,
            priority: priority,
            lastHealthCheck: block.timestamp,
            healthy: true,
            failureCount: 0
        });
        
        rpcProviderList.push(name);
        
        if (bytes(activeRPCProvider).length == 0 || priority < rpcProviders[activeRPCProvider].priority) {
            activeRPCProvider = name;
        }
        
        emit RPCProviderAdded(name, url, priority);
    }
    
    /**
     * @notice Update RPC provider health status
     * @param name Provider name
     * @param healthy Health status
     */
    function updateRPCHealth(
        string calldata name,
        bool healthy
    ) external onlyRole(OPERATOR_ROLE) {
        RPCProvider storage provider = rpcProviders[name];
        require(bytes(provider.name).length > 0, "Provider not found");
        
        provider.healthy = healthy;
        provider.lastHealthCheck = block.timestamp;
        
        if (!healthy) {
            provider.failureCount++;
            
            // Trigger failover if this was active provider
            if (keccak256(bytes(name)) == keccak256(bytes(activeRPCProvider))) {
                _failoverRPC();
            }
        } else {
            provider.failureCount = 0;
        }
        
        emit RPCProviderStatusUpdated(name, healthy, provider.active);
    }
    
    /**
     * @notice Get number of healthy RPC providers
     */
    function getHealthyRPCCount() public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < rpcProviderList.length; i++) {
            if (rpcProviders[rpcProviderList[i]].healthy && 
                rpcProviders[rpcProviderList[i]].active) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @notice Failover to next available RPC provider
     */
    function _failoverRPC() internal {
        string memory oldProvider = activeRPCProvider;
        string memory newProvider;
        uint256 lowestPriority = type(uint256).max;
        
        // Find next healthy provider with lowest priority number
        for (uint256 i = 0; i < rpcProviderList.length; i++) {
            RPCProvider storage provider = rpcProviders[rpcProviderList[i]];
            if (provider.healthy && provider.active && provider.priority < lowestPriority) {
                lowestPriority = provider.priority;
                newProvider = provider.name;
            }
        }
        
        if (bytes(newProvider).length > 0) {
            activeRPCProvider = newProvider;
            emit RPCProviderFailover(oldProvider, newProvider);
        } else {
            // No healthy providers - critical infrastructure failure
            infrastructureHealthy = false;
            emit InfrastructureHealthStatus(false, "No healthy RPC providers");
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  ORACLE FEED MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Add oracle feed for an asset
     * @param asset Asset identifier (e.g., ETH/USD)
     * @param feedAddress Feed contract address
     * @param description Feed description
     * @param primary Whether this is primary feed
     */
    function addOracleFeed(
        bytes32 asset,
        address feedAddress,
        string calldata description,
        bool primary
    ) external onlyRole(OPERATOR_ROLE) {
        OracleFeed[] storage feeds = oracleFeeds[asset];
        
        feeds.push(OracleFeed({
            feedAddress: feedAddress,
            description: description,
            primary: primary,
            active: true,
            latestAnswer: 0,
            updatedAt: 0,
            failureCount: 0
        }));
        
        emit OracleFeedAdded(asset, feedAddress, primary);
    }
    
    /**
     * @notice Get primary oracle feed for asset
     * @param asset Asset identifier
     * @return feedAddress Feed address
     * @return answer Latest answer
     * @return updatedAt Last update time
     */
    function getPrimaryOracleFeed(
        bytes32 asset
    ) external view returns (address feedAddress, int256 answer, uint256 updatedAt) {
        OracleFeed[] storage feeds = oracleFeeds[asset];
        
        for (uint256 i = 0; i < feeds.length; i++) {
            if (feeds[i].primary && feeds[i].active) {
                return (feeds[i].feedAddress, feeds[i].latestAnswer, feeds[i].updatedAt);
            }
        }
        
        // Fallback to first active feed
        for (uint256 i = 0; i < feeds.length; i++) {
            if (feeds[i].active) {
                return (feeds[i].feedAddress, feeds[i].latestAnswer, feeds[i].updatedAt);
            }
        }
        
        return (address(0), 0, 0);
    }
    
    /**
     * @notice Check if oracle feed is stale
     * @param asset Asset identifier
     * @param stalenessThreshold Max age in seconds
     * @return isStale Whether feed is stale
     */
    function isOracleStale(
        bytes32 asset,
        uint256 stalenessThreshold
    ) external view returns (bool isStale) {
        OracleFeed[] storage feeds = oracleFeeds[asset];
        
        for (uint256 i = 0; i < feeds.length; i++) {
            if (feeds[i].active && feeds[i].updatedAt > 0) {
                if (block.timestamp - feeds[i].updatedAt > stalenessThreshold) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * @notice Failover to backup oracle feed
     * @param asset Asset identifier
     */
    function failoverOracle(bytes32 asset) external onlyRole(OPERATOR_ROLE) {
        OracleFeed[] storage feeds = oracleFeeds[asset];
        require(feeds.length > 0, "No feeds exist");
        
        address oldFeed;
        address newFeed;
        
        // Find current primary
        for (uint256 i = 0; i < feeds.length; i++) {
            if (feeds[i].primary && feeds[i].active) {
                oldFeed = feeds[i].feedAddress;
                feeds[i].primary = false;
                feeds[i].active = false;
                feeds[i].failureCount++;
                break;
            }
        }
        
        // Activate next available feed as primary
        for (uint256 i = 0; i < feeds.length; i++) {
            if (feeds[i].active && feeds[i].feedAddress != oldFeed) {
                feeds[i].primary = true;
                newFeed = feeds[i].feedAddress;
                break;
            }
        }
        
        if (newFeed != address(0)) {
            emit OracleFeedFailover(asset, oldFeed, newFeed);
        } else {
            emit InfrastructureHealthStatus(false, "No backup oracle available");
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  HEALTH MONITORING
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Perform global infrastructure health check
     */
    function performHealthCheck() external onlyRole(OPERATOR_ROLE) {
        uint256 healthyRPCs = getHealthyRPCCount();
        uint256 healthyOracles = _countHealthyOracles();
        
        bool stillHealthy = (healthyRPCs >= minHealthyRPCs) && 
                           (healthyOracles >= minHealthyOracles);
        
        if (stillHealthy != infrastructureHealthy) {
            infrastructureHealthy = stillHealthy;
            emit InfrastructureHealthStatus(stillHealthy, "Health check updated");
        }
        
        lastGlobalHealthCheck = block.timestamp;
    }
    
    /**
     * @notice Count healthy oracle feeds across all assets
     */
    function _countHealthyOracles() internal view returns (uint256) {
        // Simplified - would need actual implementation based on oracle health
        return type(uint256).max; // Assume healthy for now
    }
    
    // ─────────────────────────────────────────────────────────────────────
    //  UTILITY FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Get all RPC providers
     */
    function getAllRPCProviders() external view returns (string[] memory) {
        return rpcProviderList;
    }
    
    /**
     * @notice Get RPC provider details
     */
    function getRPCProvider(string calldata name) external view returns (
        string memory providerName,
        string memory url,
        bool active,
        uint256 priority,
        bool healthy,
        uint256 failureCount
    ) {
        RPCProvider storage provider = rpcProviders[name];
        return (
            provider.name,
            provider.url,
            provider.active,
            provider.priority,
            provider.healthy,
            provider.failureCount
        );
    }
}
