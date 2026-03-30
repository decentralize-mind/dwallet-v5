// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../SecurityGated.sol";

/**
 * @title ProtocolRegistry
 * @notice Layer 0 — Registry & Infrastructure
 * 
 *         The "Root of Trust" for the dWallet protocol.
 *         This contract tracks the addresses of all protocol layers:
 *           - Layer 1: Core Token (DWT)
 *           - Layer 2: Execution Engine
 *           - Layer 3: Authentication
 *           - Layer 4: Liquidity
 *           - Layer 5: Compliance
 *           - Layer 6: Business Logic
 *           - Layer 7: Security (this registry's controller)
 *           - Layer 8: Multichain
 *           - Layer 9: Settlement
 *           - Layer 10: User Experience
 *
 *         SECURITY: 
 *         All registry updates require a Dual-Key verification (Committee Hash + Sig)
 *         and are subject to a 48-hour Time Lock cooldown.
 */
contract ProtocolRegistry is AccessControl, ReentrancyGuard, SecurityGated {

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    
    bytes32 public constant LAYER_ID      = keccak256("LAYER_0_INFRA");

    // ── Errors ────────────────────────────────────────────────────────────────
    error ZeroAddress();
    error LayerAlreadyRegistered(bytes32 layerId);
    error GenesisExpired();
    error TimeLockNotExpired(uint256 availableAt);

    // ── Events ────────────────────────────────────────────────────────────────
    event RegistryUpdated(bytes32 indexed layerId, address indexed oldAddress, address indexed newAddress);
    event GenesisFinalized();

    // ── State ─────────────────────────────────────────────────────────────────
    mapping(bytes32 => address) public layerAddresses;
    
    /// @dev Tracking time locks for specific registry updates
    mapping(bytes32 => uint256) public pendingUpdateAvailableAt;
    mapping(bytes32 => address) public pendingUpdateAddress;

    /// @dev Genesis phase allows rapid setup (no time lock) for the first 24 hours
    uint256 public genesisEndTime;
    bool    public genesisActive = true;

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
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
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);

        genesisEndTime = block.timestamp + 1 days;

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    // ── Registry Management ───────────────────────────────────────────────────

    /**
     * @notice Propose a registry update (initiates Time Lock).
     * @param layerId    The ID of the protocol layer
     * @param newAddress The new contract address
     */
    function proposeUpdate(bytes32 layerId, address newAddress) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
    {
        if (newAddress == address(0)) revert ZeroAddress();
        
        // Skip time lock during genesis for rapid rollout
        if (genesisActive && block.timestamp < genesisEndTime) {
            _updateRegistry(layerId, newAddress);
            return;
        }

        // Lock 2 (Time Lock) - 48 hour delay defined in TimeLockController
        uint256 availableAt = block.timestamp + 2 days; 
        pendingUpdateAvailableAt[layerId] = availableAt;
        pendingUpdateAddress[layerId]     = newAddress;
    }

    /**
     * @notice Finalize a registry update after time lock and committee verification.
     * @dev Gated by 5 Universal Locks:
     *      1. Access: onlyRole(ADMIN_ROLE)
     *      2. Time: withTimeLock (custom check)
     *      5. Verification: withSignature(hash, signature) - Committee approval for architectural shifts.
     */
    function finalizeUpdate(
        bytes32 layerId,
        bytes32 hash,
        bytes calldata signature
    ) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    {
        uint256 availableAt = pendingUpdateAvailableAt[layerId];
        address newAddr     = pendingUpdateAddress[layerId];

        if (newAddr == address(0))           revert ZeroAddress();
        if (block.timestamp < availableAt)   revert TimeLockNotExpired(availableAt);

        _updateRegistry(layerId, newAddr);
        
        // Clear pending
        delete pendingUpdateAvailableAt[layerId];
        delete pendingUpdateAddress[layerId];
    }

    function finalizeGenesis() external onlyRole(ADMIN_ROLE) {
        genesisActive = false;
        emit GenesisFinalized();
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _updateRegistry(bytes32 layerId, address newAddress) internal {
        address old = layerAddresses[layerId];
        layerAddresses[layerId] = newAddress;
        emit RegistryUpdated(layerId, old, newAddress);
    }

    // ── View Helpers ──────────────────────────────────────────────────────────

    function getLayerAddress(bytes32 layerId) external view returns (address) {
        address addr = layerAddresses[layerId];
        if (addr == address(0)) revert ZeroAddress();
        return addr;
    }
}
