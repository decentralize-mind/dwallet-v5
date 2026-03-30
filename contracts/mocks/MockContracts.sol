// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockERC20 {
    string  public name;
    string  public symbol;
    uint8   public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name; symbol = _symbol; decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply   += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "MockERC20: insufficient allowance");
        allowance[from][msg.sender] -= amount;
        return _transfer(from, to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(balanceOf[from] >= amount, "MockERC20: insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

contract MockUniswapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24  fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactInputParams {
        bytes   path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external payable returns (uint256 amountOut)
    {
        MockERC20(params.tokenIn).transferFrom(
            msg.sender, address(this), params.amountIn
        );
        amountOut = (params.amountIn * 98) / 100;
        require(amountOut >= params.amountOutMinimum, "MockRouter: slippage exceeded");
        MockERC20(params.tokenOut).mint(params.recipient, amountOut);
    }

    function exactInput(ExactInputParams calldata params)
        external payable returns (uint256 amountOut)
    {
        // Decode tokenIn from first 20 bytes of path using slice
        require(params.path.length >= 20, "MockRouter: path too short");
        address tokenIn = address(bytes20(params.path[:20]));
        MockERC20(tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        amountOut = (params.amountIn * 97) / 100;
        require(amountOut >= params.amountOutMinimum, "MockRouter: slippage exceeded");
    }
}

contract MockQuoterV2 {
    struct QuoteExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint24  fee;
        uint160 sqrtPriceLimitX96;
    }

    function quoteExactInputSingle(QuoteExactInputSingleParams memory params)
        external pure
        returns (uint256 amountOut, uint160 sqrtPriceX96After,
                 uint32 initializedTicksCrossed, uint256 gasEstimate)
    {
        amountOut               = (params.amountIn * 98) / 100;
        sqrtPriceX96After       = 0;
        initializedTicksCrossed = 1;
        gasEstimate             = 150000;
    }
}

contract MockLayer7Security {
    bool public paused = false;
    bool public circuitBroken = false;
    function isSigner(address account) external pure returns (bool) { return true; }
    function allowlisted(address account) external pure returns (bool) { return true; }
    function kycLevel(address account) external pure returns (uint256) { return 1; }
    function requiredKYCLevel() external pure returns (uint256) { return 0; }
}
