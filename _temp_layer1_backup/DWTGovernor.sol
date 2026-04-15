// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

/**
 * @title DWTGovernor
 * @notice On-chain governance for the dWallet protocol.
 *
 * Protections implemented:
 *   - Proposal threshold: 100,000 DWT required to propose (prevents spam)
 *   - Quorum: 4% of total supply must participate
 *   - Voting delay: ~1 day (7200 blocks at 12s) before voting opens
 *   - Voting period: ~1 week (50400 blocks at 12s)
 *   - 48-hour Timelock delay on all passed proposals
 *   - Snapshot-based voting (getPastVotes at proposal block — flash loan safe)
 *   - PROPOSER_ROLE on Timelock is granted exclusively to this Governor
 *   - EXECUTOR_ROLE = address(0) → anyone can execute after delay (prevents censorship)
 *   - TIMELOCK_ADMIN_ROLE renounced post-deploy (see deploy instructions)
 */
contract DWTGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    /**
     * @param _token     DWT token (must implement IVotes / ERC20Votes)
     * @param _timelock  TimelockController address
     */
    constructor(IVotes _token, TimelockController _timelock)
        Governor("DWTGovernor")
        GovernorSettings(
            7200,   // votingDelay  — ~1 day at 12s/block
            50400,  // votingPeriod — ~1 week at 12s/block
            100_000e18  // proposalThreshold — 100,000 DWT
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4)  // 4% quorum
        GovernorTimelockControl(_timelock)
    {}

    // ─── Required Overrides ───────────────────────────────────────────────────
    // Solidity requires explicit overrides when multiple bases define the same fn.

    function votingDelay()
        public view override(Governor, GovernorSettings) returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public view override(Governor, GovernorSettings) returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public view override(Governor, GovernorVotesQuorumFraction) returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId)
        public view override(Governor, GovernorTimelockControl) returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public view override(Governor, GovernorTimelockControl) returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function proposalThreshold()
        public view override(Governor, GovernorSettings) returns (uint256)
    {
        return super.proposalThreshold();
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal view override(Governor, GovernorTimelockControl) returns (address)
    {
        return super._executor();
    }
}
