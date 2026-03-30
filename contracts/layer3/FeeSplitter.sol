// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../SecurityGated.sol";

/**
 * @title FeeSplitter
 * @notice Splits fees with pause gating via Layer 7.
 */
contract FeeSplitter is Ownable, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;

    struct Split {
        uint16 treasuryBps;
        uint16 rewardBps;
        uint16 buybackBps;
        bool   isCustom;
    }

    address public treasury;
    address public rewardDistributor;
    address public buybackAndBurn;
    address public guardian;

    Split public defaultSplit;
    mapping(address => Split) public tokenSplits;

    uint256 public constant BPS = 10_000;

    event FeeSplit(address indexed token, uint256 toTreasury, uint256 toRewards, uint256 toBuyback);
    event DefaultSplitUpdated(uint16 treasuryBps, uint16 rewardBps, uint16 buybackBps);
    event TokenSplitSet(address indexed token, uint16 treasuryBps, uint16 rewardBps, uint16 buybackBps);
    event AddressesUpdated();

    constructor(
        address _treasury,
        address _rewardDistributor,
        address _buybackAndBurn,
        uint16  _treasuryBps,
        uint16  _rewardBps,
        uint16  _buybackBps,
        address _securityController,
        address initialOwner
    ) Ownable(initialOwner) SecurityGated(_securityController) {
        require(_treasury          != address(0), "FeeSplitter: zero treasury");
        require(_rewardDistributor != address(0), "FeeSplitter: zero distributor");
        require(uint256(_treasuryBps) + _rewardBps + _buybackBps == BPS,
            "FeeSplitter: split must sum to 10000");

        treasury          = _treasury;
        rewardDistributor = _rewardDistributor;
        buybackAndBurn    = _buybackAndBurn;

        defaultSplit = Split(_treasuryBps, _rewardBps, _buybackBps, false);
    }

    function setGuardian(address _guardian) external onlyOwner { guardian = _guardian; }
    function pause() external { require(msg.sender == guardian, "FeeSplitter: not guardian"); _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @notice Split all accumulated fee tokens.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function splitAll(address[] calldata tokens) external nonReentrant whenNotPaused whenProtocolNotPaused {
        for (uint256 i = 0; i < tokens.length; i++) {
            _split(tokens[i]);
        }
    }

    function _split(address token) internal {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal == 0) return;

        Split memory s = tokenSplits[token].isCustom ? tokenSplits[token] : defaultSplit;
        uint256 toTreasury = (bal * s.treasuryBps) / BPS;
        uint256 toRewards  = (bal * s.rewardBps)   / BPS;
        uint256 toBuyback  = bal - toTreasury - toRewards;

        if (toTreasury > 0) IERC20(token).safeTransfer(treasury, toTreasury);
        if (toRewards > 0)  IERC20(token).safeTransfer(rewardDistributor, toRewards);
        if (toBuyback > 0) {
            address buybackDest = buybackAndBurn != address(0) ? buybackAndBurn : treasury;
            IERC20(token).safeTransfer(buybackDest, toBuyback);
        }
        emit FeeSplit(token, toTreasury, toRewards, toBuyback);
    }

    function setDefaultSplit(uint16 tBps, uint16 rBps, uint16 bBps) external onlyOwner whenProtocolNotPaused {
        require(uint256(tBps) + rBps + bBps == BPS, "FeeSplitter: must sum to 10000");
        defaultSplit = Split(tBps, rBps, bBps, false);
        emit DefaultSplitUpdated(tBps, rBps, bBps);
    }

    function setTokenSplit(address token, uint16 tBps, uint16 rBps, uint16 bBps) external onlyOwner whenProtocolNotPaused {
        require(token != address(0),               "FeeSplitter: zero token");
        require(uint256(tBps) + rBps + bBps == BPS, "FeeSplitter: must sum to 10000");
        tokenSplits[token] = Split(tBps, rBps, bBps, true);
        emit TokenSplitSet(token, tBps, rBps, bBps);
    }

    function clearTokenSplit(address token) external onlyOwner whenProtocolNotPaused {
        delete tokenSplits[token];
    }

    function setAddresses(
        address _treasury,
        address _rewardDistributor,
        address _buybackAndBurn
    ) external onlyOwner whenProtocolNotPaused {
        require(_treasury          != address(0), "FeeSplitter: zero treasury");
        require(_rewardDistributor != address(0), "FeeSplitter: zero distributor");
        treasury          = _treasury;
        rewardDistributor = _rewardDistributor;
        buybackAndBurn    = _buybackAndBurn;
        emit AddressesUpdated();
    }
}
