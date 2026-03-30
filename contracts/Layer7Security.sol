// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 1 ▸ ERRORS
// ─────────────────────────────────────────────────────────────────────────────
error NotAuthorized();
error AlreadySigner();
error NotSigner();
error InvalidThreshold();
error TxAlreadyExecuted();
error TxNotConfirmed();
error TxDoesNotExist();
error InsufficientConfirmations();
error ContractPaused();
error ContractNotPaused();
error RateLimitExceeded();
error AddressNotAllowlisted();
error ZeroAddress();
error CallFailed();

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 2 ▸ EVENTS
// ─────────────────────────────────────────────────────────────────────────────
event SignerAdded(address indexed signer);
event SignerRemoved(address indexed signer);
event ThresholdChanged(uint256 required);

event TxSubmitted(uint256 indexed txId, address indexed to, uint256 value, bytes data);
event TxConfirmed(uint256 indexed txId, address indexed signer);
event TxRevoked(uint256 indexed txId, address indexed signer);
event TxExecuted(uint256 indexed txId);

event Paused(address indexed by);
event Unpaused(address indexed by);
event CircuitBreakerTripped(address indexed by, string reason);

event RateLimitUpdated(uint256 maxCallsPerBlock, uint256 maxValuePerBlock);

event Allowlisted(address indexed account, bool status);
event KYCVerified(address indexed account, uint256 level);

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 3 ▸ STRUCTS
// ─────────────────────────────────────────────────────────────────────────────

/// @notice Multisig transaction proposal
struct Transaction {
    address to;
    uint256 value;
    bytes   data;
    bool    executed;
    uint256 confirmations;
}

/// @notice Per-block usage snapshot for rate limiting
struct BlockUsage {
    uint256 blockNumber;
    uint256 callCount;
    uint256 valueTransferred;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 4 ▸ MAIN CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @title  Layer7Security
 * @notice Layer 7 — Security & Access
 *         Implements:
 *           • M-of-N Multisig admin (#14)
 *           • Emergency Pause / Circuit Breaker (#15)
 *           • Per-block Rate Limiter
 *           • Allowlist / KYC compliance gating
 *
 * @dev    Designed as a self-contained reference contract.
 *         Inherit or compose individual modules as needed.
 */
contract Layer7Security {

    // ── 4.1  MULTISIG STATE ──────────────────────────────────────────────────

    /// @dev Ordered list of admin signers
    address[] public signers;

    /// @dev Quick lookup: is this address a signer?
    mapping(address => bool) public isSigner;

    /// @dev Number of confirmations required to execute a tx
    uint256 public required;

    /// @dev All submitted multisig transactions
    Transaction[] public transactions;

    /// @dev txId → signer → confirmed?
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    // ── 4.2  EMERGENCY PAUSE / CIRCUIT BREAKER STATE ─────────────────────────

    bool public paused;

    /// @dev True when the circuit breaker has been tripped (latching state)
    bool public circuitBroken;

    // ── 4.3  RATE LIMITER STATE ──────────────────────────────────────────────

    /// @dev Maximum external calls allowed per block
    uint256 public maxCallsPerBlock;

    /// @dev Maximum ETH value (wei) transferable per block
    uint256 public maxValuePerBlock;

    /// @dev Caller-level usage tracker  (caller → BlockUsage)
    mapping(address => BlockUsage) private _callerUsage;

    // ── 4.4  ALLOWLIST / KYC STATE ───────────────────────────────────────────

    /// @dev address → is allowlisted?
    mapping(address => bool) public allowlisted;

    /// @dev address → KYC level (0 = none, 1 = basic, 2 = full, etc.)
    mapping(address => uint256) public kycLevel;

    /// @dev Minimum KYC level required to interact with guarded functions
    uint256 public requiredKYCLevel;

    // ─────────────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @param _signers          Initial list of admin signers
     * @param _required         Confirmation threshold (M of N)
     * @param _maxCallsPerBlock Per-block call cap per address
     * @param _maxValuePerBlock Per-block ETH cap per address (wei)
     * @param _requiredKYCLevel Minimum KYC level for protected functions
     */
    constructor(
        address[] memory _signers,
        uint256          _required,
        uint256          _maxCallsPerBlock,
        uint256          _maxValuePerBlock,
        uint256          _requiredKYCLevel
    ) {
        if (_required == 0 || _required > _signers.length) revert InvalidThreshold();

        for (uint256 i; i < _signers.length; ++i) {
            address s = _signers[i];
            if (s == address(0))  revert ZeroAddress();
            if (isSigner[s])      revert AlreadySigner();
            isSigner[s] = true;
            signers.push(s);
            emit SignerAdded(s);
        }

        required         = _required;
        maxCallsPerBlock = _maxCallsPerBlock;
        maxValuePerBlock = _maxValuePerBlock;
        requiredKYCLevel = _requiredKYCLevel;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SECTION 5 ▸ MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────

    modifier onlySigner() {
        if (!isSigner[msg.sender]) revert NotAuthorized();
        _;
    }

    /// @dev Requires M-of-N approval via the multisig (self-call pattern)
    modifier onlyMultisig() {
        if (msg.sender != address(this)) revert NotAuthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused)        revert ContractPaused();
        if (circuitBroken) revert ContractPaused();
        _;
    }

    modifier whenPaused() {
        if (!paused) revert ContractNotPaused();
        _;
    }

    modifier rateGuard(uint256 msgValue) {
        _checkAndUpdateRate(msg.sender, msgValue);
        _;
    }

    modifier onlyAllowlisted() {
        if (!allowlisted[msg.sender]) revert AddressNotAllowlisted();
        _;
    }

    modifier onlyKYC(uint256 minLevel) {
        if (kycLevel[msg.sender] < minLevel) revert NotAuthorized();
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SECTION 6 ▸ MULTISIG  (M-of-N Admin #14)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Submit a new transaction proposal for multisig approval.
     * @param to    Target address
     * @param value ETH to send (wei)
     * @param data  Calldata payload
     * @return txId The ID of the newly created proposal
     */
    function submitTransaction(
        address to,
        uint256 value,
        bytes calldata data
    ) external onlySigner returns (uint256 txId) {
        txId = transactions.length;
        transactions.push(Transaction({
            to:            to,
            value:         value,
            data:          data,
            executed:      false,
            confirmations: 0
        }));
        emit TxSubmitted(txId, to, value, data);
    }

    /**
     * @notice Confirm (sign) an existing proposal.
     * @param txId Transaction index
     */
    function confirmTransaction(uint256 txId) external onlySigner {
        if (txId >= transactions.length)      revert TxDoesNotExist();
        if (transactions[txId].executed)      revert TxAlreadyExecuted();
        if (isConfirmed[txId][msg.sender])    revert TxAlreadyExecuted();

        isConfirmed[txId][msg.sender] = true;
        transactions[txId].confirmations += 1;
        emit TxConfirmed(txId, msg.sender);
    }

    /**
     * @notice Revoke a previously submitted confirmation.
     * @param txId Transaction index
     */
    function revokeConfirmation(uint256 txId) external onlySigner {
        if (txId >= transactions.length)      revert TxDoesNotExist();
        if (transactions[txId].executed)      revert TxAlreadyExecuted();
        if (!isConfirmed[txId][msg.sender])   revert TxNotConfirmed();

        isConfirmed[txId][msg.sender] = false;
        transactions[txId].confirmations -= 1;
        emit TxRevoked(txId, msg.sender);
    }

    /**
     * @notice Execute a proposal once the threshold is reached.
     * @param txId Transaction index
     */
    function executeTransaction(uint256 txId) external onlySigner {
        if (txId >= transactions.length)                         revert TxDoesNotExist();
        Transaction storage tx_ = transactions[txId];
        if (tx_.executed)                                        revert TxAlreadyExecuted();
        if (tx_.confirmations < required)                        revert InsufficientConfirmations();

        tx_.executed = true;
        (bool ok, ) = tx_.to.call{value: tx_.value}(tx_.data);
        if (!ok) revert CallFailed();
        emit TxExecuted(txId);
    }

    // ── Multisig-governed admin actions ──────────────────────────────────────

    /**
     * @notice Add a new signer. Must be executed via multisig (self-call).
     */
    function addSigner(address account) external onlyMultisig {
        if (account == address(0)) revert ZeroAddress();
        if (isSigner[account])     revert AlreadySigner();
        isSigner[account] = true;
        signers.push(account);
        emit SignerAdded(account);
    }

    /**
     * @notice Remove an existing signer. Must be executed via multisig.
     *         Threshold is automatically lowered if it would exceed signer count.
     */
    function removeSigner(address account) external onlyMultisig {
        if (!isSigner[account]) revert NotSigner();
        isSigner[account] = false;

        // Compact the signers array
        for (uint256 i; i < signers.length; ++i) {
            if (signers[i] == account) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }

        // Ensure threshold remains valid
        if (required > signers.length) {
            required = signers.length;
            emit ThresholdChanged(required);
        }
        emit SignerRemoved(account);
    }

    /**
     * @notice Change the confirmation threshold. Must be executed via multisig.
     */
    function changeThreshold(uint256 newRequired) external onlyMultisig {
        if (newRequired == 0 || newRequired > signers.length) revert InvalidThreshold();
        required = newRequired;
        emit ThresholdChanged(newRequired);
    }

    /// @notice Returns total number of proposed transactions.
    function transactionCount() external view returns (uint256) {
        return transactions.length;
    }

    /// @notice Returns the full signers list.
    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SECTION 7 ▸ EMERGENCY PAUSE (#15) & CIRCUIT BREAKER
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Pause the contract. Any signer can pause; only multisig can unpause.
     */
    function pause() external onlySigner {
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @notice Unpause the contract. Requires multisig execution.
     *         Cannot unpause if the circuit breaker has been tripped.
     */
    function unpause() external onlyMultisig {
        if (circuitBroken) revert ContractPaused(); // must resolve circuit break first
        paused = false;
        emit Unpaused(msg.sender);
    }

    /**
     * @notice Trip the circuit breaker (latching pause). Requires multisig to reset.
     * @param reason Human-readable explanation for the trip
     */
    function tripCircuitBreaker(string calldata reason) external onlySigner {
        circuitBroken = true;
        paused        = true;
        emit CircuitBreakerTripped(msg.sender, reason);
        emit Paused(msg.sender);
    }

    /**
     * @notice Reset the circuit breaker and unpause. Only callable via multisig.
     */
    function resetCircuitBreaker() external onlyMultisig {
        circuitBroken = false;
        paused        = false;
        emit Unpaused(msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SECTION 8 ▸ RATE LIMITER (per-block caps)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Update rate-limit parameters. Must be executed via multisig.
     * @param newMaxCalls  Maximum calls per block per address (0 = unlimited)
     * @param newMaxValue  Maximum ETH per block per address in wei (0 = unlimited)
     */
    function updateRateLimits(
        uint256 newMaxCalls,
        uint256 newMaxValue
    ) external onlyMultisig {
        maxCallsPerBlock = newMaxCalls;
        maxValuePerBlock = newMaxValue;
        emit RateLimitUpdated(newMaxCalls, newMaxValue);
    }

    /**
     * @dev Internal: check per-block limits and update the caller's usage snapshot.
     *      Called by the `rateGuard` modifier.
     */
    function _checkAndUpdateRate(address caller, uint256 value) internal {
        BlockUsage storage usage = _callerUsage[caller];

        // Reset snapshot if we've moved to a new block
        if (usage.blockNumber != block.number) {
            usage.blockNumber     = block.number;
            usage.callCount       = 0;
            usage.valueTransferred = 0;
        }

        usage.callCount       += 1;
        usage.valueTransferred += value;

        if (maxCallsPerBlock > 0 && usage.callCount > maxCallsPerBlock)
            revert RateLimitExceeded();
        if (maxValuePerBlock > 0 && usage.valueTransferred > maxValuePerBlock)
            revert RateLimitExceeded();
    }

    /**
     * @notice Read the current block-usage snapshot for any address.
     */
    function getUsage(address account)
        external
        view
        returns (uint256 blockNum, uint256 calls, uint256 valueUsed)
    {
        BlockUsage storage u = _callerUsage[account];
        if (u.blockNumber == block.number) {
            return (u.blockNumber, u.callCount, u.valueTransferred);
        }
        return (block.number, 0, 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SECTION 9 ▸ ALLOWLIST / KYC  (compliance gating)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Set the allowlist status for one or more accounts.
     *         Must be executed via multisig.
     * @param accounts List of addresses
     * @param status   true = add, false = remove
     */
    function setAllowlist(
        address[] calldata accounts,
        bool               status
    ) external onlyMultisig {
        for (uint256 i; i < accounts.length; ++i) {
            if (accounts[i] == address(0)) revert ZeroAddress();
            allowlisted[accounts[i]] = status;
            emit Allowlisted(accounts[i], status);
        }
    }

    /**
     * @notice Assign a KYC level to an account.
     *         Must be executed via multisig (or a trusted oracle via a proposal).
     * @param account Address to update
     * @param level   KYC level (0 = revoke, 1 = basic, 2 = enhanced, …)
     */
    function setKYCLevel(address account, uint256 level) external onlyMultisig {
        if (account == address(0)) revert ZeroAddress();
        kycLevel[account] = level;
        emit KYCVerified(account, level);
    }

    /**
     * @notice Update the globally required KYC level. Must be executed via multisig.
     */
    function setRequiredKYCLevel(uint256 level) external onlyMultisig {
        requiredKYCLevel = level;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SECTION 10 ▸ EXAMPLE PROTECTED FUNCTION
    //               (demonstrates all guards composing together)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Example payable action gated by every Layer-7 control:
     *           1. Contract must not be paused / circuit-broken
     *           2. Caller must be on the allowlist
     *           3. Caller must meet the KYC level requirement
     *           4. Call must not exceed the per-block rate limits
     *
     *         Replace this body with your real business logic.
     */
    function protectedAction()
        external
        payable
        whenNotPaused
        onlyAllowlisted
        onlyKYC(requiredKYCLevel)
        rateGuard(msg.value)
    {
        // ── your logic here ──
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SECTION 11 ▸ RECEIVE / FALLBACK
    // ─────────────────────────────────────────────────────────────────────────

    receive() external payable {}
}
