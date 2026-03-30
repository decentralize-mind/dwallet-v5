// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../SecurityGated.sol";

/**
 * @title DWTPredictionMarket
 * @notice Binary and multi-outcome prediction markets settled by a trusted resolver.
 *
 *  Flow
 *  ----
 *  1. Admin creates a market with N outcomes and a resolution deadline.
 *  2. Users buy outcome shares (denominated in USDC) before the deadline.
 *  3. After the deadline, the resolver calls `resolveMarket(marketId, winningOutcome)`.
 *  4. Winners redeem their shares at a pro-rata share of the total pool
 *     (minus protocol fee).
 *
 *  Each "share" costs exactly 1 USDC and entitles the holder to
 *  (totalPool / winningShares) USDC if their outcome wins.
 */
contract DWTPredictionMarket is Ownable, ReentrancyGuard, SecurityGated {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    //  Types
    // ─────────────────────────────────────────────

    enum MarketState { OPEN, RESOLVED, CANCELLED }

    struct Market {
        string       question;
        string[]     outcomeLabels;
        uint256      deadline;           // unix timestamp: no buys after this
        uint256      resolutionDeadline; // resolver must act before this
        MarketState  state;
        uint8        winningOutcome;     // set on resolution
        uint256      totalPool;          // total USDC deposited (6 dec)
        address      resolver;           // can resolve this market
    }

    // ─────────────────────────────────────────────
    //  Storage
    // ─────────────────────────────────────────────

    IERC20  public immutable usdc;

    uint256 public nextMarketId;
    mapping(uint256 => Market) public markets;

    // marketId => outcomeIndex => totalShares
    mapping(uint256 => mapping(uint8 => uint256)) public outcomeTotalShares;

    // marketId => outcomeIndex => user => shares
    mapping(uint256 => mapping(uint8 => mapping(address => uint256))) public userShares;

    // Protocol fee in basis points
    uint256 public feeBps = 200;         // 2 %
    address public feeRecipient;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event MarketCreated(uint256 indexed id, string question, uint256 deadline, address resolver);
    event SharesBought(uint256 indexed marketId, address indexed buyer, uint8 outcome, uint256 shares);
    event MarketResolved(uint256 indexed marketId, uint8 winningOutcome, uint256 totalPool);
    event MarketCancelled(uint256 indexed marketId);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event RefundClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    constructor(address _usdc, address _feeRecipient, address _securityController) 
        Ownable(msg.sender) SecurityGated(_securityController) 
    {        usdc         = IERC20(_usdc);
        feeRecipient = _feeRecipient;
    }

    // ─────────────────────────────────────────────
    //  Market creation
    // ─────────────────────────────────────────────

    /**
     * @notice Create a new prediction market.
     * @param question           Human-readable question string.
     * @param outcomeLabels      Array of outcome label strings (2–16 outcomes).
     * @param deadline           Timestamp after which no new shares can be bought.
     * @param resolutionDeadline Timestamp by which the resolver must resolve.
     * @param resolver           Address authorised to resolve this market.
     */
    function createMarket(
        string calldata    question,
        string[] calldata  outcomeLabels,
        uint256            deadline,
        uint256            resolutionDeadline,
        address            resolver
    ) external onlyOwner whenProtocolNotPaused returns (uint256 id) {
        require(outcomeLabels.length >= 2 && outcomeLabels.length <= 16, "Invalid outcomes");
        require(deadline > block.timestamp,              "Deadline in past");
        require(resolutionDeadline > deadline,           "Resolution before deadline");
        require(resolver != address(0),                  "Zero resolver");

        id = nextMarketId++;
        Market storage m = markets[id];
        m.question           = question;
        m.deadline           = deadline;
        m.resolutionDeadline = resolutionDeadline;
        m.state              = MarketState.OPEN;
        m.resolver           = resolver;

        for (uint256 i = 0; i < outcomeLabels.length; i++) {
            m.outcomeLabels.push(outcomeLabels[i]);
        }

        emit MarketCreated(id, question, deadline, resolver);
    }

    // ─────────────────────────────────────────────
    //  Buying shares
    // ─────────────────────────────────────────────

    /**
     * @notice Buy `shares` shares for `outcome` in market `marketId`.
     *         Each share costs 1 USDC (6 decimals = 1_000_000).
     */
    function buyShares(uint256 marketId, uint8 outcome, uint256 shares)
        external nonReentrant whenProtocolNotPaused
    {
        Market storage m = markets[marketId];
        require(m.state == MarketState.OPEN,               "Not open");
        require(block.timestamp < m.deadline,              "Market closed");
        require(outcome < m.outcomeLabels.length,          "Invalid outcome");
        require(shares > 0,                                "Zero shares");

        // 1 share = 1 USDC (1_000_000 with 6 decimals)
        uint256 cost = shares * 1_000_000;
        usdc.safeTransferFrom(msg.sender, address(this), cost);

        m.totalPool                                        += cost;
        outcomeTotalShares[marketId][outcome]              += shares;
        userShares[marketId][outcome][msg.sender]          += shares;

        emit SharesBought(marketId, msg.sender, outcome, shares);
    }

    // ─────────────────────────────────────────────
    //  Resolution
    // ─────────────────────────────────────────────

    /**
     * @notice Resolve a market. Only callable by the designated resolver.
     */
    function resolveMarket(uint256 marketId, uint8 winningOutcome) external nonReentrant whenProtocolNotPaused {
        Market storage m = markets[marketId];
        require(m.state == MarketState.OPEN,              "Not open");
        require(block.timestamp >= m.deadline,            "Too early");
        require(block.timestamp <= m.resolutionDeadline,  "Resolution deadline passed");
        require(msg.sender == m.resolver,                 "Not resolver");
        require(winningOutcome < m.outcomeLabels.length,  "Invalid outcome");

        m.state          = MarketState.RESOLVED;
        m.winningOutcome = winningOutcome;

        // Collect protocol fee from total pool
        uint256 fee = m.totalPool * feeBps / 10_000;
        if (fee > 0) usdc.safeTransfer(feeRecipient, fee);
        m.totalPool -= fee;

        emit MarketResolved(marketId, winningOutcome, m.totalPool);
    }

    /**
     * @notice Cancel a market if the resolver failed to act in time.
     *         All participants can claim refunds.
     */
    function cancelMarket(uint256 marketId) external whenProtocolNotPaused {
        Market storage m = markets[marketId];
        require(m.state == MarketState.OPEN,              "Not open");
        require(block.timestamp > m.resolutionDeadline,   "Not past resolution deadline");

        m.state = MarketState.CANCELLED;
        emit MarketCancelled(marketId);
    }

    // ─────────────────────────────────────────────
    //  Claiming
    // ─────────────────────────────────────────────

    /**
     * @notice Claim winnings after resolution.
     */
    function claimWinnings(uint256 marketId) external nonReentrant whenProtocolNotPaused {
        Market storage m = markets[marketId];
        require(m.state == MarketState.RESOLVED, "Not resolved");

        uint8   winner     = m.winningOutcome;
        uint256 myShares   = userShares[marketId][winner][msg.sender];
        require(myShares > 0, "No winning shares");

        uint256 totalWinnerShares = outcomeTotalShares[marketId][winner];
        uint256 payout = m.totalPool * myShares / totalWinnerShares;

        userShares[marketId][winner][msg.sender] = 0;
        usdc.safeTransfer(msg.sender, payout);

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    /**
     * @notice Claim a full refund when a market is cancelled.
     *         User must call once per outcome they bought shares in.
     */
    function claimRefund(uint256 marketId, uint8 outcome) external nonReentrant whenProtocolNotPaused {
        Market storage m = markets[marketId];
        require(m.state == MarketState.CANCELLED, "Not cancelled");

        uint256 myShares = userShares[marketId][outcome][msg.sender];
        require(myShares > 0, "No shares");

        uint256 refund = myShares * 1_000_000; // 1 USDC per share
        userShares[marketId][outcome][msg.sender] = 0;
        usdc.safeTransfer(msg.sender, refund);

        emit RefundClaimed(marketId, msg.sender, refund);
    }

    // ─────────────────────────────────────────────
    //  View helpers
    // ─────────────────────────────────────────────

    function getOutcomeLabels(uint256 marketId) external view returns (string[] memory) {
        return markets[marketId].outcomeLabels;
    }

    function getImpliedProbability(uint256 marketId, uint8 outcome)
        external view returns (uint256 bps)
    {
        Market storage m = markets[marketId];
        if (m.totalPool == 0) return 0;
        uint256 outcomePool = outcomeTotalShares[marketId][outcome] * 1_000_000;
        return outcomePool * 10_000 / m.totalPool;
    }

    // ─────────────────────────────────────────────
    //  Admin
    // ─────────────────────────────────────────────

    function setFeeBps(uint256 _bps)      external onlyOwner whenProtocolNotPaused { require(_bps <= 1000); feeBps = _bps; }
    function setFeeRecipient(address _to) external onlyOwner whenProtocolNotPaused { feeRecipient = _to; }
}
