// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title RecoveryModule
/// @notice Social recovery for dWallet accounts.
///         Guardians collectively vote to replace the owner set.
///         Time-locked to prevent flash attacks.
contract RecoveryModule is AccessControl {
    using ECDSA for bytes32;

    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    struct RecoveryRequest {
        address[]  newOwners;
        uint256    newThreshold;
        uint256    initiatedAt;
        uint256    supportCount;
        bool       executed;
        mapping(address => bool) supported;
    }

    address public wallet;
    uint256 public recoveryThreshold;   // guardians needed
    uint256 public recoveryDelay;       // seconds before execution allowed

    mapping(bytes32 => RecoveryRequest) private _requests;

    event RecoveryInitiated(bytes32 indexed requestId, address indexed initiator, address[] newOwners);
    event RecoverySupported(bytes32 indexed requestId, address indexed guardian);
    event RecoveryExecuted(bytes32 indexed requestId);
    event RecoveryCancelled(bytes32 indexed requestId);

    modifier onlyGuardian() {
        require(hasRole(GUARDIAN_ROLE, msg.sender), "Recovery: not guardian");
        _;
    }

    constructor(
        address _wallet,
        address[] memory guardians,
        uint256 _threshold,
        uint256 _delay
    ) {
        require(_threshold > 0 && _threshold <= guardians.length, "Recovery: bad threshold");
        wallet            = _wallet;
        recoveryThreshold = _threshold;
        recoveryDelay     = _delay;

        _grantRole(DEFAULT_ADMIN_ROLE, _wallet);
        for (uint256 i = 0; i < guardians.length; i++) {
            _grantRole(GUARDIAN_ROLE, guardians[i]);
        }
    }

    // ─── Initiate ─────────────────────────────────────────────────────────────

    function initiateRecovery(address[] calldata newOwners, uint256 newThreshold)
        external onlyGuardian returns (bytes32 requestId)
    {
        require(newOwners.length > 0,                           "Recovery: no owners");
        require(newThreshold > 0 && newThreshold <= newOwners.length, "Recovery: bad threshold");

        requestId = keccak256(abi.encode(newOwners, newThreshold, block.timestamp, msg.sender));
        RecoveryRequest storage req = _requests[requestId];
        req.newOwners     = newOwners;
        req.newThreshold  = newThreshold;
        req.initiatedAt   = block.timestamp;
        req.supportCount  = 1;
        req.supported[msg.sender] = true;

        emit RecoveryInitiated(requestId, msg.sender, newOwners);
        emit RecoverySupported(requestId, msg.sender);
    }

    // ─── Support ──────────────────────────────────────────────────────────────

    function supportRecovery(bytes32 requestId) external onlyGuardian {
        RecoveryRequest storage req = _requests[requestId];
        require(req.initiatedAt > 0,            "Recovery: not found");
        require(!req.executed,                   "Recovery: already executed");
        require(!req.supported[msg.sender],      "Recovery: already supported");

        req.supported[msg.sender] = true;
        req.supportCount++;
        emit RecoverySupported(requestId, msg.sender);
    }

    // ─── Finalize ─────────────────────────────────────────────────────────────

    function finalizeRecovery(bytes32 requestId) external onlyGuardian {
        RecoveryRequest storage req = _requests[requestId];
        require(!req.executed,                              "Recovery: already executed");
        require(req.supportCount >= recoveryThreshold,      "Recovery: insufficient support");
        require(block.timestamp >= req.initiatedAt + recoveryDelay, "Recovery: delay not elapsed");

        req.executed = true;

        // Call the dWallet to update its owner set
        bytes memory callData = abi.encodeWithSignature(
            "updateOwners(address[],uint256)", req.newOwners, req.newThreshold
        );
        (bool ok,) = wallet.call(callData);
        require(ok, "Recovery: wallet call failed");

        emit RecoveryExecuted(requestId);
    }

    // ─── Cancel ───────────────────────────────────────────────────────────────

    function cancelRecovery(bytes32 requestId) external {
        require(
            msg.sender == wallet || hasRole(GUARDIAN_ROLE, msg.sender),
            "Recovery: not authorized"
        );
        RecoveryRequest storage req = _requests[requestId];
        require(!req.executed, "Recovery: already executed");
        delete _requests[requestId];
        emit RecoveryCancelled(requestId);
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    function getRequestInfo(bytes32 requestId)
        external view returns (
            address[] memory newOwners,
            uint256 newThreshold,
            uint256 initiatedAt,
            uint256 supportCount,
            bool executed
        )
    {
        RecoveryRequest storage req = _requests[requestId];
        return (req.newOwners, req.newThreshold, req.initiatedAt, req.supportCount, req.executed);
    }

    function hasSupported(bytes32 requestId, address guardian) external view returns (bool) {
        return _requests[requestId].supported[guardian];
    }
}
