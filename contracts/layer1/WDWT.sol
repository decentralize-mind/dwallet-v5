// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title WDWT (Wrapped dWallet Token)
 * @notice Standard ERC20 wrapper for the DWT governance token.
 *         Allows protocols that cannot handle fee-on-transfer or complex tokens
 *         to interact with the dWallet ecosystem.
 */
contract WDWT is ERC20 {
    using SafeERC20 for IERC20;

    IERC20 public immutable dwt;

    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    constructor(address _dwt) ERC20("Wrapped dWallet Token", "wDWT") {
        require(_dwt != address(0), "WDWT: zero dwt address");
        dwt = IERC20(_dwt);
    }

    /**
     * @notice Wrap DWT into wDWT (1:1 ratio)
     */
    function deposit(uint256 amount) external {
        dwt.safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice Unwrap wDWT into DWT (1:1 ratio)
     */
    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        dwt.safeTransfer(msg.sender, amount);
        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @notice Helper to wrap native-like balance (if any) - standard WETH interface
     */
    receive() external payable {
        revert("WDWT: use deposit(amount)");
    }
}
