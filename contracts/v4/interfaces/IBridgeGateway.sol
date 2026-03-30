// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IBridgeGateway
interface IBridgeGateway {
    struct BridgeMessage {
        bytes32 messageId;
        address sender;
        address recipient;
        uint256 amount;
        uint256 destChainId;
        uint256 nonce;
        uint256 timestamp;
    }

    event BridgeOut(
        bytes32 indexed messageId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 destChainId
    );
    event BridgeIn(
        bytes32 indexed messageId,
        address indexed recipient,
        uint256 amount,
        uint256 srcChainId
    );
    event RelayerAdded(address indexed relayer);
    event RelayerRemoved(address indexed relayer);

    function bridgeOut(address recipient, uint256 amount, uint256 destChainId) external payable;
    function bridgeIn(BridgeMessage calldata message, bytes[] calldata relayerSigs) external;
    function addRelayer(address relayer) external;
    function removeRelayer(address relayer) external;
    function getLockedAmount() external view returns (uint256);
    function isMessageProcessed(bytes32 messageId) external view returns (bool);
}
