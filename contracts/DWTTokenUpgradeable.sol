// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title DWTToken - Upgradeable Version
 * @notice Simple ERC20 token for dWallet with proxy support
 * @dev Uses OpenZeppelin upgradeable contracts for future upgrades
 */
contract DWTTokenUpgradeable is ERC20Upgradeable, OwnableUpgradeable {
    uint256 public constant MAX_SUPPLY = 123_000_000 * 1e18; // 123 million DWT

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the contract (replaces constructor)
     * @param initialOwner Address of the contract owner
     */
    function initialize(address initialOwner) external initializer {
        require(initialOwner != address(0), "DWT: zero address owner");
        
        __ERC20_init("dWallet Token", "DWT");
        __Ownable_init(initialOwner);
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
