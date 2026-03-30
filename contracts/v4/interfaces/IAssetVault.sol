// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAssetVault
interface IAssetVault {
    enum AssetType { ERC20, ERC721, ERC1155 }

    struct Holding {
        AssetType assetType;
        address   token;
        uint256   tokenId;
        uint256   amount;
        address   owner;
        bool      locked;
        uint256   lockExpiry;
    }

    event Deposited(bytes32 indexed holdingId, address indexed wallet, address token, uint256 amount);
    event Withdrawn(bytes32 indexed holdingId, address indexed wallet, uint256 amount);
    event AssetLocked(bytes32 indexed holdingId, uint256 expiry);
    event AssetReleased(bytes32 indexed holdingId);

    function deposit(address token, uint256 amount) external returns (bytes32 holdingId);
    function depositNFT(address token, uint256 tokenId) external returns (bytes32 holdingId);
    function withdraw(bytes32 holdingId, uint256 amount) external;
    function lockAsset(bytes32 holdingId, uint256 expiry) external;
    function releaseAsset(bytes32 holdingId) external;
    function getHoldings(address wallet) external view returns (bytes32[] memory);
}
