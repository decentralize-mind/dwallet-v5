// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FlashLoanReceiver
 * @notice Simple flash loan receiver for UI integration
 * 
 * This contract allows users to execute flash loans through the UI.
 * Users send DWT tokens here for the fee, and this contract handles the callback.
 */
contract FlashLoanReceiver {
    using SafeERC20 for IERC20;
    
    address public flashLoanContract;
    address public owner;
    
    // ERC-3156 callback return value
    bytes32 private constant CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");
    
    event FlashLoanReceived(
        address token,
        uint256 amount,
        uint256 fee,
        address initiator
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyFlashLoanContract() {
        require(msg.sender == flashLoanContract, "Not flash loan contract");
        _;
    }
    
    constructor(address _flashLoanContract) {
        require(_flashLoanContract != address(0), "Invalid address");
        flashLoanContract = _flashLoanContract;
        owner = msg.sender;
    }
    
    /**
     * @notice Execute flash loan through this receiver
     * @param token Token to borrow
     * @param amount Amount to borrow
     * @param data Additional data
     */
    function executeFlashLoan(
        address token,
        uint256 amount,
        bytes calldata data
    ) external {
        // Calculate fee (0.09%)
        uint256 fee = (amount * 9) / 10000;
        uint256 totalRepayment = amount + fee;
        
        // Approve flash loan contract to pull repayment
        IERC20(token).approve(flashLoanContract, 0);
        IERC20(token).approve(flashLoanContract, totalRepayment);
        
        // Call flash loan
        (bool success, ) = flashLoanContract.call(
            abi.encodeWithSignature(
                "flashLoan(address,uint256,bytes)",
                token,
                amount,
                data
            )
        );
        
        require(success, "Flash loan failed");
    }
    
    /**
     * @notice ERC-3156 flash loan callback
     */
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external onlyFlashLoanContract returns (bytes32) {
        // Transfer fee from initiator to this contract
        IERC20(token).transferFrom(initiator, address(this), fee);
        
        // Repay the loan + fee
        IERC20(token).transfer(flashLoanContract, amount + fee);
        
        emit FlashLoanReceived(token, amount, fee, initiator);
        
        return CALLBACK_SUCCESS;
    }
    
    /**
     * @notice Withdraw collected fees (owner only)
     */
    function withdrawFees(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    /**
     * @notice Update flash loan contract address
     */
    function setFlashLoanContract(address _flashLoanContract) external onlyOwner {
        require(_flashLoanContract != address(0), "Invalid address");
        flashLoanContract = _flashLoanContract;
    }
}
