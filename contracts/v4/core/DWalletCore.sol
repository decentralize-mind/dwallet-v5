// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../interfaces/IDWalletCore.sol";

/// @title DWalletCore
/// @notice Central registry and executor for dWallet smart contract wallets.
///         Uses EIP-1167 minimal proxies for gas-efficient wallet deployment.
///         Upgradeable via UUPS — upgrade requires DAO governance vote.
/// @dev    All signatures are EIP-712 typed-data for replay protection.
contract DWalletCore is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    IDWalletCore
{
    using ECDSA for bytes32;

    // ─── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant RELAYER_ROLE  = keccak256("RELAYER_ROLE");

    // ─── EIP-712 ──────────────────────────────────────────────────────────────
    bytes32 public constant TX_TYPEHASH = keccak256(
        "WalletTransaction(address to,uint256 value,bytes data,uint256 nonce,uint256 chainId)"
    );

    // ─── Storage ──────────────────────────────────────────────────────────────
    address public walletImplementation;

    /// @dev wallet address → config
    mapping(address => WalletConfig) private _wallets;

    /// @dev wallet → module → enabled
    mapping(address => mapping(address => bool)) private _modules;

    /// @dev wallet → tx hash → executed
    mapping(address => mapping(bytes32 => bool)) private _executed;

    // ─── Domain separator (for EIP-712) ───────────────────────────────────────
    bytes32 private _domainSeparator;

    // ─── Initializer ──────────────────────────────────────────────────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin, address _walletImpl) external initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GUARDIAN_ROLE, admin);

        walletImplementation = _walletImpl;

        _domainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("dWallet"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));
    }

    // ─── Wallet creation ──────────────────────────────────────────────────────

    /// @notice Deploy a new dWallet (EIP-1167 minimal proxy) and register it.
    /// @param owners     Array of owner addresses (min 1, max 10)
    /// @param threshold  Number of signatures required (1 ≤ threshold ≤ owners.length)
    /// @param initData   Optional calldata executed on the new wallet after creation
    function createWallet(
        address[] calldata owners,
        uint256 threshold,
        bytes calldata initData
    ) external override whenNotPaused returns (address wallet) {
        require(owners.length > 0 && owners.length <= 10, "DWalletCore: invalid owners");
        require(threshold > 0 && threshold <= owners.length, "DWalletCore: invalid threshold");

        // Validate no duplicate / zero owners
        for (uint256 i = 0; i < owners.length; i++) {
            require(owners[i] != address(0), "DWalletCore: zero owner");
            for (uint256 j = i + 1; j < owners.length; j++) {
                require(owners[i] != owners[j], "DWalletCore: duplicate owner");
            }
        }

        // Deploy minimal proxy deterministically using owner set as salt
        bytes32 salt = keccak256(abi.encode(owners, threshold, block.timestamp, msg.sender));
        wallet = Clones.cloneDeterministic(walletImplementation, salt);

        _wallets[wallet] = WalletConfig({
            owners:    owners,
            threshold: threshold,
            nonce:     0,
            exists:    true
        });

        // Run optional initialisation call
        if (initData.length > 0) {
            (bool ok,) = wallet.call(initData);
            require(ok, "DWalletCore: init failed");
        }

        emit WalletCreated(wallet, owners, threshold);
    }

    // ─── Transaction execution ────────────────────────────────────────────────

    /// @notice Execute a transaction from a registered dWallet after verifying signatures.
    /// @param to         Destination address
    /// @param value      ETH value to send
    /// @param data       Calldata
    /// @param signatures ABI-encoded concatenated EIP-712 signatures (sorted by signer)
    function executeTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata signatures
    ) external override whenNotPaused nonReentrant returns (bool success) {
        WalletConfig storage cfg = _wallets[msg.sender];
        require(cfg.exists, "DWalletCore: not a wallet");

        bytes32 txHash = _txHash(to, value, data, cfg.nonce);
        require(!_executed[msg.sender][txHash], "DWalletCore: already executed");

        _verifySignatures(txHash, signatures, cfg.owners, cfg.threshold);

        cfg.nonce++;
        _executed[msg.sender][txHash] = true;

        (success,) = to.call{value: value}(data);

        if (success) {
            emit ExecutionSuccess(txHash, value);
        } else {
            emit ExecutionFailure(txHash);
        }
    }

    // ─── Module management ────────────────────────────────────────────────────

    function addModule(address module) external override {
        require(_wallets[msg.sender].exists, "DWalletCore: not a wallet");
        require(module != address(0), "DWalletCore: zero module");
        _modules[msg.sender][module] = true;
        emit ModuleEnabled(msg.sender, module);
    }

    function removeModule(address module) external override {
        require(_wallets[msg.sender].exists, "DWalletCore: not a wallet");
        _modules[msg.sender][module] = false;
        emit ModuleDisabled(msg.sender, module);
    }

    // ─── Emergency ────────────────────────────────────────────────────────────

    function pause()   external onlyRole(GUARDIAN_ROLE) { _pause(); }
    function unpause() external onlyRole(GUARDIAN_ROLE) { _unpause(); }

    // ─── View ─────────────────────────────────────────────────────────────────

    function isModuleEnabled(address wallet, address module) external view override returns (bool) {
        return _modules[wallet][module];
    }

    function getOwners(address wallet) external view override returns (address[] memory) {
        return _wallets[wallet].owners;
    }

    function getThreshold(address wallet) external view override returns (uint256) {
        return _wallets[wallet].threshold;
    }

    function getNonce(address wallet) external view override returns (uint256) {
        return _wallets[wallet].nonce;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _txHash(
        address to, uint256 value, bytes calldata data, uint256 nonce
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            "\x19\x01",
            _domainSeparator,
            keccak256(abi.encode(TX_TYPEHASH, to, value, keccak256(data), nonce, block.chainid))
        ));
    }

    function _verifySignatures(
        bytes32 txHash,
        bytes calldata signatures,
        address[] storage owners,
        uint256 threshold
    ) internal view {
        require(signatures.length == threshold * 65, "DWalletCore: sig length mismatch");

        address lastSigner = address(0);
        for (uint256 i = 0; i < threshold; i++) {
            bytes memory sig = signatures[i * 65:(i + 1) * 65];
            address signer = txHash.recover(sig);
            require(signer > lastSigner, "DWalletCore: sigs must be sorted");
            require(_isOwner(signer, owners), "DWalletCore: invalid signer");
            lastSigner = signer;
        }
    }

    function _isOwner(address addr, address[] storage owners) internal view returns (bool) {
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == addr) return true;
        }
        return false;
    }

    // ─── UUPS ─────────────────────────────────────────────────────────────────

    /// @dev Only DAO (DEFAULT_ADMIN_ROLE held by Timelock) can upgrade.
    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
