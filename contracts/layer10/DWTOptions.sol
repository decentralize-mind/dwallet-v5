// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../SecurityGated.sol";

contract DWTOptions is AccessControl, ReentrancyGuard, SecurityGated {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    bytes32 public constant LAYER_ID      = keccak256("LAYER_10_ECOSYSTEM");

    // ─────────────────────────────────────────────
    //  Types
    // ─────────────────────────────────────────────

    enum OptionType { CALL, PUT }
    enum OptionState { OPEN, EXERCISED, EXPIRED, CANCELLED }

    struct Option {
        address writer;         // seller / collateral poster
        address buyer;          // zero until purchased
        OptionType optionType;
        uint256 strikePrice;    // 18-decimal USD price
        uint256 expiry;         // unix timestamp
        uint256 amount;         // DWT amount (18 dec)
        uint256 premium;        // USDC premium (6 dec)
        uint256 collateral;     // USDC locked by writer (6 dec)
        OptionState state;
    }

    // ─────────────────────────────────────────────
    //  Storage
    // ─────────────────────────────────────────────

    IERC20  public immutable dwt;
    IERC20  public immutable usdc;
    address public           priceOracle;   // returns 18-dec DWT/USD price

    uint256 public nextOptionId;
    mapping(uint256 => Option) public options;

    // Protocol fee in basis points (e.g. 30 = 0.30%)
    uint256 public feeBps = 30;
    address public feeRecipient;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event OptionWritten(uint256 indexed id, address indexed writer, OptionType optionType,
                        uint256 strikePrice, uint256 expiry, uint256 amount, uint256 premium);
    event OptionPurchased(uint256 indexed id, address indexed buyer);
    event OptionExercised(uint256 indexed id, address indexed buyer, uint256 payout);
    event OptionExpired(uint256 indexed id);
    event OptionCancelled(uint256 indexed id);

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    constructor(
        address _dwt, 
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
        dwt          = IERC20(_dwt);
        usdc         = IERC20(_usdc);
        priceOracle  = _oracle;
        feeRecipient = _feeRecipient;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,         _admin);
        _grantRole(GOVERNOR_ROLE,      _governor);
        _grantRole(GUARDIAN_ROLE,      _guardian);

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);
    }

    // ─────────────────────────────────────────────
    //  Writer actions
    // ─────────────────────────────────────────────

    /**
     * @notice Write (sell) an option by locking collateral.
     * @dev    CALL writers lock USDC equal to strikePrice * amount (worst case payout).
     *         PUT  writers lock USDC equal to strikePrice * amount.
     */
    function writeOption(
        OptionType  _type,
        uint256     _strikePrice,
        uint256     _expiry,
        uint256     _amount,
        uint256     _premium
    ) 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        returns (uint256 id) 
    {
        require(_expiry > block.timestamp,     "Expiry must be future");
        require(_amount > 0,                   "Amount zero");
        require(_strikePrice > 0,              "Strike zero");

        // collateral in USDC (6 dec): strikePrice(18) * amount(18) / 1e30
        uint256 collateral = _strikePrice * _amount / 1e30;

        usdc.safeTransferFrom(msg.sender, address(this), collateral);

        id = nextOptionId++;
        options[id] = Option({
            writer:      msg.sender,
            buyer:       address(0),
            optionType:  _type,
            strikePrice: _strikePrice,
            expiry:      _expiry,
            amount:      _amount,
            premium:     _premium,
            collateral:  collateral,
            state:       OptionState.OPEN
        });

        emit OptionWritten(id, msg.sender, _type, _strikePrice, _expiry, _amount, _premium);
    }

    /**
     * @notice Buy an open option by paying the writer's premium.
     */
    function buyOption(uint256 id) 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        Option storage opt = options[id];
        require(opt.state == OptionState.OPEN,      "Not open");
        require(opt.buyer == address(0),             "Already sold");
        require(block.timestamp < opt.expiry,        "Expired");

        uint256 fee    = opt.premium * feeBps / 10_000;
        uint256 toWriter = opt.premium - fee;

        usdc.safeTransferFrom(msg.sender, opt.writer,   toWriter);
        usdc.safeTransferFrom(msg.sender, feeRecipient, fee);

        opt.buyer = msg.sender;
        emit OptionPurchased(id, msg.sender);
    }

    /**
     * @notice Exercise a purchased option at expiry (European style).
     */
    function exercise(uint256 id) 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        Option storage opt = options[id];
        require(opt.state == OptionState.OPEN,   "Not open");
        require(opt.buyer == msg.sender,          "Not buyer");
        require(block.timestamp >= opt.expiry,   "Not yet expired");

        uint256 spotPrice = _getPrice();
        uint256 payout    = _calcPayout(opt, spotPrice);

        opt.state = OptionState.EXERCISED;

        if (payout > 0) {
            // Return remaining collateral to writer
            uint256 writerBack = opt.collateral > payout ? opt.collateral - payout : 0;
            usdc.safeTransfer(msg.sender,  payout);
            if (writerBack > 0) usdc.safeTransfer(opt.writer, writerBack);
        } else {
            // Out of the money – writer gets all collateral back
            usdc.safeTransfer(opt.writer, opt.collateral);
        }

        emit OptionExercised(id, msg.sender, payout);
    }

    /**
     * @notice Expire an option that has passed expiry and was not exercised.
     *         Anyone may call; collateral returned to writer.
     */
    function expireOption(uint256 id) 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        Option storage opt = options[id];
        require(opt.state == OptionState.OPEN,   "Not open");
        require(block.timestamp >= opt.expiry,   "Not yet expired");

        opt.state = OptionState.EXPIRED;
        usdc.safeTransfer(opt.writer, opt.collateral);

        emit OptionExpired(id);
    }

    /**
     * @notice Writer can cancel an unsold option and reclaim collateral.
     */
    function cancelOption(uint256 id) 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
    {
        Option storage opt = options[id];
        require(opt.state == OptionState.OPEN,  "Not open");
        require(opt.buyer == address(0),         "Already sold");
        require(opt.writer == msg.sender,        "Not writer");

        opt.state = OptionState.CANCELLED;
        usdc.safeTransfer(msg.sender, opt.collateral);

        emit OptionCancelled(id);
    }

    // ─────────────────────────────────────────────
    //  Internal helpers
    // ─────────────────────────────────────────────

    function _calcPayout(Option storage opt, uint256 spotPrice) internal view returns (uint256) {
        if (opt.optionType == OptionType.CALL) {
            if (spotPrice <= opt.strikePrice) return 0;
            uint256 diff   = spotPrice - opt.strikePrice;
            uint256 rawPnl = diff * opt.amount / 1e30; // USDC 6 dec
            return rawPnl > opt.collateral ? opt.collateral : rawPnl;
        } else {
            if (spotPrice >= opt.strikePrice) return 0;
            uint256 diff   = opt.strikePrice - spotPrice;
            uint256 rawPnl = diff * opt.amount / 1e30;
            return rawPnl > opt.collateral ? opt.collateral : rawPnl;
        }
    }

    function _getPrice() internal view returns (uint256) {
        // Interface: IDWTOracle(priceOracle).latestPrice() returns uint256 18-dec
        (bool ok, bytes memory data) = priceOracle.staticcall(
            abi.encodeWithSignature("latestPrice()")
        );
        require(ok && data.length >= 32, "Oracle error");
        return abi.decode(data, (uint256));
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
        priceOracle = _oracle; 
    }

    function setFeeBps(uint256 _bps, bytes32 hash, bytes calldata signature) 
        external 
        onlyRole(GOVERNOR_ROLE) 
        whenProtocolNotPaused 
        withSignature(hash, signature)
    { 
        require(_bps <= 500); 
        feeBps = _bps; 
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
}
