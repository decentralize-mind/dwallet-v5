// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StateController
 * @notice Universal Lock Type 3: State Lock (SYSTEM CONDITION)
 *         Controls protocol-wide and layer-specific pause/health states.
 */
contract StateController is Ownable {
    bool public isPaused;
    bool public isCircuitBroken;

    /// @dev layerId => isPaused
    mapping(bytes32 => bool) public layerPaused;

    error SystemPaused();
    error LayerPaused(bytes32 layerId);
    error CircuitBroken();

    event SystemPausedStatusChanged(bool status);
    event LayerPausedStatusChanged(bytes32 indexed layerId, bool status);
    event CircuitBreakerTripped(string indexed reason);

    constructor(address _admin) Ownable(_admin) {}

    /**
     * @notice Check if the system or a specific layer is operational.
     */
    function verifyState(bytes32 layerId) external view {
        if (isCircuitBroken) revert CircuitBroken();
        if (isPaused) revert SystemPaused();
        if (layerPaused[layerId]) revert LayerPaused(layerId);
    }

    // --- Admin Functions ---

    function setSystemPause(bool status) external onlyOwner {
        isPaused = status;
        emit SystemPausedStatusChanged(status);
    }

    function setLayerPause(bytes32 layerId, bool status) external onlyOwner {
        layerPaused[layerId] = status;
        emit LayerPausedStatusChanged(layerId, status);
    }

    function tripCircuitBreaker(string calldata reason) external onlyOwner {
        isCircuitBroken = true;
        isPaused = true;
        emit CircuitBreakerTripped(reason);
    }

    function resetCircuitBreaker() external onlyOwner {
        isCircuitBroken = false;
        isPaused = false;
    }
}
