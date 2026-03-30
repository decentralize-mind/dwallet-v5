// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title InvariantChecker
 * @notice Universal Lock Type 3: State Lock (Mathematical Correctness)
 *         Ensures that even if logic bugs occur, the protocol's fundamental
 *         mathematical invariants (Solvency, TVL, Supply) are never violated.
 */
contract InvariantChecker {
    error VaultBroken(uint256 assets, uint256 shares);
    error SupplyMismatch(uint256 supply, uint256 expected);
    error Insolvent(uint256 assets, uint256 liabilities);

    /**
     * @notice Ensure total assets in a vault cover total shares minted.
     */
    function checkVault(uint256 totalAssets, uint256 totalShares) external pure {
        if (totalAssets < totalShares) {
            revert VaultBroken(totalAssets, totalShares);
        }
    }

    /**
     * @notice Ensure token supply matches minted minus burned.
     */
    function checkToken(uint256 supply, uint256 minted, uint256 burned) external pure {
        if (supply != minted - burned) {
            revert SupplyMismatch(supply, minted - burned);
        }
    }

    /**
     * @notice Ensure assets in the protocol always cover liabilities.
     */
    function checkSolvency(uint256 assets, uint256 liabilities) external pure {
        if (assets < liabilities) {
            revert Insolvent(assets, liabilities);
        }
    }
}
