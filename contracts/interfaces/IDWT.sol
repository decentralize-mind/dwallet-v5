// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IDWT
/// @notice Interface for the dWallet native DWT token
interface IDWT is IERC20 {
    event ProtocolFeeBurned(uint256 amount);
    event SnapshotTaken(uint256 id);

    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function burnProtocolFee(uint256 amount) external;
    function snapshot() external returns (uint256 id);
    function permit(
        address owner, address spender, uint256 value,
        uint256 deadline, uint8 v, bytes32 r, bytes32 s
    ) external;
    function delegate(address delegatee) external;
    function getVotes(address account) external view returns (uint256);
    function getPastVotes(address account, uint256 blockNumber) external view returns (uint256);
    function MAX_SUPPLY() external view returns (uint256);
}
