// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint8 decimals) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**decimals);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockFlashLoanReceiver {
    address public flashLoan;
    address public token;
    
    constructor(address _flashLoan, address _token) {
        flashLoan = _flashLoan;
        token = _token;
    }
    
    function executeFlashLoan(uint256 amount) external {
        (bool success,) = flashLoan.call(
            abi.encodeWithSignature(
                "flashLoan(address,uint256,bytes)",
                token,
                amount,
                ""
            )
        );
        require(success, "Flash loan failed");
    }
    
    function onFlashLoan(
        address initiator,
        address _token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        // Repay loan + fee
        (bool success,) = _token.call(
            abi.encodeWithSignature("transfer(address,uint256)", msg.sender, amount + fee)
        );
        require(success, "Repayment failed");
        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}
