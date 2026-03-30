// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  CrossChainGovernance
 * @notice Remote Proposals — cross-chain governance system
 *
 *         Two contract roles:
 *
 *           GovernanceHub      (HOME chain)
 *             • Receives votes aggregated from all satellite chains.
 *             • Tallies total votes and executes proposals once quorum is met.
 *             • Can relay execution results back to satellites.
 *
 *           GovernanceSatellite (REMOTE chains)
 *             • Users cast votes locally with their governance tokens.
 *             • Periodically commits the vote tally to GovernanceHub via LZ/Axelar.
 *             • Receives executed-proposal notifications from hub and stores them.
 *
 *         Proposal lifecycle:
 *           1. Any holder creates a proposal on GovernanceHub.
 *           2. GovernanceHub broadcasts proposal to all satellites.
 *           3. Users vote on any chain (locally on satellite, or directly on hub).
 *           4. After voting window, anyone calls finalizeProposal() on hub.
 *           5. Hub executes if quorum + majority reached; relays result to satellites.
 */

import "./ILayerZeroEndpoint.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../SecurityGated.sol";

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED TYPES
// ─────────────────────────────────────────────────────────────────────────────

enum ProposalState { Pending, Active, Defeated, Succeeded, Executed, Cancelled }

struct ProposalCore {
    uint256 proposalId;
    address proposer;
    uint256 startTimestamp;
    uint256 endTimestamp;
    uint256 forVotes;
    uint256 againstVotes;
    uint256 abstainVotes;
    bool    executed;
    bool    cancelled;
    // Execution payload (hub-side only)
    address[] targets;
    uint256[] values;
    bytes[]   calldatas;
    string    description;
}

// ─────────────────────────────────────────────────────────────────────────────
//  A.  GOVERNANCE HUB  (home chain)
// ─────────────────────────────────────────────────────────────────────────────

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../SecurityGated.sol";

// ─────────────────────────────────────────────────────────────────────────────
//  A.  GOVERNANCE HUB  (home chain)
// ─────────────────────────────────────────────────────────────────────────────

contract GovernanceHub is AccessControl, ReentrancyGuard, Pausable, SecurityGated {

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    bytes32 public constant LAYER_ID      = keccak256("LAYER_8_HUB_SPOKE");

    // ── Errors ────────────────────────────────────────────────────────────────
    error ZeroAddress();
    error InvalidSource();
    error ProposalNotFound();
    error ProposalNotActive();
    error ProposalNotSucceeded();
    error AlreadyVoted();
    error AlreadyProcessed();
    error VotingWindowNotClosed();
    error VotingWindowClosed();
    error QuorumNotReached();
    error InsufficientFee();
    error ExecutionFailed(uint256 index);
    error ArrayLengthMismatch();

    // ── Events ────────────────────────────────────────────────────────────────
    event ProposalCreated(uint256 indexed proposalId, address proposer, string description);
    event ProposalBroadcast(uint256 indexed proposalId, uint16 chainId);
    event VoteCast(uint256 indexed proposalId, address voter, uint8 support, uint256 weight);
    event RemoteVoteReceived(uint256 indexed proposalId, uint16 srcChain, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event ResultRelayed(uint256 indexed proposalId, uint16 chainId, bool executed);

    // ── Adapters ──────────────────────────────────────────────────────────────
    ILayerZeroEndpoint public immutable lzEndpoint;

    // ── Governance token ──────────────────────────────────────────────────────
    ERC20Votes public immutable govToken;

    // ── Parameters ────────────────────────────────────────────────────────────
    uint256 public votingDelay;
    uint256 public votingPeriod;
    uint256 public proposalThreshold;
    uint256 public quorumNumerator;

    // ── State ─────────────────────────────────────────────────────────────────
    uint256 public proposalCount;
    mapping(uint256 => ProposalCore)    public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint16 => bytes) public trustedSatellites;
    uint16[] public satelliteChains;
    mapping(bytes32 => bool) public processedMessages;

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address _govToken,
        address _lzEndpoint,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 _quorumNumerator,
        address _admin,
        address _governor,
        address _guardian,
        address _securityController,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    ) SecurityGated(_securityController) {
        govToken           = ERC20Votes(_govToken);
        lzEndpoint         = ILayerZeroEndpoint(_lzEndpoint);
        votingDelay        = _votingDelay;
        votingPeriod       = _votingPeriod;
        proposalThreshold  = _proposalThreshold;
        quorumNumerator    = _quorumNumerator;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);
        _grantRole(GUARDIAN_ROLE,      _guardian);

        _initSecurityModules(_access, _time, _state, _rate, _verify);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function addSatellite(uint16 chainId, bytes calldata path) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
    {
        if (trustedSatellites[chainId].length == 0) {
            satelliteChains.push(chainId);
        }
        trustedSatellites[chainId] = path;
    }

    function setVotingParams(
        uint256 _delay,
        uint256 _period,
        uint256 _threshold,
        uint256 _quorum
    ) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
    {
        votingDelay       = _delay;
        votingPeriod      = _period;
        proposalThreshold = _threshold;
        quorumNumerator   = _quorum;
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }

    // ── Proposal creation ─────────────────────────────────────────────────────

    function propose(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[]   calldata calldatas,
        string    calldata description
    ) 
        external 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        returns (uint256 proposalId) 
    {
        if (targets.length != values.length || targets.length != calldatas.length)
            revert ArrayLengthMismatch();
        if (govToken.getVotes(msg.sender) < proposalThreshold)
            revert QuorumNotReached();

        proposalId = ++proposalCount;

        ProposalCore storage p = proposals[proposalId];
        p.proposalId      = proposalId;
        p.proposer        = msg.sender;
        p.startTimestamp  = block.timestamp + votingDelay;
        p.endTimestamp    = block.timestamp + votingDelay + votingPeriod;
        p.description     = description;

        for (uint256 i; i < targets.length; ++i) {
            p.targets.push(targets[i]);
            p.values.push(values[i]);
            p.calldatas.push(calldatas[i]);
        }

        emit ProposalCreated(proposalId, msg.sender, description);
    }

    /**
     * @notice Broadcast a proposal to all registered satellite chains.
     * @dev Gated by 5 Universal Locks:
     *      1. Verification: withSignature(hash, signature) — Committee approval for multichain broadcast.
     */
    function broadcastProposal(
        uint256 proposalId,
        bytes32 hash,
        bytes calldata signature,
        bytes calldata adapterParams
    ) 
        external 
        payable 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    {
        ProposalCore storage p = proposals[proposalId];
        if (p.proposalId == 0) revert ProposalNotFound();

        bytes memory payload = abi.encode(
            uint8(1),   
            proposalId,
            p.startTimestamp,
            p.endTimestamp,
            p.description
        );

        uint256 feePerChain = msg.value / satelliteChains.length;

        for (uint256 i; i < satelliteChains.length; ++i) {
            uint16 chainId = satelliteChains[i];
            bytes memory path = trustedSatellites[chainId];
            if (path.length == 0) continue;

            lzEndpoint.send{value: feePerChain}(
                chainId,
                path,
                payload,
                payable(msg.sender),
                address(0),
                adapterParams
            );
            emit ProposalBroadcast(proposalId, chainId);
        }
    }

    // ── Local voting (on hub chain) ───────────────────────────────────────────

    function castVote(uint256 proposalId, uint8 support) 
        external 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        ProposalCore storage p = proposals[proposalId];
        if (p.proposalId == 0)                           revert ProposalNotFound();
        if (block.timestamp < p.startTimestamp ||
            block.timestamp > p.endTimestamp)            revert ProposalNotActive();
        if (hasVoted[proposalId][msg.sender])            revert AlreadyVoted();

        hasVoted[proposalId][msg.sender] = true;
        uint256 weight = govToken.getVotes(msg.sender);

        if      (support == 1) p.forVotes     += weight;
        else if (support == 0) p.againstVotes += weight;
        else                   p.abstainVotes += weight;

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    // ── Inbound: receive aggregated votes from satellite ──────────────────────

    function lzReceive(
        uint16         srcChainId,
        bytes calldata srcAddress,
        uint64         /*nonce*/,
        bytes calldata payload
    ) external whenProtocolNotPaused withStateGuard(LAYER_ID) {
        if (msg.sender != address(lzEndpoint)) revert InvalidSource();
        if (keccak256(srcAddress) != keccak256(trustedSatellites[srcChainId]))
            revert InvalidSource();

        uint8 msgType = uint8(payload[0]);

        if (msgType == 2) {
            // Vote commit
            (,uint256 proposalId, uint256 forV, uint256 againstV, uint256 abstainV, bytes32 msgId) =
                abi.decode(payload, (uint8, uint256, uint256, uint256, uint256, bytes32));

            if (processedMessages[msgId]) revert AlreadyProcessed();
            processedMessages[msgId] = true;

            ProposalCore storage p = proposals[proposalId];
            if (p.proposalId == 0) revert ProposalNotFound();

            p.forVotes     += forV;
            p.againstVotes += againstV;
            p.abstainVotes += abstainV;

            emit RemoteVoteReceived(proposalId, srcChainId, forV, againstV, abstainV);
        }
    }

    // ── Finalization & Execution ──────────────────────────────────────────────

    function state(uint256 proposalId) public view returns (ProposalState) {
        ProposalCore storage p = proposals[proposalId];
        if (p.proposalId == 0) revert ProposalNotFound();
        if (p.cancelled)  return ProposalState.Cancelled;
        if (p.executed)   return ProposalState.Executed;
        if (block.timestamp < p.startTimestamp) return ProposalState.Pending;
        if (block.timestamp <= p.endTimestamp)  return ProposalState.Active;
        
        uint256 quorum = (govToken.totalSupply() * quorumNumerator) / 100;
        uint256 totalVotes = p.forVotes + p.againstVotes + p.abstainVotes;
        if (totalVotes < quorum || p.forVotes <= p.againstVotes)
            return ProposalState.Defeated;
        return ProposalState.Succeeded;
    }

    function execute(uint256 proposalId) 
        external 
        payable 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        if (state(proposalId) != ProposalState.Succeeded) revert ProposalNotSucceeded();

        ProposalCore storage p = proposals[proposalId];
        p.executed = true;

        for (uint256 i; i < p.targets.length; ++i) {
            (bool ok,) = p.targets[i].call{value: p.values[i]}(p.calldatas[i]);
            if (!ok) revert ExecutionFailed(i);
        }

        emit ProposalExecuted(proposalId);
    }

    function relayResult(
        uint256 proposalId,
        bytes calldata adapterParams
    ) external payable whenProtocolNotPaused {
        ProposalCore storage p = proposals[proposalId];
        if (p.proposalId == 0) revert ProposalNotFound();

        bytes memory payload = abi.encode(
            uint8(3),    
            proposalId,
            p.executed,
            p.cancelled
        );

        uint256 feePerChain = msg.value / satelliteChains.length;

        for (uint256 i; i < satelliteChains.length; ++i) {
            uint16 chainId = satelliteChains[i];
            bytes memory path = trustedSatellites[chainId];
            if (path.length == 0) continue;

            lzEndpoint.send{value: feePerChain}(
                chainId,
                path,
                payload,
                payable(msg.sender),
                address(0),
                adapterParams
            );
            emit ResultRelayed(proposalId, chainId, p.executed);
        }
    }

    function cancel(uint256 proposalId) external whenProtocolNotPaused onlyRole(GUARDIAN_ROLE) {
        ProposalCore storage p = proposals[proposalId];
        if (p.proposalId == 0) revert ProposalNotFound();
        p.cancelled = true;
        emit ProposalCancelled(proposalId);
    }

    receive() external payable {}
}

// ─────────────────────────────────────────────────────────────────────────────
//  B.  GOVERNANCE SATELLITE  (remote chains)
// ─────────────────────────────────────────────────────────────────────────────

contract GovernanceSatellite is AccessControl, ReentrancyGuard, Pausable, SecurityGated {

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    bytes32 public constant LAYER_ID      = keccak256("LAYER_8_HUB_SPOKE");

    // ── Errors ────────────────────────────────────────────────────────────────
    error InvalidSource();
    error ProposalNotFound();
    error ProposalNotActive();
    error AlreadyVoted();
    error InsufficientFee();
    error AlreadyCommitted();

    // ── Events ────────────────────────────────────────────────────────────────
    event ProposalReceived(uint256 indexed proposalId, uint256 start, uint256 end);
    event VoteCast(uint256 indexed proposalId, address voter, uint8 support, uint256 weight);
    event VotesCommitted(uint256 indexed proposalId, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes);
    event ResultReceived(uint256 indexed proposalId, bool executed);

    // ── Adapters ──────────────────────────────────────────────────────────────
    ILayerZeroEndpoint public immutable lzEndpoint;

    // ── State ─────────────────────────────────────────────────────────────────
    ERC20Votes public immutable govToken;
    uint16     public immutable hubChainId;
    bytes      public           trustedHub;

    mapping(uint256 => LocalProposal)               public proposals;
    mapping(uint256 => mapping(address => bool))    public hasVoted;

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address _govToken,
        address _lzEndpoint,
        uint16  _hubChainId,
        address _admin,
        address _governor,
        address _guardian,
        address _securityController,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify
    ) SecurityGated(_securityController) {
        govToken   = ERC20Votes(_govToken);
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
        hubChainId = _hubChainId;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);
        _grantRole(GUARDIAN_ROLE,      _guardian);

        _initSecurityModules(_access, _time, _state, _rate, _verify);
    }

    function setTrustedHub(bytes calldata path) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
    {
        trustedHub = path;
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }

    // ── Local voting ──────────────────────────────────────────────────────────

    function castVote(uint256 proposalId, uint8 support) 
        external 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        LocalProposal storage p = proposals[proposalId];
        if (p.proposalId == 0)                         revert ProposalNotFound();
        if (block.timestamp < p.startTimestamp ||
            block.timestamp > p.endTimestamp)          revert ProposalNotActive();
        if (hasVoted[proposalId][msg.sender])          revert AlreadyVoted();

        hasVoted[proposalId][msg.sender] = true;
        uint256 weight = govToken.getVotes(msg.sender);

        if      (support == 1) p.forVotes     += weight;
        else if (support == 0) p.againstVotes += weight;
        else                   p.abstainVotes += weight;

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function commitVotes(
        uint256 proposalId,
        bytes calldata adapterParams
    ) 
        external 
        payable 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        LocalProposal storage p = proposals[proposalId];
        if (p.proposalId == 0)              revert ProposalNotFound();
        if (block.timestamp <= p.endTimestamp) revert ProposalNotActive(); 
        if (p.committed)                    revert AlreadyCommitted();

        p.committed = true;

        bytes32 msgId = keccak256(abi.encodePacked(proposalId, block.chainid, p.forVotes, p.againstVotes));
        bytes memory payload = abi.encode(
            uint8(2),   
            proposalId,
            p.forVotes,
            p.againstVotes,
            p.abstainVotes,
            msgId
        );

        (uint256 fee,) = lzEndpoint.estimateFees(hubChainId, address(this), payload, false, adapterParams);
        if (msg.value < fee) revert InsufficientFee();

        lzEndpoint.send{value: msg.value}(
            hubChainId,
            trustedHub,
            payload,
            payable(msg.sender),
            address(0),
            adapterParams
        );

        emit VotesCommitted(proposalId, p.forVotes, p.againstVotes, p.abstainVotes);
    }

    // ── Inbound from hub ──────────────────────────────────────────────────────

    function lzReceive(
        uint16         srcChainId,
        bytes calldata srcAddress,
        uint64         /*nonce*/,
        bytes calldata payload
    ) 
        external 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        if (msg.sender != address(lzEndpoint)) revert InvalidSource();
        if (srcChainId != hubChainId)          revert InvalidSource();
        if (keccak256(srcAddress) != keccak256(trustedHub)) revert InvalidSource();

        uint8 msgType = uint8(payload[0]);

        if (msgType == 1) {
            // New proposal broadcast
            (, uint256 proposalId, uint256 start, uint256 end, string memory desc) =
                abi.decode(payload, (uint8, uint256, uint256, uint256, string));

            LocalProposal storage p = proposals[proposalId];
            p.proposalId     = proposalId;
            p.startTimestamp = start;
            p.endTimestamp   = end;
            p.description    = desc;

            emit ProposalReceived(proposalId, start, end);

        } else if (msgType == 3) {
            // Execution result
            (, uint256 proposalId, bool executed,) =
                abi.decode(payload, (uint8, uint256, bool, bool));

            LocalProposal storage p = proposals[proposalId];
            p.resultReceived = true;
            p.executed       = executed;

            emit ResultReceived(proposalId, executed);
        }
    }

    function getLocalTally(uint256 proposalId)
        external
        view
        returns (uint256 forVotes, uint256 againstVotes, uint256 abstainVotes)
    {
        LocalProposal storage p = proposals[proposalId];
        return (p.forVotes, p.againstVotes, p.abstainVotes);
    }

    receive() external payable {}
}

    // ── View helpers ──────────────────────────────────────────────────────────

    function getLocalTally(uint256 proposalId)
        external
        view
        returns (uint256 forVotes, uint256 againstVotes, uint256 abstainVotes)
    {
        LocalProposal storage p = proposals[proposalId];
        return (p.forVotes, p.againstVotes, p.abstainVotes);
    }

    receive() external payable {}
}
