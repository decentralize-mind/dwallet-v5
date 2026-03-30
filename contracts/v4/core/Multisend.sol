// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Multisend
/// @notice Batch ETH sends, ERC-20 transfers, and arbitrary contract calls
///         in a single transaction. Useful for:
///         - Distributing DWT to many recipients in one TX (team payments, grants)
///         - Executing multiple governance actions atomically
///         - Batch airdrop fallback (when Merkle proof claiming isn't available)
///
/// @dev    This contract is stateless — no upgrades needed. Deploy once.
///         All functions are payable to support ETH batch sends.
contract Multisend {
    using SafeERC20 for IERC20;

    event BatchEthSent(address indexed sender, uint256 totalAmount, uint256 recipientCount);
    event BatchTokenSent(address indexed token, address indexed sender, uint256 totalAmount, uint256 recipientCount);
    event BatchCallExecuted(uint256 callCount, uint256 successCount);

    // ─── Batch ETH send ───────────────────────────────────────────────────────

    /// @notice Send ETH to multiple addresses in one transaction.
    /// @param recipients  Array of recipient addresses
    /// @param amounts     Array of ETH amounts (must match recipients length)
    function batchSendEth(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable {
        require(recipients.length == amounts.length, "Multisend: length mismatch");
        require(recipients.length > 0,               "Multisend: empty list");
        require(recipients.length <= 500,            "Multisend: max 500 recipients");

        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        require(msg.value >= total, "Multisend: insufficient ETH");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Multisend: zero recipient");
            (bool ok,) = recipients[i].call{value: amounts[i]}("");
            require(ok, "Multisend: ETH transfer failed");
        }

        // Refund excess ETH
        uint256 excess = msg.value - total;
        if (excess > 0) {
            (bool refunded,) = msg.sender.call{value: excess}("");
            require(refunded, "Multisend: refund failed");
        }

        emit BatchEthSent(msg.sender, total, recipients.length);
    }

    // ─── Batch ERC-20 send ────────────────────────────────────────────────────

    /// @notice Transfer ERC-20 tokens to multiple addresses in one transaction.
    ///         Caller must have approved this contract for the total amount first.
    /// @param token       ERC-20 token address (use DWT address for DWT distributions)
    /// @param recipients  Array of recipient addresses
    /// @param amounts     Array of token amounts (18-decimal for DWT)
    function batchSendToken(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        require(recipients.length == amounts.length, "Multisend: length mismatch");
        require(recipients.length > 0,               "Multisend: empty list");
        require(recipients.length <= 500,            "Multisend: max 500 recipients");
        require(token != address(0),                 "Multisend: zero token");

        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) total += amounts[i];

        // Pull total from caller in one transfer
        IERC20(token).safeTransferFrom(msg.sender, address(this), total);

        // Distribute
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Multisend: zero recipient");
            IERC20(token).safeTransfer(recipients[i], amounts[i]);
        }

        emit BatchTokenSent(token, msg.sender, total, recipients.length);
    }

    // ─── Equal-split batch send ───────────────────────────────────────────────

    /// @notice Send equal amounts of a token to all recipients.
    ///         Useful for equal grant distributions.
    function batchSendEqual(
        address token,
        address[] calldata recipients,
        uint256 amountEach
    ) external {
        require(recipients.length > 0 && recipients.length <= 500, "Multisend: bad count");
        uint256 total = amountEach * recipients.length;
        IERC20(token).safeTransferFrom(msg.sender, address(this), total);
        for (uint256 i = 0; i < recipients.length; i++) {
            IERC20(token).safeTransfer(recipients[i], amountEach);
        }
        emit BatchTokenSent(token, msg.sender, total, recipients.length);
    }

    // ─── Batch arbitrary calls ────────────────────────────────────────────────

    struct Call {
        address target;
        uint256 value;
        bytes   data;
        bool    requireSuccess;
    }

    /// @notice Execute multiple contract calls atomically.
    ///         Used by governance to batch-execute approved proposals.
    /// @param calls        Array of Call structs
    /// @return results     Return data from each call
    function batchCall(Call[] calldata calls)
        external payable
        returns (bytes[] memory results)
    {
        require(calls.length > 0 && calls.length <= 100, "Multisend: bad call count");
        results = new bytes[](calls.length);
        uint256 successCount = 0;

        for (uint256 i = 0; i < calls.length; i++) {
            (bool ok, bytes memory ret) = calls[i].target.call{value: calls[i].value}(calls[i].data);
            if (calls[i].requireSuccess) {
                require(ok, string(abi.encodePacked("Multisend: call ", _toString(i), " failed")));
            }
            if (ok) successCount++;
            results[i] = ret;
        }

        emit BatchCallExecuted(calls.length, successCount);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /// @notice Preview total amount needed before calling batchSendToken.
    function totalAmount(uint256[] calldata amounts) external pure returns (uint256 total) {
        for (uint256 i = 0; i < amounts.length; i++) total += amounts[i];
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 tmp = v;
        uint256 digits;
        while (tmp != 0) { digits++; tmp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (v != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + v % 10));
            v /= 10;
        }
        return string(buffer);
    }

    receive() external payable {}
}
