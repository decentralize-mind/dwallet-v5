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

contract MockFeeRouter {
    uint256 public feeBps = 30; // 0.30%
    mapping(address => uint256) public totalFeesCollected;
    
    function setFeeBps(uint256 _feeBps) external {
        feeBps = _feeBps;
    }
    
    function collectFee(address token, address payer, uint256 amount) external returns (uint256) {
        uint256 fee = (amount * feeBps) / 10000;
        totalFeesCollected[token] += fee;
        MockERC20(token).transferFrom(payer, address(this), fee);
        return fee;
    }
    
    function calculateFee(address user, uint256 amount) external view returns (uint256, uint256) {
        uint256 fee = (amount * feeBps) / 10000;
        return (fee, 0);
    }
}

contract MockPriceOracle {
    mapping(bytes32 => uint256) public prices;
    mapping(bytes32 => bool) public priceValid;
    
    function setPrice(address token0, address token1, uint256 price) external {
        bytes32 key = keccak256(abi.encodePacked(token0, token1));
        prices[key] = price;
        priceValid[key] = true;
    }
    
    function getPrice(address token0, address token1) external view returns (uint256, bool) {
        bytes32 key = keccak256(abi.encodePacked(token0, token1));
        return (prices[key], priceValid[key]);
    }
}

contract MockLiquidityPool {
    mapping(bytes32 => uint256) public reserves;
    
    function addLiquidity(address tokenA, address tokenB, uint256 reserveA, uint256 reserveB) external {
        bytes32 key = keccak256(abi.encodePacked(tokenA, tokenB));
        reserves[key] = (reserveA << 128) | reserveB;
    }
    
    function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB) {
        bytes32 key = keccak256(abi.encodePacked(tokenA, tokenB));
        uint256 data = reserves[key];
        reserveA = data >> 128;
        reserveB = data & ((1 << 128) - 1);
    }
    
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to
    ) external returns (uint256 amountOut) {
        // Simple AMM: amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
        bytes32 key = keccak256(abi.encodePacked(tokenIn, tokenOut));
        uint256 data = reserves[key];
        uint256 reserveIn = data >> 128;
        uint256 reserveOut = data & ((1 << 128) - 1);
        
        require(reserveIn > 0 && reserveOut > 0, "MockPool: no liquidity");
        
        // Calculate output using constant product formula
        amountOut = (amountIn * reserveOut) / (reserveIn + amountIn);
        require(amountOut >= amountOutMin, "MockPool: slippage exceeded");
        
        // Transfer tokens
        MockERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        MockERC20(tokenOut).transfer(to, amountOut);
        
        // Update reserves
        reserves[key] = ((reserveIn + amountIn) << 128) | (reserveOut - amountOut);
    }
}
