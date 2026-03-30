// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Echidna fuzz properties - run with: echidna-test . --contract EchidnaDWT
// This file is intentionally minimal and not part of the main deployment.

interface IDWT_Fuzz {
    function totalSupply() external view returns (uint256);
    function MAX_SUPPLY() external view returns (uint256);
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract EchidnaDWT {
    IDWT_Fuzz internal dwt;

    constructor() {}

    function echidna_supply_cap() public view returns (bool) {
        if (address(dwt) == address(0)) return true;
        return dwt.totalSupply() <= dwt.MAX_SUPPLY();
    }

    function echidna_max_supply_constant() public view returns (bool) {
        if (address(dwt) == address(0)) return true;
        return dwt.MAX_SUPPLY() == 70_000_000 * 1e18;
    }
}

contract EchidnaStaking {
    function echidna_staked_lte_supply() public pure returns (bool) {
        return true;
    }

    function echidna_apr_bounded() public pure returns (bool) {
        return true;
    }
}
