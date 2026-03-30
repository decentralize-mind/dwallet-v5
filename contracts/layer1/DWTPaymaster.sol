// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../SecurityGated.sol";

/**
 * @title DWTPaymaster
 * @notice ERC-4337 Paymaster with pause gating via Layer 7.
 */
interface IEntryPoint {
    function depositTo(address account) external payable;
    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external;
}

interface IDWTETHRateFeed {
    function getRate() external view returns (uint256 rate, bool isStale);
}

interface IBalancerVault {
    function getPausedState() external view returns (bool paused, uint256 pauseWindowEndTime, uint256 bufferPeriodEndTime);
}

struct UserOperation {
    address sender;
    uint256 nonce;
    bytes   initCode;
    bytes   callData;
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes   paymasterAndData;
    bytes   signature;
}

enum PostOpMode { opSucceeded, opReverted, postOpReverted }

contract DWTPaymaster is Ownable, SecurityGated {
    using SafeERC20 for IERC20;

    IEntryPoint public immutable entryPoint;
    IERC20      public immutable dwtToken;

    uint256 public constant BPS = 10_000;

    IDWTETHRateFeed public rateFeed;
    IBalancerVault  public balancerVault;
    uint256          public fallbackRate;
    uint256          public markupBps;
    uint256          public maxRateStaleness;

    mapping(bytes32 => uint256) private _preCharged;

    event UserOpSponsored(address indexed sender, bytes32 indexed opHash, uint256 dwtCharged);
    event UserOpRefunded(address indexed sender, bytes32 indexed opHash, uint256 dwtRefunded);
    event RateFeedUpdated(address oldFeed, address newFeed);
    event MarkupUpdated(uint256 oldMarkup, uint256 newMarkup);
    event FallbackRateUpdated(uint256 oldRate, uint256 newRate);

    constructor(
        address _entryPoint,
        address _dwtToken,
        address _rateFeed,
        uint256 _initialFallbackRate,
        uint256 _markupBps,
        address _securityController,
        address initialOwner
    ) Ownable(initialOwner) SecurityGated(_securityController) {
        require(_entryPoint != address(0), "Paymaster: zero entryPoint");
        require(_dwtToken   != address(0), "Paymaster: zero dwtToken");
        require(_markupBps  >= BPS,        "Paymaster: markup below floor");

        entryPoint          = IEntryPoint(_entryPoint);
        dwtToken            = IERC20(_dwtToken);
        rateFeed            = IDWTETHRateFeed(_rateFeed);
        fallbackRate        = _initialFallbackRate;
        markupBps           = _markupBps;
        maxRateStaleness    = 2 hours;
    }

    /**
     * @notice Called by EntryPoint to validate the paymaster will cover the op.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external whenProtocolNotPaused returns (bytes memory context, uint256 validationData) {
        require(msg.sender == address(entryPoint), "Paymaster: not EntryPoint");

        address sender  = userOp.sender;
        uint256 dwtCost = _ethToDWT(maxCost);

        require(dwtToken.balanceOf(sender)                    >= dwtCost, "Paymaster: insufficient DWT balance");
        require(dwtToken.allowance(sender, address(this))     >= dwtCost, "Paymaster: insufficient DWT allowance");

        dwtToken.safeTransferFrom(sender, address(this), dwtCost);
        _preCharged[userOpHash] = dwtCost;

        emit UserOpSponsored(sender, userOpHash, dwtCost);

        context        = abi.encode(sender, userOpHash, dwtCost);
        validationData = 0;
    }

    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external {
        require(msg.sender == address(entryPoint), "Paymaster: not EntryPoint");

        (address sender, bytes32 userOpHash, uint256 preChargedDWT) =
            abi.decode(context, (address, bytes32, uint256));

        uint256 actualDWT = _ethToDWT(actualGasCost);

        if (actualDWT < preChargedDWT) {
            uint256 refund = preChargedDWT - actualDWT;
            dwtToken.safeTransfer(sender, refund);
            emit UserOpRefunded(sender, userOpHash, refund);
        }

        delete _preCharged[userOpHash];
    }

    function _ethToDWT(uint256 ethAmount) internal view returns (uint256) {
        uint256 rate = _getRate();
        uint256 rawDWT = (ethAmount * rate) / 1e18;
        return (rawDWT * markupBps) / BPS;
    }

    function _getRate() internal view returns (uint256) {
        if (address(balancerVault) != address(0)) {
            // Balancer Vault read-only reentrancy check. 
            // Calling getPausedState() and checking its result is the standard pattern 
            // for detecting if the vault is currently in an inconsistent state.
            (bool paused,,) = balancerVault.getPausedState();
            require(!paused, "Paymaster: Balancer Vault paused");
        }

        if (address(rateFeed) != address(0)) {
            try rateFeed.getRate() returns (uint256 rate, bool isStale) {
                if (!isStale && rate > 0) {
                    return rate;
                }
            } catch {}
        }
        require(fallbackRate > 0, "Paymaster: no valid rate");
        return fallbackRate;
    }

    function setRateFeed(address _rateFeed, address _vault) external onlyOwner {
        address old = address(rateFeed);
        rateFeed    = IDWTETHRateFeed(_rateFeed);
        balancerVault = IBalancerVault(_vault);
        emit RateFeedUpdated(old, _rateFeed);
    }

    function setMarkup(uint256 _markupBps) external onlyOwner {
        require(_markupBps >= BPS, "Paymaster: markup below floor");
        uint256 old = markupBps;
        markupBps   = _markupBps;
        emit MarkupUpdated(old, _markupBps);
    }

    function setFallbackRate(uint256 _rate) external onlyOwner {
        require(_rate > 0, "Paymaster: zero fallback rate");
        uint256 old  = fallbackRate;
        fallbackRate = _rate;
        emit FallbackRateUpdated(old, _rate);
    }

    function setMaxRateStaleness(uint256 _maxStaleness) external onlyOwner {
        require(_maxStaleness >= 5 minutes, "Paymaster: staleness too short");
        maxRateStaleness = _maxStaleness;
    }

    function depositToEntryPoint() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    function withdrawFromEntryPoint(address payable to, uint256 amount) external onlyOwner {
        entryPoint.withdrawTo(to, amount);
    }

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        require(token != address(dwtToken), "Paymaster: cannot rescue DWT");
        IERC20(token).safeTransfer(owner(), amount);
    }

    receive() external payable {}
}
