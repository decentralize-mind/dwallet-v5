// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Mock LayerZero Endpoint for testing
contract MockLZEndpoint {
    mapping(uint16 => bytes) public trustedRemote;
    
    function setTrustedRemote(uint16 _chainId, bytes calldata _path) external {
        trustedRemote[_chainId] = _path;
    }
    
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        address _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable {}
    
    function receiveMessage(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external {}
}
