// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../SecurityGated.sol";

interface IPriceFeed {
    function latestRoundData()
        external
        view
        returns (
            uint80  roundId,
            int256  answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80  answeredInRound
        );
}

/**
 * @title DWTPerpetuals
 * @notice Simplified perpetual futures on DWT/USD.
 *
 *  - Traders post USDC margin and open LONG or SHORT positions.
 *  - Funding rate is exchanged every `fundingInterval` seconds between longs and shorts.
 *  - Positions can be liquidated when margin ratio falls below `maintenanceMarginBps`.
 *  - Max leverage is configurable (default 10x).
 *
 *  Architecture notes
 *  ------------------
 *  Longs  profit when price rises.
 *  Shorts profit when price falls.
 *  Open interest is tracked separately; in a production system an AMM or
 *  order-book would balance sides and set the funding direction automatically.
 */
contract DWTPerpetuals is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    bytes32 public constant LAYER_ID      = keccak256("LAYER_10_ECOSYSTEM");

    // ── Action IDs for Rate Limiting ─────────────────────────────────────────
    bytes32 public constant ACTION_OPEN_POSITION = keccak256("ACTION_OPEN_POSITION");

    // ─────────────────────────────────────────────
    //  Types
    // ─────────────────────────────────────────────

    enum Side { LONG, SHORT }

    struct Position {
        address trader;
        Side    side;
        uint256 sizeUsd;          // notional in USDC (6 dec)
        uint256 margin;           // USDC collateral (6 dec)
        uint256 entryPrice;       // 18-dec DWT/USD at open
        int256  fundingDebt;      // cumulative funding debt at open (18 dec)
        uint256 openTimestamp;
    }

    // ─────────────────────────────────────────────
    //  Storage
    // ─────────────────────────────────────────────

    IERC20     public immutable usdc;
    IPriceFeed public           priceOracle;

    uint256 public constant STALE_PRICE_DELAY = 1 hours;

    uint256 public nextPositionId;
    mapping(uint256 => Position) public positions;

    // Open interest
    uint256 public totalLongOI;   // notional USDC
    uint256 public totalShortOI;

    // Risk parameters
    uint256 public maxLeverageBps        = 1_000_000; // 10x  (1x = 100_000 bps)
    uint256 public maintenanceMarginBps  = 500;        // 5%
    uint256 public liquidatorFeeBps      = 100;        // 1% of margin to liquidator
    uint256 public protocolFeeBps        = 30;

    // Funding
    uint256 public fundingInterval    = 8 hours;
    uint256 public fundingRateBps     = 10;            // 0.10% per interval paid by majority side
    uint256 public lastFundingTime;
    int256  public cumulativeFundingLong;              // 18 dec, positive = longs pay
    int256  public cumulativeFundingShort;

    address public feeRecipient;
    uint256 public insuranceFund;                      // USDC reserve for bad debt

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event PositionOpened(uint256 indexed id, address indexed trader, Side side,
                         uint256 sizeUsd, uint256 margin, uint256 entryPrice);
    event PositionClosed(uint256 indexed id, address indexed trader, int256 pnl);
    event PositionLiquidated(uint256 indexed id, address indexed liquidator, uint256 liquidatorFee);
    event FundingSettled(uint256 timestamp, int256 longRate, int256 shortRate);
    event MarginAdded(uint256 indexed id, uint256 amount);

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    constructor(
        address _usdc, 
        address _oracle, 
        address _feeRecipient, 
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
    ) SecurityGated(_securityController) {
        usdc          = IERC20(_usdc);
        priceOracle   = IPriceFeed(_oracle);
        feeRecipient  = _feeRecipient;
        lastFundingTime = block.timestamp;
    }

    // ─────────────────────────────────────────────
    //  Funding
    // ─────────────────────────────────────────────

    /**
     * @notice Settle any pending funding periods. Call before any position action.
     */
    function settleFunding() public whenProtocolNotPaused withStateGuard(LAYER_ID) {
        uint256 elapsed = block.timestamp - lastFundingTime;
        if (elapsed < fundingInterval) return;

        uint256 periods = elapsed / fundingInterval;
        lastFundingTime += periods * fundingInterval;

        if (totalLongOI == 0 && totalShortOI == 0) return;

        // Longs pay shorts when longOI > shortOI, else shorts pay longs
        for (uint256 i = 0; i < periods; i++) {
            if (totalLongOI >= totalShortOI) {
                // Longs pay
                int256 rate = int256(fundingRateBps * 1e14); // convert bps to 18-dec fraction
                cumulativeFundingLong  += rate;
                cumulativeFundingShort -= (totalShortOI == 0 ? int256(0) :
                    rate * int256(totalLongOI) / int256(totalShortOI));
            } else {
                int256 rate = int256(fundingRateBps * 1e14);
                cumulativeFundingShort += rate;
                cumulativeFundingLong  -= rate * int256(totalShortOI) / int256(totalLongOI);
            }
        }

        emit FundingSettled(block.timestamp, cumulativeFundingLong, cumulativeFundingShort);
    }

    // ─────────────────────────────────────────────
    //  Open / Close / Liquidate
    // ─────────────────────────────────────────────

    /**
     * @notice Open a leveraged position.
     * @param side     LONG or SHORT
     * @param sizeUsd  Notional size in USDC (6 dec)
     * @param margin   Collateral in USDC (6 dec); leverage = sizeUsd / margin
     */
    function openPosition(Side side, uint256 sizeUsd, uint256 margin)
        external 
        nonReentrant 
        whenNotPaused 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withRateLimit(ACTION_OPEN_POSITION, sizeUsd)
        returns (uint256 id)
    {
        settleFunding();

        require(margin > 0, "Margin zero");
        require(sizeUsd >= margin, "Size < margin");
        // leverage check: sizeUsd / margin <= maxLeverageBps / 100_000
        require(sizeUsd * 100_000 <= margin * maxLeverageBps, "Exceeds max leverage");

        uint256 openFee = sizeUsd * protocolFeeBps / 10_000;
        require(margin > openFee, "Margin too small for fee");

        usdc.safeTransferFrom(msg.sender, address(this), margin);
        usdc.safeTransfer(feeRecipient, openFee);
        uint256 effectiveMargin = margin - openFee;

        uint256 price = _getPrice();

        id = nextPositionId++;
        positions[id] = Position({
            trader:       msg.sender,
            side:         side,
            sizeUsd:      sizeUsd,
            margin:       effectiveMargin,
            entryPrice:   price,
            fundingDebt:  side == Side.LONG ? cumulativeFundingLong : cumulativeFundingShort,
            openTimestamp: block.timestamp
        });

        if (side == Side.LONG)  totalLongOI  += sizeUsd;
        else                    totalShortOI += sizeUsd;

        emit PositionOpened(id, msg.sender, side, sizeUsd, effectiveMargin, price);
    }

    /**
     * @notice Close your own position and realize PnL.
     */
    function closePosition(uint256 id) 
        external 
        nonReentrant 
        whenNotPaused 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        settleFunding();
        Position storage pos = positions[id];
        require(pos.trader == msg.sender, "Not your position");
        require(pos.sizeUsd > 0,          "Already closed");

        (int256 pnl, uint256 fundingCost) = _calcPnlAndFunding(pos);

        _removeOI(pos);

        int256 remaining = int256(pos.margin) + pnl - int256(fundingCost);
        delete positions[id];

        if (remaining > 0) {
            usdc.safeTransfer(msg.sender, uint256(remaining));
        } else {
            // Bad debt covered by insurance fund
            uint256 deficit = uint256(-remaining);
            if (insuranceFund >= deficit) insuranceFund -= deficit;
            // else deficit is socialized (simplified)
        }

        emit PositionClosed(id, msg.sender, pnl);
    }

    /**
     * @notice Liquidate an undercollateralised position.
     */
    function liquidate(uint256 id) 
        external 
        nonReentrant 
        whenNotPaused 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        settleFunding();
        Position storage pos = positions[id];
        require(pos.sizeUsd > 0, "Already closed");

        (int256 pnl, uint256 fundingCost) = _calcPnlAndFunding(pos);
        int256 remaining = int256(pos.margin) + pnl - int256(fundingCost);

        uint256 maintenanceMargin = pos.sizeUsd * maintenanceMarginBps / 10_000;
        require(remaining < int256(maintenanceMargin), "Not liquidatable");

        _removeOI(pos);

        address trader     = pos.trader;
        uint256 margin     = pos.margin;
        delete positions[id];

        uint256 liqFee = margin * liquidatorFeeBps / 10_000;
        if (liqFee > uint256(remaining > 0 ? remaining : int256(0))) {
            liqFee = uint256(remaining > 0 ? remaining : int256(0));
        }

        if (liqFee > 0) usdc.safeTransfer(msg.sender, liqFee);

        emit PositionLiquidated(id, msg.sender, liqFee);
    }

    /**
     * @notice Add margin to an existing position to avoid liquidation.
     */
    function addMargin(uint256 id, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        Position storage pos = positions[id];
        require(pos.trader == msg.sender, "Not your position");
        require(pos.sizeUsd > 0,          "Already closed");

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        pos.margin += amount;

        emit MarginAdded(id, amount);
    }

    // ─────────────────────────────────────────────
    //  View helpers
    // ─────────────────────────────────────────────

    function getPositionHealth(uint256 id)
        external view returns (int256 remainingMargin, uint256 maintenanceMargin)
    {
        Position storage pos = positions[id];
        (int256 pnl, uint256 fundingCost) = _calcPnlAndFunding(pos);
        remainingMargin  = int256(pos.margin) + pnl - int256(fundingCost);
        maintenanceMargin = pos.sizeUsd * maintenanceMarginBps / 10_000;
    }

    // ─────────────────────────────────────────────
    //  Internal
    // ─────────────────────────────────────────────

    function _calcPnlAndFunding(Position storage pos)
        internal view returns (int256 pnl, uint256 fundingCost)
    {
        uint256 currentPrice = _getPrice();
        int256  priceDelta   = int256(currentPrice) - int256(pos.entryPrice);

        // PnL = (priceDelta / entryPrice) * sizeUsd
        int256 pnlRaw = priceDelta * int256(pos.sizeUsd) / int256(pos.entryPrice);
        pnl = pos.side == Side.LONG ? pnlRaw : -pnlRaw;

        // Funding cost = (currentCumulative - debtAtOpen) * sizeUsd / 1e18
        int256 cumNow = pos.side == Side.LONG ? cumulativeFundingLong : cumulativeFundingShort;
        int256 fundingDelta = cumNow - pos.fundingDebt;
        int256 fundingRaw   = fundingDelta * int256(pos.sizeUsd) / 1e18;
        fundingCost = fundingRaw > 0 ? uint256(fundingRaw) : 0;
    }

    function _removeOI(Position storage pos) internal {
        if (pos.side == Side.LONG) {
            totalLongOI  = totalLongOI  >= pos.sizeUsd ? totalLongOI  - pos.sizeUsd : 0;
        } else {
            totalShortOI = totalShortOI >= pos.sizeUsd ? totalShortOI - pos.sizeUsd : 0;
        }
    }

    function _getPrice() internal view returns (uint256) {
        (, int256 price, , uint256 updatedAt, ) = priceOracle.latestRoundData();
        require(price > 0, "Oracle invalid price");
        require(block.timestamp - updatedAt <= STALE_PRICE_DELAY, "Oracle price stale");
        return uint256(price);
    }

    // ─────────────────────────────────────────────
    //  Admin
    // ─────────────────────────────────────────────

    function setOracle(address _oracle, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    { 
        priceOracle = IPriceFeed(_oracle); 
    }

    function setMaxLeverage(uint256 _bps, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    { 
        maxLeverageBps = _bps; 
    }

    function setMaintenanceMargin(uint256 _bps, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    { 
        maintenanceMarginBps = _bps; 
    }

    function setFundingRateBps(uint256 _bps, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    { 
        fundingRateBps = _bps; 
    }

    function setFundingInterval(uint256 _secs, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    { 
        fundingInterval = _secs; 
    }

    function setFeeRecipient(address _to, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    { 
        feeRecipient = _to; 
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(GOVERNOR_ROLE) { _unpause(); }

    function depositInsurance(uint256 amount) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        insuranceFund += amount;
    }
}
