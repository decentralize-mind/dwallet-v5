// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  IAxelarGateway
 * @notice Minimal interface for the Axelar Gateway contract.
 *         Full ABI: https://docs.axelar.dev/dev/solidity-utilities
 */
interface IAxelarGateway {
    /**
     * @notice Send a cross-chain contract call.
     * @param destinationChain   Axelar chain name (e.g. "ethereum")
     * @param contractAddress    Address of the receiving contract (string)
     * @param payload            Arbitrary bytes payload
     */
    function callContract(
        string  calldata destinationChain,
        string  calldata contractAddress,
        bytes   calldata payload
    ) external;

    /**
     * @notice Validate that an incoming contract call is authentic.
     *         Must be called inside execute() before processing the payload.
     */
    function validateContractCall(
        bytes32 commandId,
        string  calldata sourceChain,
        string  calldata sourceAddress,
        bytes32 payloadHash
    ) external returns (bool);

    /**
     * @notice Send a cross-chain call with a token transfer.
     */
    function callContractWithToken(
        string  calldata destinationChain,
        string  calldata contractAddress,
        bytes   calldata payload,
        string  calldata symbol,
        uint256          amount
    ) external;

    /**
     * @notice Validate an incoming call that includes a token transfer.
     */
    function validateContractCallAndMint(
        bytes32 commandId,
        string  calldata sourceChain,
        string  calldata sourceAddress,
        bytes32 payloadHash,
        string  calldata symbol,
        uint256          amount
    ) external returns (bool);
}

/**
 * @title  IAxelarGasService
 * @notice Minimal interface for the Axelar Gas Service.
 *         Prepay gas on the source chain so Axelar relayers can execute on the destination.
 */
interface IAxelarGasService {
    /**
     * @notice Pay native gas for a contract call.
     * @param sender             Address of the calling contract
     * @param destinationChain   Axelar chain name
     * @param destinationAddress Receiving contract address (string)
     * @param payload            Same payload as callContract()
     * @param refundAddress      Address to receive excess gas refund
     */
    function payNativeGasForContractCall(
        address         sender,
        string  calldata destinationChain,
        string  calldata destinationAddress,
        bytes   calldata payload,
        address         refundAddress
    ) external payable;

    /**
     * @notice Pay native gas for a contract call with token.
     */
    function payNativeGasForContractCallWithToken(
        address         sender,
        string  calldata destinationChain,
        string  calldata destinationAddress,
        bytes   calldata payload,
        string  calldata symbol,
        uint256          amount,
        address         refundAddress
    ) external payable;

    /**
     * @notice Add additional native gas to an existing pending call.
     */
    function addNativeGas(
        bytes32 txHash,
        uint256 logIndex,
        address refundAddress
    ) external payable;
}
