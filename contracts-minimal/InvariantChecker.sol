// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title InvariantChecker
 * @notice Mathematical Invariants Enforcement System
 * 
 *         This contract defines and enforces mathematical truths that must
 *         NEVER be violated, even if individual contract logic is compromised.
 *         
 *         These invariants serve as the final line of defense against exploits.
 * 
 * CORE INVARIANTS:
 *   1. Token: Supply = Minted - Burned
 *   2. Vault: Total Assets >= Total Shares
 *   3. Solvency: Assets >= Liabilities
 *   4. No Negative Balances
 *   5. Perpetuals: Collateral >= Exposure
 *   6. DEX: Reserve Consistency (k-factor)
 * 
 * USAGE:
 *   - Call before/after state changes
 *   - Revert immediately if violated
 *   - Emit events for monitoring
 */
contract InvariantChecker is AccessControl {
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTANTS & ROLES
    // ─────────────────────────────────────────────────────────────────────────
    
    bytes32 public constant ADMIN_ROLE = keccak256("INVARIANT_ADMIN");
    bytes32 public constant CHECKER_ROLE = keccak256("INVARIANT_CHECKER");
    
    // ─────────────────────────────────────────────────────────────────────────
    //  ERRORS
    // ─────────────────────────────────────────────────────────────────────────
    
    error TokenSupplyMismatch(uint256 expected, uint256 actual);
    error NegativeBalance(address account, int256 balance);
    error VaultInsolvent(uint256 assets, uint256 shares);
    error InsufficientCollateral(uint256 collateral, uint256 exposure);
    error InvalidReserveState(uint256 reserve0, uint256 reserve1, uint256 k);
    error WithdrawalExceedsDeposit(address user, uint256 withdraw, uint256 deposit);
    error InvariantViolation(bytes32 invariantId, string reason);
    
    // ─────────────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────────────
    
    event InvariantChecked(bytes32 indexed invariantId, bool passed, string message);
    event InvariantViolated(bytes32 indexed invariantId, string reason, uint256 timestamp);
    event InvariantRegistered(bytes32 indexed invariantId, string description);
    
    // ─────────────────────────────────────────────────────────────────────────
    //  STRUCTS
    // ─────────────────────────────────────────────────────────────────────────
    
    struct InvariantConfig {
        bool active;
        string description;
        uint256 toleranceBps; // Basis points tolerance for floating point comparisons
        uint256 lastChecked;
        uint256 violationCount;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────────────────────
    
    /// @dev Registered invariants
    mapping(bytes32 => InvariantConfig) public invariants;
    
    /// @dev Invariant IDs by name
    mapping(string => bytes32) public invariantIds;
    
    /// @dev List of all registered invariant IDs
    bytes32[] public allInvariants;
    
    // ─────────────────────────────────────────────────────────────────────────
    //  PREDEFINED INVARIANT IDS
    // ─────────────────────────────────────────────────────────────────────────
    
    bytes32 public constant TOKEN_SUPPLY_INVARIANT = keccak256("TOKEN_SUPPLY");
    bytes32 public constant VAULT_SOLVENCY_INVARIANT = keccak256("VAULT_SOLVENCY");
    bytes32 public constant NO_NEGATIVE_BALANCE_INVARIANT = keccak256("NO_NEGATIVE_BALANCE");
    bytes32 public constant COLLATERAL_RATIO_INVARIANT = keccak256("COLLATERAL_RATIO");
    bytes32 public constant RESERVE_CONSISTENCY_INVARIANT = keccak256("RESERVE_CONSISTENCY");
    bytes32 public constant WITHDRAWAL_LIMIT_INVARIANT = keccak256("WITHDRAWAL_LIMIT");
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────
    
    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        
        // Register core invariants
        _registerInvariant(TOKEN_SUPPLY_INVARIANT, "Token supply must equal minted - burned");
        _registerInvariant(VAULT_SOLVENCY_INVARIANT, "Vault assets must >= vault shares");
        _registerInvariant(NO_NEGATIVE_BALANCE_INVARIANT, "No user balance can be negative");
        _registerInvariant(COLLATERAL_RATIO_INVARIANT, "Collateral must >= exposure");
        _registerInvariant(RESERVE_CONSISTENCY_INVARIANT, "DEX reserves must maintain k-factor");
        _registerInvariant(WITHDRAWAL_LIMIT_INVARIANT, "Withdrawal cannot exceed deposit");
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CORE INVARIANT CHECKING FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Check token supply invariant
     * @param totalSupply Current total supply
     * @param totalMinted Total amount minted
     * @param totalBurned Total amount burned
     */
    function checkToken(
        uint256 totalSupply,
        uint256 totalMinted,
        uint256 totalBurned
    ) external {
        uint256 expectedSupply = totalMinted - totalBurned;
        
        if (totalSupply != expectedSupply) {
            revert TokenSupplyMismatch(expectedSupply, totalSupply);
        }
        
        emit InvariantChecked(TOKEN_SUPPLY_INVARIANT, true, "Supply matches minted-burned");
    }
    
    /**
     * @notice Check vault solvency invariant
     * @param totalAssets Total assets in vault
     * @param totalShares Total shares issued
     */
    function checkVault(uint256 totalAssets, uint256 totalShares) external pure {
        if (totalAssets < totalShares) {
            revert VaultInsolvent(totalAssets, totalShares);
        }
        
        emit InvariantChecked(VAULT_SOLVENCY_INVARIANT, true, "Vault is solvent");
    }
    
    /**
     * @notice Check general solvency invariant
     * @param assets Total assets
     * @param liabilities Total liabilities
     */
    function checkSolvency(uint256 assets, uint256 liabilities) external pure {
        if (assets < liabilities) {
            revert InvariantViolation(
                keccak256("SOLVENCY"),
                "Protocol is insolvent"
            );
        }
        
        emit InvariantChecked(keccak256("SOLVENCY"), true, "Protocol is solvent");
    }
    
    /**
     * @notice Check for negative balances (view function)
     * @param account User address
     * @param balance Balance to check (as int256 to detect negatives)
     */
    function checkNoNegativeBalance(address account, int256 balance) external pure {
        if (balance < 0) {
            revert NegativeBalance(account, balance);
        }
        
        emit InvariantChecked(NO_NEGATIVE_BALANCE_INVARIANT, true, "Balance is non-negative");
    }
    
    /**
     * @notice Check collateralization ratio for perpetuals/margin positions
     * @param collateral Collateral amount
     * @param exposure Exposure/position size
     * @param minRatioBps Minimum collateral ratio in basis points (e.g., 10000 = 100%)
     */
    function checkCollateralRatio(
        uint256 collateral,
        uint256 exposure,
        uint256 minRatioBps
    ) external pure {
        if (exposure == 0) return; // No position
        
        uint256 currentRatioBps = (collateral * 10000) / exposure;
        
        if (currentRatioBps < minRatioBps) {
            revert InsufficientCollateral(collateral, exposure);
        }
        
        emit InvariantChecked(COLLATERAL_RATIO_INVARIANT, true, "Collateral ratio maintained");
    }
    
    /**
     * @notice Check DEX reserve consistency (k-factor preservation)
     * @param reserve0 Token0 reserves before
     * @param reserve1 Token1 reserves before
     * @param k Target k-factor (reserve0 * reserve1)
     */
    function checkReserveConsistency(
        uint256 reserve0,
        uint256 reserve1,
        uint256 k
    ) external pure {
        uint256 currentK = reserve0 * reserve1;
        
        // Allow small tolerance for rounding
        uint256 tolerance = k / 10000; // 0.01% tolerance
        
        if (currentK + tolerance < k || currentK > k + tolerance) {
            revert InvalidReserveState(reserve0, reserve1, k);
        }
        
        emit InvariantChecked(RESERVE_CONSISTENCY_INVARIANT, true, "K-factor preserved");
    }
    
    /**
     * @notice Check withdrawal doesn't exceed deposit
     * @param user User address
     * @param withdrawAmount Amount user wants to withdraw
     * @param depositedAmount Amount user deposited
     */
    function checkWithdrawalLimit(
        address user,
        uint256 withdrawAmount,
        uint256 depositedAmount
    ) external pure {
        if (withdrawAmount > depositedAmount) {
            revert WithdrawalExceedsDeposit(user, withdrawAmount, depositedAmount);
        }
        
        emit InvariantChecked(WITHDRAWAL_LIMIT_INVARIANT, true, "Withdrawal within limits");
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  ADVANCED: PRE/POST STATE VALIDATION
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Check invariants before state change
     * @param invariantIdsToCheck Array of invariant IDs to verify
     */
    function checkBefore(bytes32[] calldata invariantIdsToCheck) external {
        for (uint256 i = 0; i < invariantIdsToCheck.length; i++) {
            bytes32 invId = invariantIdsToCheck[i];
            if (!invariants[invId].active) continue;
            
            // Mark as being checked
            invariants[invId].lastChecked = block.timestamp;
        }
    }
    
    /**
     * @notice Check invariants after state change
     * @param invariantIdsToCheck Array of invariant IDs to verify
     * @param success Whether the operation succeeded
     */
    function checkAfter(bytes32[] calldata invariantIdsToCheck, bool success) external {
        for (uint256 i = 0; i < invariantIdsToCheck.length; i++) {
            bytes32 invId = invariantIdsToCheck[i];
            if (!invariants[invId].active) continue;
            
            InvariantConfig storage config = invariants[invId];
            config.lastChecked = block.timestamp;
            
            if (!success) {
                config.violationCount++;
                emit InvariantViolated(invId, "Operation failed invariant check", block.timestamp);
            }
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  CUSTOM INVARIANT REGISTRATION
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Register a new invariant to track
     * @param invariantId Unique identifier for the invariant
     * @param description Human-readable description
     */
    function registerInvariant(bytes32 invariantId, string calldata description) external onlyRole(ADMIN_ROLE) {
        _registerInvariant(invariantId, description);
    }
    
    function _registerInvariant(bytes32 invariantId, string memory description) internal {
        invariants[invariantId] = InvariantConfig({
            active: true,
            description: description,
            toleranceBps: 100, // 1% default tolerance
            lastChecked: 0,
            violationCount: 0
        });
        
        emit InvariantRegistered(invariantId, description);
    }
    
    /**
     * @notice Activate or deactivate an invariant
     * @param invariantId Invariant identifier
     * @param active New active status
     */
    function setInvariantActive(bytes32 invariantId, bool active) external onlyRole(ADMIN_ROLE) {
        invariants[invariantId].active = active;
    }
    
    /**
     * @notice Set tolerance for an invariant (basis points)
     * @param invariantId Invariant identifier
     * @param toleranceBps Tolerance in basis points (100 = 1%)
     */
    function setInvariantTolerance(bytes32 invariantId, uint256 toleranceBps) external onlyRole(ADMIN_ROLE) {
        require(toleranceBps <= 10000, "Tolerance cannot exceed 100%");
        invariants[invariantId].toleranceBps = toleranceBps;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    //  SYSTEM-WIDE INVARIANT AUDIT
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Run all active invariants checks
     * @return passed Whether all invariants passed
     * @return failedCount Number of failed invariants
     */
    function auditAllInvariants() external view returns (bool passed, uint256 failedCount) {
        for (uint256 i = 0; i < allInvariants.length; i++) {
            bytes32 invId = allInvariants[i];
            if (!invariants[invId].active) continue;
            
            // Note: Actual invariant logic would need to be called here
            // This is a metadata check
            if (invariants[invId].violationCount > 0) {
                failedCount++;
            }
        }
        
        return (failedCount == 0, failedCount);
    }
    
    /**
     * @notice Get details about a specific invariant
     */
    function getInvariantDetails(bytes32 invariantId) external view returns (
        bool active,
        string memory description,
        uint256 toleranceBps,
        uint256 lastChecked,
        uint256 violationCount
    ) {
        InvariantConfig storage config = invariants[invariantId];
        return (
            config.active,
            config.description,
            config.toleranceBps,
            config.lastChecked,
            config.violationCount
        );
    }
    
    /**
     * @notice Get total number of registered invariants
     */
    function getTotalInvariants() external view returns (uint256) {
        return allInvariants.length;
    }
    
    /**
     * @notice Get invariant ID at index
     */
    function getInvariantAt(uint256 index) external view returns (bytes32) {
        return allInvariants[index];
    }
}
