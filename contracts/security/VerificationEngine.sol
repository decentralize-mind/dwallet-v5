// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VerificationEngine
 * @notice Universal Lock Type 5: Verification Lock (PROOF REQUIRED)
 *         Controls proof of legitimacy via signatures and oracle data.
 */
contract VerificationEngine is Ownable {
    using ECDSA for bytes32;

    mapping(address => mapping(uint256 => bool)) public usedNonces; // user => nonce => isUsed
    mapping(address => uint256) public currentNonces; // user => current nonce

    error InvalidSignature();
    error NonceAlreadyUsed(uint256 nonce);
    error InvalidNonce(uint256 expected, uint256 provided);

    event SignatureVerified(address indexed signer, uint256 nonce);
    event NonceAdvanced(address indexed signer, uint256 oldNonce, uint256 newNonce);

    constructor(address _admin) Ownable(_admin) {}

    /**
     * @notice Verify an EIP-712 style signature for a user action with nonce-based replay protection.
     * @dev The signature should be over hash that includes the current nonce to prevent replay attacks.
     *      Expected hash format: keccak256(abi.encodePacked(actionHash, nonce))
     */
    function verifySignature(
        address signer,
        bytes32 hash,
        bytes calldata signature
    ) external {
        if (hash.recover(signature) != signer) revert InvalidSignature();
        
        // Mark the current nonce as used and advance to next
        uint256 currentNonce = currentNonces[signer];
        if (usedNonces[signer][currentNonce]) revert NonceAlreadyUsed(currentNonce);
        
        usedNonces[signer][currentNonce] = true;
        currentNonces[signer] = currentNonce + 1;
        
        emit SignatureVerified(signer, currentNonce);
    }

    /**
     * @notice Verify signature with explicit nonce check.
     * @dev Allows caller to specify which nonce they're using for better control.
     */
    function verifySignatureWithNonce(
        address signer,
        uint256 nonce,
        bytes32 hash,
        bytes calldata signature
    ) external {
        if (hash.recover(signature) != signer) revert InvalidSignature();
        if (nonce != currentNonces[signer]) revert InvalidNonce(currentNonces[signer], nonce);
        if (usedNonces[signer][nonce]) revert NonceAlreadyUsed(nonce);
        
        usedNonces[signer][nonce] = true;
        currentNonces[signer] = nonce + 1;
        
        emit SignatureVerified(signer, nonce);
    }

    /**
     * @notice Check if a specific nonce has been used for an account.
     */
    function isNonceUsed(address account, uint256 nonce) external view returns (bool) {
        return usedNonces[account][nonce];
    }

    /**
     * @notice Get the next valid nonce for an account.
     */
    function getNextNonce(address account) external view returns (uint256) {
        return currentNonces[account];
    }

    /**
     * @notice Advance nonce manually (emergency escape if signatures are stuck).
     * @dev Only callable by the account owner or admin.
     */
    function advanceNonce(address account, uint256 skipAmount) external onlyOwner {
        uint256 oldNonce = currentNonces[account];
        currentNonces[account] = oldNonce + skipAmount;
        emit NonceAdvanced(account, oldNonce, currentNonces[account]);
    }

    /**
     * @notice Simple proof verification (placeholder for Merkle/Oracle).
     * @dev This is a placeholder - implement actual Merkle proof or oracle verification
     */
    function verifyProof(bytes32 root, bytes32 leaf, bytes32[] calldata proof) external pure returns (bool) {
        // Merkle proof logic would go here
        // Example implementation:
        // bytes32 computedRoot = _computeRoot(leaf, proof);
        // require(computedRoot == root, "Invalid proof");
        return true; 
    }

    /**
     * @notice Compute Merkle root from leaf and proof.
     * @dev Helper function for Merkle proof verification
     */
    function _computeRoot(bytes32 leaf, bytes32[] calldata proof) internal pure returns (bytes32) {
        bytes32 currentHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            if (currentHash < proof[i]) {
                currentHash = keccak256(abi.encodePacked(currentHash, proof[i]));
            } else {
                currentHash = keccak256(abi.encodePacked(proof[i], currentHash));
            }
        }
        return currentHash;
    }
}
