// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../SecurityGated.sol";

interface IVeDWT {
    function balanceOfAt(address user, uint256 timestamp) external view returns (uint256);
}

/**
 * @title GaugeVoting
 * @notice Gauge voting with pause gating via Layer 7.
 */
contract GaugeVoting is ReentrancyGuard, Ownable, SecurityGated {

    IVeDWT public immutable veDWT;

    struct GaugeInfo {
        bool active;
        uint256 totalWeight;
        mapping(address => uint256) userVotes;
    }

    mapping(address => GaugeInfo) public gauges;
    address[] public gaugeList;

    uint256 public totalProtocolWeight;
    uint256 public constant VOTE_DELAY = 10 days;

    mapping(address => uint256) public lastVoteTime;

    event GaugeAdded(address indexed gauge);
    event GaugeRemoved(address indexed gauge);
    event Voted(address indexed user, address indexed gauge, uint256 weight);

    constructor(
        address _veDWT,
        address _securityController,
        address initialOwner
    ) Ownable(initialOwner) SecurityGated(_securityController) {
        require(_veDWT != address(0), "GaugeVoting: zero veDWT");
        veDWT = IVeDWT(_veDWT);
    }

    function addGauge(address gauge) external onlyOwner whenProtocolNotPaused {
        require(gauge != address(0), "GaugeVoting: zero gauge");
        require(!gauges[gauge].active, "GaugeVoting: already active");
        gauges[gauge].active = true;
        gaugeList.push(gauge);
        emit GaugeAdded(gauge);
    }

    /**
     * @notice Vote for a specific gauge.
     * @dev Gated by Protocol-wide pause via Layer 7.
     */
    function vote(address gauge, uint256 weight) external nonReentrant whenProtocolNotPaused {
        require(gauges[gauge].active, "GaugeVoting: gauge not active");
        require(block.timestamp >= lastVoteTime[msg.sender] + VOTE_DELAY, "GaugeVoting: too frequent");

        uint256 power = veDWT.balanceOfAt(msg.sender, block.timestamp - 1);
        require(power > 0, "GaugeVoting: no voting power");
        require(weight <= power, "GaugeVoting: exceeds power");

        uint256 oldWeight = gauges[gauge].userVotes[msg.sender];
        gauges[gauge].totalWeight = gauges[gauge].totalWeight - oldWeight + weight;
        totalProtocolWeight = totalProtocolWeight - oldWeight + weight;

        gauges[gauge].userVotes[msg.sender] = weight;
        lastVoteTime[msg.sender] = block.timestamp;

        emit Voted(msg.sender, gauge, weight);
    }

    function getGaugeCount() external view returns (uint256) {
        return gaugeList.length;
    }

    function getRelativeWeight(address gauge) external view returns (uint256) {
        if (totalProtocolWeight == 0) return 0;
        return (gauges[gauge].totalWeight * 1e18) / totalProtocolWeight;
    }
}
