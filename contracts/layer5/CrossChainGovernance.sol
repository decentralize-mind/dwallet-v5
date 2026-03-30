// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../SecurityGated.sol";

/**
 * @title CrossChainGovernance
 * @notice Cross-chain voting with pause gating via Layer 7.
 */
interface ICrossChainMessenger {
    function sendMessage(uint256 destChainId, address destContract, bytes calldata payload) external;
}

interface IGovernor {
    function castVoteWithReason(uint256 proposalId, uint8 support, string calldata reason) external;
}

contract CrossChainGovernance is AccessControl, Pausable, ReentrancyGuard, SecurityGated {
    bytes32 public constant ADMIN_ROLE           = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE        = keccak256("GUARDIAN_ROLE");
    bytes32 public constant TALLY_SUBMITTER_ROLE = keccak256("TALLY_SUBMITTER_ROLE");
    bytes32 public constant GOV_COUNCIL_ROLE     = keccak256("GOV_COUNCIL_ROLE");

    bool    public immutable isSatellite;

    ICrossChainMessenger public messenger;
    address              public counterpart;
    uint256              public counterpartChainId;

    struct ProposalVote {
        bool    exists;
        bool    finalized;
        uint256 startTime;
        uint256 endTime;
        uint256 snapshotBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        uint256 receivedAt;
    }

    mapping(uint256 => ProposalVote)                     public proposalVotes;
    mapping(uint256 => mapping(address => bool))          public hasVoted;
    mapping(uint256 => bool)                              public usedNonces;
    mapping(uint256 => bool)                              public vetoedProposals;

    uint256 public maxL2WeightBps;
    uint256 public minL2Quorum;
    uint256 public vetoWindowDuration;

    uint256 public constant BPS = 10_000;

    event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 weight);
    event TallySubmitted(uint256 indexed proposalId, uint256 forVotes, uint256 againstVotes);
    event ProposalFinalized(uint256 indexed proposalId);
    event ProposalVetoed(uint256 indexed proposalId, address council);
    event ProposalRegistered(uint256 indexed proposalId, uint256 start, uint256 end);

    constructor(
        bool    _isSatellite,
        address _messenger,
        address _counterpart,
        uint256 _counterpartChainId,
        uint256 _maxL2WeightBps,
        uint256 _minL2Quorum,
        uint256 _vetoWindowDuration,
        address _securityController,
        address admin,
        address guardian,
        address tallySubmitter,
        address council
    ) SecurityGated(_securityController) {
        require(_messenger != address(0), "XGov: zero messenger");

        isSatellite        = _isSatellite;
        messenger          = ICrossChainMessenger(_messenger);
        counterpart        = _counterpart;
        counterpartChainId = _counterpartChainId;
        maxL2WeightBps     = _maxL2WeightBps;
        minL2Quorum        = _minL2Quorum;
        vetoWindowDuration = _vetoWindowDuration;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(GUARDIAN_ROLE,      guardian);
        _grantRole(TALLY_SUBMITTER_ROLE, tallySubmitter);
        _grantRole(GOV_COUNCIL_ROLE,   council);
    }

    function registerProposal(
        uint256 proposalId,
        uint256 startTime,
        uint256 endTime,
        uint256 snapshotBlock
    ) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(isSatellite, "XGov: satellite only");
        require(!proposalVotes[proposalId].exists, "XGov: already registered");

        proposalVotes[proposalId] = ProposalVote({
            exists:        true,
            finalized:     false,
            startTime:     startTime,
            endTime:       endTime,
            snapshotBlock: snapshotBlock,
            forVotes:      0,
            againstVotes:  0,
            abstainVotes:  0,
            receivedAt:    0
        });

        emit ProposalRegistered(proposalId, startTime, endTime);
    }

    /**
     * @notice Cast vote on L2 satellite.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function castVote(
        uint256 proposalId,
        uint8   support,
        uint256 weight,
        uint256 /* nonce */
    ) external nonReentrant whenNotPaused whenProtocolNotPaused {
        require(isSatellite, "XGov: satellite only");

        ProposalVote storage pv = proposalVotes[proposalId];
        require(pv.exists,                                    "XGov: proposal not registered");
        require(!pv.finalized,                                "XGov: already finalized");
        require(block.timestamp >= pv.startTime,             "XGov: voting not started");
        require(block.timestamp <= pv.endTime,               "XGov: voting ended");
        require(!hasVoted[proposalId][msg.sender],            "XGov: already voted");

        hasVoted[proposalId][msg.sender] = true;
        support == 1 ? pv.forVotes      += weight :
        support == 0 ? pv.againstVotes  += weight :
                       pv.abstainVotes  += weight;

        emit VoteCast(msg.sender, proposalId, support, weight);
    }

    /**
     * @notice Submit tally to mainnet.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function submitTallyToHub(uint256 proposalId, uint256 nonce)
        external onlyRole(TALLY_SUBMITTER_ROLE) whenNotPaused whenProtocolNotPaused
    {
        require(isSatellite, "XGov: satellite only");
        ProposalVote storage pv = proposalVotes[proposalId];
        require(pv.exists && !pv.finalized,           "XGov: not active");
        require(block.timestamp > pv.endTime,         "XGov: voting not ended");
        require(!usedNonces[nonce],                   "XGov: nonce replay");

        usedNonces[nonce] = true;
        pv.finalized      = true;

        bytes memory payload = abi.encode(
            proposalId,
            pv.forVotes,
            pv.againstVotes,
            pv.abstainVotes,
            nonce
        );
        messenger.sendMessage(counterpartChainId, counterpart, payload);

        emit ProposalFinalized(proposalId);
    }

    function receiveL2Tally(bytes calldata payload) external nonReentrant whenProtocolNotPaused {
        require(!isSatellite,                        "XGov: home only");
        require(msg.sender == address(messenger),    "XGov: messenger only");

        (uint256 proposalId, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 nonce)
            = abi.decode(payload, (uint256, uint256, uint256, uint256, uint256));

        require(!usedNonces[nonce], "XGov: nonce replay");
        usedNonces[nonce] = true;

        ProposalVote storage pv = proposalVotes[proposalId];
        if (!pv.exists) {
            proposalVotes[proposalId] = ProposalVote({
                exists:        true,
                finalized:     false,
                startTime:     0,
                endTime:       0,
                snapshotBlock: 0,
                forVotes:      forVotes,
                againstVotes:  againstVotes,
                abstainVotes:  abstainVotes,
                receivedAt:    block.timestamp
            });
        } else {
            require(!pv.finalized, "XGov: already finalized");
            pv.forVotes     += forVotes;
            pv.againstVotes += againstVotes;
            pv.abstainVotes += abstainVotes;
            pv.receivedAt    = block.timestamp;
        }

        emit TallySubmitted(proposalId, forVotes, againstVotes);
    }

    function vetoL2Tally(uint256 proposalId) external onlyRole(GOV_COUNCIL_ROLE) whenProtocolNotPaused {
        ProposalVote storage pv = proposalVotes[proposalId];
        require(!isSatellite,                                              "XGov: home only");
        require(pv.exists && !pv.finalized,                               "XGov: not active");
        require(block.timestamp <= pv.receivedAt + vetoWindowDuration,   "XGov: veto window closed");

        vetoedProposals[proposalId] = true;
        pv.finalized                = true;
        emit ProposalVetoed(proposalId, msg.sender);
    }

    function setMessenger(address _messenger) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(_messenger != address(0), "XGov: zero messenger");
        messenger = ICrossChainMessenger(_messenger);
    }

    function setMaxL2WeightBps(uint256 bps) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(bps <= BPS, "XGov: overflow");
        maxL2WeightBps = bps;
    }

    function setVetoWindowDuration(uint256 duration) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        vetoWindowDuration = duration;
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE)    { _unpause(); }
}
