// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title DWTToken - Simplified Version for Quick Deployment
 * @notice Core DWT ERC20 token without complex security layers
 * @dev This is a minimal version for testnet deployment
 */
contract DWTTokenSimple is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, Ownable {
    uint256 public constant MAX_SUPPLY = 123_000_000 * 1e18; // 123 million DWT
    
    // Fee tiers
    uint256 public tier1Threshold = 1000 * 1e18;
    uint256 public tier2Threshold = 10000 * 1e18;
    uint256 public tier3Threshold = 100000 * 1e18;
    
    uint16 public tier0FeeBps = 30;
    uint16 public tier1FeeBps = 20;
    uint16 public tier2FeeBps = 15;
    uint16 public tier3FeeBps = 5;

    constructor(address initialOwner)
        ERC20("dWallet Token", "DWT")
        ERC20Permit("dWallet Token")
        Ownable(initialOwner)
    {
        require(initialOwner != address(0), "DWT: zero owner");
    }

    /**
     * @notice Mint tokens (owner only)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "DWT: max supply exceeded");
        _mint(to, amount);
    }

    /**
     * @notice Get fee tier for an account
     */
    function feeTierOf(address account) external view returns (uint8) {
        uint256 bal = getVotes(account);
        if (bal >= tier3Threshold) return 3;
        if (bal >= tier2Threshold) return 2;
        if (bal >= tier1Threshold) return 1;
        return 0;
    }

    /**
     * @notice Get fee rate for an account
     */
    function feeRateOf(address account) external view returns (uint16) {
        uint256 bal = getVotes(account);
        if (bal >= tier3Threshold) return tier3FeeBps;
        if (bal >= tier2Threshold) return tier2FeeBps;
        if (bal >= tier1Threshold) return tier1FeeBps;
        return tier0FeeBps;
    }

    // Required overrides
    function _update(address from, address to, uint256 value)
        internal override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public view override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
