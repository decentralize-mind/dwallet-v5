// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAccessController {
    function verifyAccess(address account, bytes32 role) external view;
    function verifyWhitelist(address account) external view;
    function verifyContractOnly(address account) external view;
}

interface ITimeLockController {
    function verifyTimeLock(address account, bytes32 actionId) external view;
    function startCooldown(address account, bytes32 actionId) external;
}

interface IStateController {
    function verifyState(bytes32 layerId) external view;
    function setLayerState(bytes32 layerId, bool active) external;
}

interface IRateLimiter {
    function verifyAndUpdateRate(address account, bytes32 actionId, uint256 amount) external;
}

interface IVerificationEngine {
    function verifySignature(address account, bytes32 hash, bytes calldata signature) external view;
}

interface IInvariantChecker {
    function checkVault(uint256 totalAssets, uint256 totalShares) external pure;
    function checkToken(uint256 supply, uint256 minted, uint256 burned) external pure;
    function checkSolvency(uint256 assets, uint256 liabilities) external pure;
}

interface ILockEngine {
    function checkAllLocks(address account, bytes32 role, bytes32 actionId, bytes32 layerId, uint256 amount) external;
    function postExecute(address account, bytes32 actionId) external;
    function access() external view returns (IAccessController);
    function time() external view returns (ITimeLockController);
    function state() external view returns (IStateController);
    function rateLimit() external view returns (IRateLimiter);
    function verification() external view returns (IVerificationEngine);
}


interface ILayer7Security {
    function paused() external view returns (bool);
    function circuitBroken() external view returns (bool);
    function isSigner(address account) external view returns (bool);
    function allowlisted(address account) external view returns (bool);
    function kycLevel(address account) external view returns (uint256);
    function requiredKYCLevel() external view returns (uint256);
}

