// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../SecurityGated.sol";

/**
 * @title FlashLoan
 * @notice ERC-3156 compliant flash loan pool for DWT tokens.
 *         Gated by Layer 7 Protocol-wide pause state.
 */
interface IERC3156FlashBorrower {
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes   calldata data
    ) external returns (bytes32);
}

contract FlashLoan is AccessControl, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    bytes32 public constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    IERC20  public immutable loanToken;

    uint256 public maxLoanBps;
    uint256 public flashFeesBps;
    uint256 public accumulatedFees;

    bool    public whitelistEnabled;
    mapping(address => bool) public whitelist;

    uint256 public constant BPS = 10_000;

    event FlashLoanExecuted(address indexed borrower, uint256 amount, uint256 fee);
    event FeesSwept(address indexed to, uint256 amount);
    event WhitelistUpdated(address borrower, bool allowed);
    event ConfigUpdated(uint256 maxLoanBps, uint256 feeBps);

    bytes32 public constant LAYER_ID = keccak256("LAYER_5_FLASH");
    bytes32 public constant FLASH_ACTION = keccak256("FLASH_ACTION");

    constructor(
        address _loanToken,
        uint256 _maxLoanBps,
        uint256 _flashFeesBps,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify,
        address admin,
        address guardian
    ) SecurityGated(_securityController) {
        require(admin != address(0), "FlashLoan: zero admin");
        require(guardian != address(0), "FlashLoan: zero guardian");
        require(_loanToken  != address(0),    "FlashLoan: zero token");
        require(_maxLoanBps <= BPS,           "FlashLoan: max loan overflow");
        require(_flashFeesBps <= 1000,        "FlashLoan: fee too high");

        loanToken     = IERC20(_loanToken);
        maxLoanBps    = _maxLoanBps;
        flashFeesBps  = _flashFeesBps;

        _initSecurityModules(_access, _time, _state, _rate, _verify);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE,         admin);
        _grantRole(GUARDIAN_ROLE,      guardian);
    }

    // ─── ERC-3156 Interface ───────────────────────────────────────────────────
    function maxFlashLoan(address token) external view returns (uint256) {
        if (token != address(loanToken)) return 0;
        uint256 poolBalance = _poolBalance();
        return (poolBalance * maxLoanBps) / BPS;
    }

    function flashFee(address token, uint256 amount) external view returns (uint256) {
        require(token == address(loanToken), "FlashLoan: unsupported token");
        return (amount * flashFeesBps) / BPS;
    }

    // ─── Flash Loan Execution ─────────────────────────────────────────────────
    /**
     * @notice Execute a flash loan.
     * @dev Gated by 5 Universal Locks:
     *      1. State: withStateGuard(LAYER_ID)
     *      2. Rate: withRateLimit(FLASH_ACTION, amount)
     *      3. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes   calldata data
    ) 
        external 
        nonReentrant 
        whenProtocolNotPaused 
        withStateGuard(LAYER_ID)
        withRateLimit(FLASH_ACTION, amount)
        returns (bool) 
    {
        require(token == address(loanToken), "FlashLoan: unsupported token");

        if (whitelistEnabled) {
            require(whitelist[address(receiver)], "FlashLoan: not whitelisted");
        }

        uint256 poolBal = _poolBalance();
        uint256 maxLoan = (poolBal * maxLoanBps) / BPS;
        require(amount <= maxLoan, "FlashLoan: exceeds max loan cap");
        require(amount > 0,        "FlashLoan: zero amount");

        uint256 fee = (amount * flashFeesBps) / BPS;

        loanToken.safeTransfer(address(receiver), amount);

        bytes32 result = receiver.onFlashLoan(msg.sender, token, amount, fee, data);
        require(result == CALLBACK_SUCCESS, "FlashLoan: invalid callback return");

        loanToken.safeTransferFrom(address(receiver), address(this), amount + fee);
        accumulatedFees += fee;

        emit FlashLoanExecuted(address(receiver), amount, fee);
        return true;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function sweepFees(address to) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(to != address(0),              "FlashLoan: zero recipient");
        uint256 amount = accumulatedFees;
        require(amount > 0,                    "FlashLoan: no fees");
        accumulatedFees = 0;
        loanToken.safeTransfer(to, amount);
        emit FeesSwept(to, amount);
    }

    function setMaxLoanBps(uint256 bps) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(bps <= BPS, "FlashLoan: overflow");
        maxLoanBps = bps;
        emit ConfigUpdated(bps, flashFeesBps);
    }

    function setFlashFeesBps(uint256 bps) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(bps <= 1000, "FlashLoan: fee too high");
        flashFeesBps = bps;
        emit ConfigUpdated(maxLoanBps, bps);
    }

    function setWhitelistEnabled(bool enabled) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        whitelistEnabled = enabled;
    }

    function setWhitelist(address borrower, bool allowed) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        whitelist[borrower] = allowed;
        emit WhitelistUpdated(borrower, allowed);
    }

    function deposit(uint256 amount) external whenProtocolNotPaused {
        require(amount > 0, "FlashLoan: zero deposit");
        loanToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdraw(uint256 amount) external onlyRole(ADMIN_ROLE) whenProtocolNotPaused {
        require(amount <= _poolBalance(), "FlashLoan: amount exceeds pool");
        loanToken.safeTransfer(msg.sender, amount);
    }

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    // ─── Internal ─────────────────────────────────────────────────────────────
    function _poolBalance() internal view returns (uint256) {
        uint256 total = loanToken.balanceOf(address(this));
        return total > accumulatedFees ? total - accumulatedFees : 0;
    }
}
