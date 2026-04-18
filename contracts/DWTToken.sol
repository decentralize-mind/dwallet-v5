// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DWTToken - Clean Simple Version
 * @notice Simple ERC20 token for dWallet
 * @dev Removed complex extensions (Votes, Permit) to avoid deployment issues
 */
contract DWTToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 123_000_000 * 1e18; // 123 million DWT

    constructor(address initialOwner) 
        ERC20("dWallet Token", "DWT")
        Ownable(initialOwner) 
    {
        require(initialOwner != address(0), "DWT: zero address owner");
    }

    /**
     * @notice Mint tokens (owner only)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "DWT: max supply exceeded");
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens (any holder)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
