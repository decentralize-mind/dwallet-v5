// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IDWT.sol";

interface IEntryPoint {
    function depositTo(address account) external payable;
    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external;
    function balanceOf(address account) external view returns (uint256);
    function addStake(uint32 unstakeDelaySec) external payable;
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

/// @title DWTPaymaster
/// @notice ERC-4337 Paymaster that sponsors gas for users who pay in DWT.
contract DWTPaymaster is
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IDWT;

    bytes32 public constant RATE_SETTER_ROLE = keccak256("RATE_SETTER_ROLE");
    bytes32 public constant GUARDIAN_ROLE    = keccak256("GUARDIAN_ROLE");

    IDWT        public dwt;
    IEntryPoint public entryPoint;
    address     public feeManager;
    uint256     public dwtPerEth;
    uint256     public markupBPS;
    bool        public active;

    mapping(bytes32 => uint256) private _pendingDWT;

    event DWTCollected(address indexed user, uint256 dwtAmount, uint256 ethCost);
    event RateUpdated(uint256 newDwtPerEth);
    event Deposited(uint256 ethAmount);
    event Withdrawn(address to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _dwt,
        address _entryPoint,
        address _feeManager,
        uint256 _dwtPerEth,
        address admin
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        dwt        = IDWT(_dwt);
        entryPoint = IEntryPoint(_entryPoint);
        feeManager = _feeManager;
        dwtPerEth  = _dwtPerEth;
        markupBPS  = 1000;
        active     = true;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RATE_SETTER_ROLE,   admin);
        _grantRole(GUARDIAN_ROLE,      admin);
    }

    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external returns (bytes memory context, uint256 validationData) {
        require(msg.sender == address(entryPoint), "Paymaster: not EntryPoint");
        require(active, "Paymaster: inactive");
        uint256 maxDWT = ethToDWT(maxCost) * (10000 + markupBPS) / 10000;
        require(dwt.allowance(userOp.sender, address(this)) >= maxDWT, "Paymaster: insufficient DWT allowance");
        require(dwt.balanceOf(userOp.sender) >= maxDWT, "Paymaster: insufficient DWT balance");
        _pendingDWT[userOpHash] = maxDWT;
        context = abi.encode(userOp.sender, maxDWT);
        validationData = 0;
    }

    function postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) external {
        require(msg.sender == address(entryPoint), "Paymaster: not EntryPoint");
        (address user, uint256 maxDWT) = abi.decode(context, (address, uint256));
        if (mode == PostOpMode.postOpReverted) return;
        uint256 actualDWT = ethToDWT(actualGasCost) * (10000 + markupBPS) / 10000;
        if (actualDWT > maxDWT) actualDWT = maxDWT;
        if (actualDWT > 0) {
            dwt.safeTransferFrom(user, feeManager, actualDWT);
            emit DWTCollected(user, actualDWT, actualGasCost);
        }
    }

    function setRate(uint256 newDwtPerEth) external onlyRole(RATE_SETTER_ROLE) {
        require(newDwtPerEth > 0, "Paymaster: zero rate");
        dwtPerEth = newDwtPerEth;
        emit RateUpdated(newDwtPerEth);
    }

    function setMarkup(uint256 bps) external onlyRole(RATE_SETTER_ROLE) {
        require(bps <= 3000, "Paymaster: markup too high");
        markupBPS = bps;
    }

    function deposit() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
        emit Deposited(msg.value);
    }

    function withdraw(address payable to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        entryPoint.withdrawTo(to, amount);
        emit Withdrawn(to, amount);
    }

    function addStake(uint32 unstakeDelay) external payable onlyRole(DEFAULT_ADMIN_ROLE) {
        entryPoint.addStake{value: msg.value}(unstakeDelay);
    }

    function setActive(bool _active) external onlyRole(GUARDIAN_ROLE) { active = _active; }

    function ethToDWT(uint256 ethAmount) public view returns (uint256) {
        return (ethAmount * dwtPerEth) / 1e18;
    }

    function estimateDWT(uint256 gasUnits, uint256 gasPrice) external view returns (uint256) {
        return ethToDWT(gasUnits * gasPrice) * (10000 + markupBPS) / 10000;
    }

    function getDeposit() external view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    receive() external payable {}
    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
