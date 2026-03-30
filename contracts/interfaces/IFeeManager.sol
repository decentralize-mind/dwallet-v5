// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IFeeManager
interface IFeeManager {
    event FeeCollected(address indexed payer, uint256 amount);
    event FeeDistributed(uint256 burned, uint256 toStaking, uint256 toTreasury, uint256 toRelayers);
    event SplitUpdated(uint256 burn, uint256 staking, uint256 treasury, uint256 relayer);

    function collectFee(address payer, uint256 amount) external;
    function distribute() external;
    function updateSplit(uint256 burn, uint256 staking, uint256 treasury, uint256 relayer) external;
    function feeFor(uint256 txValue) external pure returns (uint256);

    function burnBPS()     external view returns (uint256);
    function stakingBPS()  external view returns (uint256);
    function treasuryBPS() external view returns (uint256);
    function relayerBPS()  external view returns (uint256);
    function totalFeesCollected() external view returns (uint256);
    function totalBurned()        external view returns (uint256);
}
