// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  ILayerZeroEndpoint
 * @notice Minimal interface for the LayerZero v1 endpoint.
 *         Full ABI: https://layerzero.gitbook.io/docs/evm-guides/master/how-to-use-lz
 */
interface ILayerZeroEndpoint {
    /**
     * @notice Send a cross-chain message.
     * @param _dstChainId       LZ chain id of the destination
     * @param _destination      ABI-packed (remoteAddress, localAddress)
     * @param _payload          Arbitrary bytes payload
     * @param _refundAddress    Excess fee refund address
     * @param _zroPaymentAddress ZRO payment address (address(0) = pay in native)
     * @param _adapterParams    Adapter-specific gas / airdrop config
     */
    function send(
        uint16          _dstChainId,
        bytes  calldata _destination,
        bytes  calldata _payload,
        address payable _refundAddress,
        address         _zroPaymentAddress,
        bytes  calldata _adapterParams
    ) external payable;

    /**
     * @notice Estimate the native fee for a send() call.
     */
    function estimateFees(
        uint16         _dstChainId,
        address        _userApplication,
        bytes calldata _payload,
        bool           _payInZRO,
        bytes calldata _adapterParam
    ) external view returns (uint256 nativeFee, uint256 zroFee);

    /// @notice Returns the inbound nonce for a given source chain + source address.
    function getInboundNonce(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (uint64);

    /// @notice Returns the outbound nonce for a given destination chain + address.
    function getOutboundNonce(uint16 _dstChainId, address _srcAddress) external view returns (uint64);

    /// @notice Returns the LZ chain id of the current chain.
    function getChainId() external view returns (uint16);
}
