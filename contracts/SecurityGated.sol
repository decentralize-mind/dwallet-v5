import "./security/Interfaces.sol";

interface IProtocolRegistry {
    function getLayerAddress(bytes32 layerId) external view returns (address);
}

/**
 * @title SecurityGated
 * @dev Base contract for all 10 layers. Implements the 5 Universal Lock Primitives.
 *      Updated to use the unified LockEngine (Phase 2 Master Plan).
 */
abstract contract SecurityGated {
    ILayer7Security public securityController;
    IProtocolRegistry public registry;
    
    // Unified Security Modules
    ILockEngine public lockEngine;
    IInvariantChecker public invariantChecker;

    error SecurityLayerPaused();
    error SecurityLayerCircuitBroken();
    error SecurityLayerNotAuthorized();
    error SecurityLayerBelowKYC();
    error SecurityLayerNotAllowlisted();

    constructor(address _securityController) {
        securityController = ILayer7Security(_securityController);
    }

    /**
     * @notice Initialize the LockEngine and InvariantChecker.
     */
    function _initSecuritySystem(
        address _registry,
        address _lockEngine,
        address _invariantChecker
    ) internal {
        registry = IProtocolRegistry(_registry);
        lockEngine = ILockEngine(_lockEngine);
        invariantChecker = IInvariantChecker(_invariantChecker);
    }

    // --- UNIFIED MASTER LOCK MODIFIER ---

    /**
     * @notice The ultimate security guard for sensitive protocol functions.
     *         Checks all 5 Locks (Access, Time, State, Rate, Verification) in one call.
     */
    modifier ultraSecure(
        bytes32 role,
        bytes32 actionId,
        bytes32 layerId,
        uint256 amount
    ) {
        lockEngine.checkAllLocks(msg.sender, role, actionId, layerId, amount);
        _;
        lockEngine.postExecute(msg.sender, actionId);
    }

    // --- LEGACY / INDIVIDUAL LOCK MODIFIERS ---

    /// @dev Individual Access Check
    modifier withAccessLock(bytes32 role) {
        lockEngine.access().verifyAccess(msg.sender, role);
        _;
    }

    /// @dev Individual Time Check
    modifier withTimeLock(bytes32 actionId) {
        lockEngine.time().verifyTimeLock(msg.sender, actionId);
        _;
        lockEngine.time().startCooldown(msg.sender, actionId);
    }

    /// @dev Individual State Check
    modifier withStateGuard(bytes32 layerId) {
        lockEngine.state().verifyState(layerId);
        _;
    }

    /// @dev Individual Rate Check
    modifier withRateLimit(bytes32 actionId, uint256 amount) {
        lockEngine.rateLimit().verifyAndUpdateRate(msg.sender, actionId, amount);
        _;
    }

    /// @dev Individual Signature Check
    modifier withSignature(bytes32 hash, bytes calldata signature) {
        lockEngine.verification().verifySignature(msg.sender, hash, signature);
        _;
    }


    // --- LAYER 7 BACKWARD COMPATIBILITY ---

    modifier whenProtocolNotPaused() {
        if (securityController.paused()) revert SecurityLayerPaused();
        if (securityController.circuitBroken()) revert SecurityLayerCircuitBroken();
        _;
    }

    modifier onlySecuritySigner() {
        if (!securityController.isSigner(msg.sender)) revert SecurityLayerNotAuthorized();
        _;
    }

    function updateLockEngine(address _newEngine) external onlySecuritySigner {
        lockEngine = ILockEngine(_newEngine);
    }
}

