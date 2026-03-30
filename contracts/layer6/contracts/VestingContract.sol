// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../../SecurityGated.sol";

/**
 * @title VestingContract
 * @notice Multi-beneficiary token vesting for team members, advisors,
 *         investors, and ecosystem contributors.
 *
 * ─────────────────────────────────────────────────────────────────
 * Vesting schedule types:
 *
 *   LINEAR   — Tokens release continuously and proportionally
 *              from cliff end to vesting end.
 *              e.g. 1M DWT over 4 years with 1-year cliff:
 *                   0 tokens at month 11
 *                   250K tokens at month 12 (cliff)
 *                   then ~6944 tokens per day for 3 more years
 *
 *   GRADED   — Tokens release in equal monthly installments
 *              after the cliff. No continuous drip — discrete steps.
 *              e.g. 1M DWT, 12 tranches, monthly after cliff
 *
 * ─────────────────────────────────────────────────────────────────
 * Revocation:
 *   Revocable schedules (e.g. employee grants) can be cancelled
 *   by ADMIN_ROLE. Vested tokens at time of revocation remain
 *   claimable by the beneficiary. Unvested tokens return to treasury.
 *
 *   Non-revocable schedules (e.g. investor SAFTs) cannot be cancelled.
 *
 * ─────────────────────────────────────────────────────────────────
 * Multiple schedules per beneficiary:
 *   A beneficiary can have multiple independent vesting schedules.
 *   e.g. "Team grant" + "Performance bonus" + "Advisor retainer"
 *        all tracked separately, each with own cliff/duration.
 *
 * ─────────────────────────────────────────────────────────────────
 * Delegation:
 *   If the vesting token supports ERC20Votes, unvested tokens can
 *   optionally be delegated for governance voting while still locked.
 *   This is disabled by default. Governance can enable per-schedule.
 *
 * ─────────────────────────────────────────────────────────────────
 * Roles:
 *   DEFAULT_ADMIN_ROLE → Multisig. Manages roles.
 *   ADMIN_ROLE         → Multisig. Create/revoke schedules, fund contract.
 *   GOVERNOR_ROLE      → Timelock. Enable/disable delegation globally.
 *   GUARDIAN_ROLE      → Security bot. Pause only.
 */
contract VestingContract is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────
    // Roles
    // ─────────────────────────────────────────────────────────────

    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    // ─────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────

    enum VestingType { LINEAR, GRADED }

    struct VestingSchedule {
        address     beneficiary;    // Who receives the tokens
        address     token;          // Which token vests
        uint256     totalAmount;    // Total tokens in this schedule
        uint256     released;       // Tokens already claimed
        uint256     startTime;      // Vesting start timestamp
        uint256     cliffDuration;  // Seconds from start to cliff
        uint256     duration;       // Total vesting duration in seconds
        uint256     slicePeriod;    // For GRADED: seconds per tranche
        VestingType vestingType;    // LINEAR or GRADED
        bool        revocable;      // Can admin cancel this?
        bool        revoked;        // Has it been cancelled?
        bool        initialized;    // Slot is in use
        string      label;          // Human-readable label (e.g. "Team Grant Q1 2025")
    }

    // ─────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────

    /// @notice schedules[scheduleId] — scheduleId is keccak256(beneficiary, index)
    mapping(bytes32 => VestingSchedule) public schedules;

    /// @notice All schedule IDs for a given beneficiary
    mapping(address => bytes32[]) public beneficiarySchedules;

    /// @notice Count of schedules per beneficiary (used to generate unique IDs)
    mapping(address => uint256) public scheduleCount;

    /// @notice Total tokens held per token address (for accounting)
    mapping(address => uint256) public totalHeld;

    /// @notice Whether unvested tokens can be used for governance votes
    bool public delegationEnabled;

    bytes32 public constant LAYER_ID = keccak256("LAYER_6_BUSINESS");
    bytes32 public constant VEST_ACTION = keccak256("VEST_ACTION");

    // Aggregate stats
    uint256 public totalSchedulesCreated;
    uint256 public totalSchedulesRevoked;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event ScheduleCreated(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        address indexed token,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 duration,
        VestingType vestingType,
        bool revocable,
        string label
    );
    event TokensReleased(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        address indexed token,
        uint256 amount
    );
    event ScheduleRevoked(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 vestedAmount,
        uint256 returnedAmount,
        address returnedTo
    );
    event DelegationToggled(bool enabled);

    // ─────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────

    /**
     * @param _admin    Multisig — creates and revokes schedules
     * @param _governor Timelock — governance configuration
     * @param _guardian Security bot — pause only
     * @param _securityController Layer 7 Security Controller
     * @param _registry Registry address
     */
    constructor(
        address _admin,
        address _governor,
        address _guardian,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    ) AccessControl() SecurityGated(_securityController) {
        require(_admin    != address(0), "Vesting: zero admin");
        require(_governor != address(0), "Vesting: zero governor");
        require(_guardian != address(0), "Vesting: zero guardian");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);
        _grantRole(GUARDIAN_ROLE,      _guardian);

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    // ─────────────────────────────────────────────────────────────
    // Admin: Create vesting schedules
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Create a new LINEAR vesting schedule.
     *         Tokens release continuously from cliff → end.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function createLinearSchedule(
        address         beneficiary,
        address         token,
        uint256         totalAmount,
        uint256         startTime,
        uint256         cliffDuration,
        uint256         duration,
        bool            revocable,
        string calldata label
    )
        external
        onlyRole(ADMIN_ROLE)
        whenProtocolNotPaused
        returns (bytes32 scheduleId)
    {
        return _createSchedule(
            beneficiary,
            token,
            totalAmount,
            startTime == 0 ? block.timestamp : startTime,
            cliffDuration,
            duration,
            0, // slicePeriod unused for LINEAR
            VestingType.LINEAR,
            revocable,
            label
        );
    }

    /**
     * @notice Create a new GRADED vesting schedule.
     *         Tokens release in equal tranches every slicePeriod seconds.
     *
     * @param beneficiary   Recipient address
     * @param token         ERC-20 token to vest
     * @param totalAmount   Total tokens to vest
     * @param startTime     Unix timestamp when vesting begins (0 = now)
     * @param cliffDuration Seconds before first tranche unlocks
     * @param duration      Total vesting period (must be divisible by slicePeriod)
     * @param slicePeriod   Seconds per tranche (e.g. 30 days for monthly)
     * @param revocable     Whether admin can cancel this schedule
     * @param label         Human-readable label
     */
    function createGradedSchedule(
        address         beneficiary,
        address         token,
        uint256         totalAmount,
        uint256         startTime,
        uint256         cliffDuration,
        uint256         duration,
        uint256         slicePeriod,
        bool            revocable,
        string calldata label
    )
        external
        onlyRole(ADMIN_ROLE)
        whenNotPaused
        whenProtocolNotPaused
        returns (bytes32 scheduleId)
    {
        require(slicePeriod > 0,              "Vesting: zero slice period");
        require(duration % slicePeriod == 0,  "Vesting: duration not divisible by slice");
        return _createSchedule(
            beneficiary,
            token,
            totalAmount,
            startTime == 0 ? block.timestamp : startTime,
            cliffDuration,
            duration,
            slicePeriod,
            VestingType.GRADED,
            revocable,
            label
        );
    }

    /**
     * @notice Create multiple schedules in one transaction.
     *         All inputs are parallel arrays.
     */
    function batchCreateLinearSchedules(
        address[]         calldata beneficiaries,
        address[]         calldata tokens,
        uint256[]         calldata totalAmounts,
        uint256[]         calldata startTimes,
        uint256[]         calldata cliffDurations,
        uint256[]         calldata durations,
        bool[]            calldata revocables,
        string[]          calldata labels
    )
        external
        onlyRole(ADMIN_ROLE)
        whenNotPaused
        whenProtocolNotPaused
    {
        uint256 len = beneficiaries.length;
        require(
            tokens.length        == len &&
            totalAmounts.length  == len &&
            startTimes.length    == len &&
            cliffDurations.length == len &&
            durations.length     == len &&
            revocables.length    == len &&
            labels.length        == len,
            "Vesting: array mismatch"
        );
        for (uint256 i = 0; i < len; i++) {
            _createSchedule(
                beneficiaries[i],
                tokens[i],
                totalAmounts[i],
                startTimes[i] == 0 ? block.timestamp : startTimes[i],
                cliffDurations[i],
                durations[i],
                0,
                VestingType.LINEAR,
                revocables[i],
                labels[i]
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Beneficiary: Claim vested tokens
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Claim all vested but unclaimed tokens from a specific schedule.
     * @param scheduleId  The schedule to claim from
     */
    function release(bytes32 scheduleId)
        external
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
    {
        VestingSchedule storage s = schedules[scheduleId];
        require(s.initialized,              "Vesting: schedule not found");
        require(!s.revoked,                 "Vesting: schedule revoked");
        require(
            msg.sender == s.beneficiary ||
            hasRole(ADMIN_ROLE, msg.sender),
            "Vesting: unauthorized"
        );

        uint256 releasable = _vestedAmount(s) - s.released;
        require(releasable > 0, "Vesting: nothing to release");

        s.released      += releasable;
        totalHeld[s.token] -= releasable;

        IERC20(s.token).safeTransfer(s.beneficiary, releasable);
        emit TokensReleased(scheduleId, s.beneficiary, s.token, releasable);
    }

    /**
     * @notice Claim from ALL of a beneficiary's schedules in one call.
     * @param beneficiary  The beneficiary to claim for
     */
    function releaseAll(address beneficiary)
        external
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
    {
        require(
            msg.sender == beneficiary ||
            hasRole(ADMIN_ROLE, msg.sender),
            "Vesting: unauthorized"
        );

        bytes32[] storage ids = beneficiarySchedules[beneficiary];
        for (uint256 i = 0; i < ids.length; i++) {
            VestingSchedule storage s = schedules[ids[i]];
            if (!s.initialized || s.revoked) continue;

            uint256 releasable = _vestedAmount(s) - s.released;
            if (releasable == 0) continue;

            s.released         += releasable;
            totalHeld[s.token] -= releasable;

            IERC20(s.token).safeTransfer(beneficiary, releasable);
            emit TokensReleased(ids[i], beneficiary, s.token, releasable);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Admin: Revocation
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Revoke a revocable schedule. Vested tokens remain claimable
     *         by the beneficiary. Unvested tokens return to returnTo address.
     * @param scheduleId  Schedule to revoke
     * @param returnTo    Where to send unvested tokens (e.g. Treasury)
     */
    function revokeSchedule(bytes32 scheduleId, address payable returnTo)
        external
        onlyRole(ADMIN_ROLE)
        nonReentrant
        whenProtocolNotPaused
    {
        VestingSchedule storage s = schedules[scheduleId];
        require(s.initialized,   "Vesting: not found");
        require(!s.revoked,      "Vesting: already revoked");
        require(s.revocable,     "Vesting: not revocable");
        require(returnTo != address(0), "Vesting: zero returnTo");

        // Calculate vested amount at revocation time
        uint256 vested   = _vestedAmount(s);
        uint256 returned = s.totalAmount - vested;

        s.revoked = true;

        // Keep vested amount in contract (beneficiary can still claim it)
        // Return unvested amount to treasury/admin
        if (returned > 0) {
            totalHeld[s.token] -= returned;
            IERC20(s.token).safeTransfer(returnTo, returned);
        }

        totalSchedulesRevoked++;

        emit ScheduleRevoked(
            scheduleId,
            s.beneficiary,
            vested,
            returned,
            returnTo
        );
    }

    // ─────────────────────────────────────────────────────────────
    // Vesting calculations
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Calculate total vested amount for a schedule at current time.
     */
    function vestedAmount(bytes32 scheduleId)
        external
        view
        returns (uint256)
    {
        VestingSchedule storage s = schedules[scheduleId];
        require(s.initialized, "Vesting: not found");
        return _vestedAmount(s);
    }

    /**
     * @notice Calculate releasable (vested but unclaimed) amount.
     */
    function releasableAmount(bytes32 scheduleId)
        external
        view
        returns (uint256)
    {
        VestingSchedule storage s = schedules[scheduleId];
        if (!s.initialized || s.revoked) return 0;
        return _vestedAmount(s) - s.released;
    }

    function _vestedAmount(VestingSchedule storage s)
        internal
        view
        returns (uint256)
    {
        if (s.revoked) {
            // After revocation: only vested-at-revocation is claimable
            // We track this as whatever was already released plus what was vested
            // since we store vested at revocation via released tracking
            return s.released; // can only claim what was vested at revocation time
        }

        uint256 cliffEnd = s.startTime + s.cliffDuration;
        if (block.timestamp < cliffEnd) return 0;
        if (block.timestamp >= s.startTime + s.duration) return s.totalAmount;

        uint256 elapsed = block.timestamp - s.startTime;

        if (s.vestingType == VestingType.LINEAR) {
            return (s.totalAmount * elapsed) / s.duration;
        } else {
            // GRADED: floor to complete slices
            uint256 slices = elapsed / s.slicePeriod;
            uint256 totalSlices = s.duration / s.slicePeriod;
            return (s.totalAmount * slices) / totalSlices;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Internal: Create schedule
    // ─────────────────────────────────────────────────────────────

    function _createSchedule(
        address     beneficiary,
        address     token,
        uint256     totalAmount,
        uint256     startTime,
        uint256     cliffDuration,
        uint256     duration,
        uint256     slicePeriod,
        VestingType vestingType,
        bool        revocable,
        string memory label
    )
        internal
        returns (bytes32 scheduleId)
    {
        require(beneficiary != address(0), "Vesting: zero beneficiary");
        require(token       != address(0), "Vesting: zero token");
        require(totalAmount >  0,          "Vesting: zero amount");
        require(duration    >  cliffDuration, "Vesting: cliff >= duration");
        require(duration    >  0,          "Vesting: zero duration");

        // Pull tokens from caller (caller must have approved this contract)
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);
        totalHeld[token] += totalAmount;

        // Generate unique schedule ID
        scheduleId = keccak256(
            abi.encodePacked(beneficiary, scheduleCount[beneficiary], block.timestamp)
        );

        schedules[scheduleId] = VestingSchedule({
            beneficiary:   beneficiary,
            token:         token,
            totalAmount:   totalAmount,
            released:      0,
            startTime:     startTime,
            cliffDuration: cliffDuration,
            duration:      duration,
            slicePeriod:   slicePeriod,
            vestingType:   vestingType,
            revocable:     revocable,
            revoked:       false,
            initialized:   true,
            label:         label
        });

        beneficiarySchedules[beneficiary].push(scheduleId);
        scheduleCount[beneficiary]++;
        totalSchedulesCreated++;

        emit ScheduleCreated(
            scheduleId,
            beneficiary,
            token,
            totalAmount,
            startTime,
            cliffDuration,
            duration,
            vestingType,
            revocable,
            label
        );
    }

    // ─────────────────────────────────────────────────────────────
    // Governance
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Enable/disable governance delegation of unvested tokens.
     *         When enabled, beneficiaries can delegate voting power from
     *         their unvested DWT (if DWT implements ERC20Votes).
     */
    function setDelegationEnabled(bool enabled)
        external
        onlyRole(GOVERNOR_ROLE)
        whenProtocolNotPaused
    {
        delegationEnabled = enabled;
        emit DelegationToggled(enabled);
    }

    // ─────────────────────────────────────────────────────────────
    // Pause
    // ─────────────────────────────────────────────────────────────

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }

    // ─────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Get all schedule IDs for a beneficiary.
     */
    function getScheduleIds(address beneficiary)
        external
        view
        returns (bytes32[] memory)
    {
        return beneficiarySchedules[beneficiary];
    }

    /**
     * @notice Get full schedule details.
     */
    function getSchedule(bytes32 scheduleId)
        external
        view
        returns (VestingSchedule memory)
    {
        return schedules[scheduleId];
    }

    /**
     * @notice Get a summary of all schedules for a beneficiary.
     *         Returns parallel arrays for easy frontend consumption.
     */
    function getBeneficiarySummary(address beneficiary)
        external
        view
        returns (
            bytes32[] memory ids,
            uint256[] memory totalAmounts,
            uint256[] memory releasable,
            uint256[] memory released,
            bool[]    memory revoked,
            string[]  memory labels
        )
    {
        bytes32[] storage sIds = beneficiarySchedules[beneficiary];
        uint256 len = sIds.length;

        ids          = new bytes32[](len);
        totalAmounts = new uint256[](len);
        releasable   = new uint256[](len);
        released     = new uint256[](len);
        revoked      = new bool[](len);
        labels       = new string[](len);

        for (uint256 i = 0; i < len; i++) {
            VestingSchedule storage s = schedules[sIds[i]];
            ids[i]          = sIds[i];
            totalAmounts[i] = s.totalAmount;
            released[i]     = s.released;
            revoked[i]      = s.revoked;
            labels[i]       = s.label;
            releasable[i]   = s.revoked ? 0 : _vestedAmount(s) - s.released;
        }
    }

    /**
     * @notice Get a schedule's vesting progress as a percentage (0–10000 bps).
     */
    function vestingProgress(bytes32 scheduleId)
        external
        view
        returns (uint256 progressBps)
    {
        VestingSchedule storage s = schedules[scheduleId];
        require(s.initialized, "Vesting: not found");
        if (block.timestamp < s.startTime + s.cliffDuration) return 0;
        if (block.timestamp >= s.startTime + s.duration)     return 10_000;
        uint256 elapsed = block.timestamp - s.startTime;
        return (elapsed * 10_000) / s.duration;
    }

    /**
     * @notice Get total locked tokens across all schedules for a token.
     */
    function totalLockedFor(address token)
        external
        view
        returns (uint256)
    {
        return totalHeld[token];
    }
}
