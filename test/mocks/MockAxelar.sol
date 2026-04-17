// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Mock Axelar Gateway for testing
contract MockAxelarGateway {
    mapping(string => bytes) public contractAddresses;
    
    function setContractAddress(string calldata _contractId, bytes calldata _contractAddress) external {
        contractAddresses[_contractId] = _contractAddress;
    }
    
    function callContract(
        string calldata /*destinationChain*/,
        string calldata /*destinationContractAddress*/,
        bytes calldata /*payload*/
    ) external payable {}
    
    function callContractWithGas(
        string calldata /*destinationChain*/,
        string calldata /*destinationContractAddress*/,
        bytes calldata /*payload*/,
        uint256 /*gasAmount*/
    ) external payable {}
}

// Mock Axelar Gas Service for testing
contract MockAxelarGasService {
    function payNativeGasForContractCall(
        address /*sender*/,
        string calldata /*destinationChain*/,
        string calldata /*destinationContractAddress*/,
        bytes calldata /*payload*/,
        address /*refundAddress*/
    ) external payable {}
}
