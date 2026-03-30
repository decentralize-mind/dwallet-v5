// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDWalletCore
/// @notice Interface for the dWallet core account registry
interface IDWalletCore {
    struct WalletConfig {
        address[] owners;
        uint256   threshold;
        uint256   nonce;
        bool      exists;
    }

    event WalletCreated(address indexed wallet, address[] owners, uint256 threshold);
    event ExecutionSuccess(bytes32 indexed txHash, uint256 payment);
    event ExecutionFailure(bytes32 indexed txHash);
    event ModuleEnabled(address indexed wallet, address indexed module);
    event ModuleDisabled(address indexed wallet, address indexed module);

    function createWallet(
        address[] calldata owners,
        uint256 threshold,
        bytes calldata initData
    ) external returns (address wallet);

    function executeTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata signatures
    ) external returns (bool success);

    function addModule(address module) external;
    function removeModule(address module) external;
    function isModuleEnabled(address wallet, address module) external view returns (bool);
    function getOwners(address wallet) external view returns (address[] memory);
    function getThreshold(address wallet) external view returns (uint256);
    function getNonce(address wallet) external view returns (uint256);
}
