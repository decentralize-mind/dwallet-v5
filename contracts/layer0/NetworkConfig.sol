// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../SecurityGated.sol";

/**
 * @title NetworkConfig
 * @notice Layer 0 — Registry & Infrastructure
 * 
 *         The central repository for global protocol parameters.
 *         Manages:
 *           - Fees: platformFee, swapFee, bridgeFee
 *           - Rewards: stakeRewardRate, referralBonus
 *           - Limits: globalWithdrawalCap, emergencyThresholds
 *           - Endpoints: layerZeroEndpoints, axelarGateways
 */
contract NetworkConfig is AccessControl, ReentrancyGuard, SecurityGated {

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    
    bytes32 public constant LAYER_ID      = keccak256("LAYER_0_INFRA");

    // ── Errors ────────────────────────────────────────────────────────────────
    error ZeroValue();
    error ParameterOutOfBounds(uint256 value, uint256 min, uint256 max);
    error GenesisExpired();

    // ── Events ────────────────────────────────────────────────────────────────
    event ConfigUpdated(string indexed key, uint256 oldValue, uint256 newValue);
    event GenesisFinalized();

    // ── State ─────────────────────────────────────────────────────────────────
    mapping(string => uint256) public uintConfigs;
    mapping(string => address) public addressConfigs;

    /// @dev Genesis phase allows rapid parameter setting (no Multi-sig) for the first 24 hours
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

    // ── Config Management ─────────────────────────────────────────────────────

    /**
     * @notice Update a numeric configuration parameter.
     * @dev Gated by 5 Universal Locks:
     *      1. Access: onlyRole(GOVERNOR_ROLE)
     *      3. State: withStateGuard(LAYER_ID)
     *      5. Verification: withSignature(hash, signature) - Committee approval for economic changes.
     */
    function setUintConfig(
        string calldata key,
        uint256 newValue,
        bytes32 hash,
        bytes calldata signature
    ) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withSignature(hash, signature)
    {
        uint256 old = uintConfigs[key];
        uintConfigs[key] = newValue;
        emit ConfigUpdated(key, old, newValue);
    }

    /**
     * @notice Emergency parameter update (skips multi-sig if genesis is active).
     */
    function genesisUpdate(string calldata key, uint256 newValue) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (!genesisActive || block.timestamp > genesisEndTime) revert GenesisExpired();
        uintConfigs[key] = newValue;
        emit ConfigUpdated(key, 0, newValue);
    }

    function finalizeGenesis() external onlyRole(ADMIN_ROLE) {
        genesisActive = false;
        emit GenesisFinalized();
    }

    // ── View Helpers ──────────────────────────────────────────────────────────

    function getUintConfig(string calldata key) external view returns (uint256) {
        return uintConfigs[key];
    }
}
