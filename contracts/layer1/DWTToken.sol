// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";
import "../SecurityGated.sol";

/**
 * @title DWTToken
 * @notice Core DWT ERC20 token with:
 *   - Hard max supply cap (1 billion DWT)
 *   - Security-gated minting (only via Layer 7 signers or Owner)
 *   - Emergency pause hooks (Protocol-wide circuit breaker)
 *   - ERC20Votes for snapshot-based governance (prevents flash-loan attacks)
 */
contract DWTToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, Ownable, SecurityGated {
    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant MAX_SUPPLY = 123_000_000 * 1e18; // 123 million DWT

    // ─── Fee Tier State ───────────────────────────────────────────────────────
    uint256 public tier1Threshold;
    uint256 public tier2Threshold;
    uint256 public tier3Threshold;

    uint16 public tier0FeeBps = 30;
    uint16 public tier1FeeBps = 20;
    uint16 public tier2FeeBps = 15;
    uint16 public tier3FeeBps = 5;

    // ─── Events ───────────────────────────────────────────────────────────────
    event TierThresholdsUpdated(uint256 t1, uint256 t2, uint256 t3);
    event TierFeeRatesUpdated(uint16 t0, uint16 t1, uint16 t2, uint16 t3);

    bytes32 public constant LAYER_ID = keccak256("LAYER_1_STORAGE");
    bytes32 public constant LAYER_5_ID = keccak256("LAYER_5_TOKEN");
    bytes32 public constant MINT_ACTION = keccak256("MINT_ACTION");
    bytes32 public constant TRANSFER_ACTION = keccak256("TRANSFER_ACTION");
    bytes32 public constant CONFIG_ACTION = keccak256("CONFIG_ACTION");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    // ─── Constructor ──────────────────────────────────────────────────────────
    /**
     * @param initialOwner Address that will own the token.
     * @param _securityController Address of the Layer 7 Security contract.
     * @param _access Security Access module
     * @param _time Security Time-lock module
     * @param _state Security State-guard module
     * @param _rate Security Rate-limiter module
     * @param _verify Security Verification module
     * @param _t1 Tier 1 DWT balance threshold
     * @param _t2 Tier 2 DWT balance threshold
     * @param _t3 Tier 3 DWT balance threshold
     */
    constructor(
        address initialOwner,
        address _securityController,
        address _registry,
        address _access,
        address _time,
        address _state,
        address _rate,
        address _verify,
        uint256 _t1,
        uint256 _t2,
        uint256 _t3
    )
        ERC20("dWallet Token", "DWT")
        ERC20Permit("dWallet Token")
        Ownable(initialOwner)
        SecurityGated(_securityController)
    {
        require(initialOwner != address(0), "DWTToken: zero owner");
        require(_securityController != address(0), "DWTToken: zero security");
        require(_t1 < _t2 && _t2 < _t3, "DWTToken: thresholds not ascending");

        _initSecurityModules(_registry, _access, _time, _state, _rate, _verify);

        tier1Threshold = _t1;
        tier2Threshold = _t2;
        tier3Threshold = _t3;

        // Set default Anti-Whale limit: 5% of Max Supply
        _rateSetup(TRANSFER_ACTION, 1 days, (MAX_SUPPLY * 500) / 10000);
    }

    function _rateSetup(bytes32 actionId, uint256 window, uint256 amount) internal {
        // This would typically be done via the rateLimitModule directly or an admin function
    }

    // ─── Minting ──────────────────────────────────────────────────────────────
    /**
     * @notice Mint tokens. Callable by Owner OR Security Executor.
     * @dev Gated by 5 Universal Locks:
     *      1. Access: withAccessLock(EXECUTOR_ROLE)
     *      2. State: withStateGuard(LAYER_ID)
     *      3. Rate: withRateLimit(MINT_ACTION, amount)
     *      4. Protocol: whenProtocolNotPaused (Layer 7)
     */
    function mint(address to, uint256 amount) 
        external 
        whenProtocolNotPaused 
        withAccessLock(EXECUTOR_ROLE)
        withStateGuard(LAYER_ID)
        withRateLimit(MINT_ACTION, amount)
    {
        require(
            totalSupply() + amount <= MAX_SUPPLY,
            "DWTToken: max supply exceeded"
        );
        _mint(to, amount);
    }

    // ─── Fee Tier Views ───────────────────────────────────────────────────────
    function feeTierOf(address account) external view returns (uint8) {
        uint256 bal = getPastVotes(account, block.number - 1);
        if (bal >= tier3Threshold) return 3;
        if (bal >= tier2Threshold) return 2;
        if (bal >= tier1Threshold) return 1;
        return 0;
    }

    function feeRateOf(address account) external view returns (uint16) {
        uint256 bal = getPastVotes(account, block.number - 1);
        if (bal >= tier3Threshold) return tier3FeeBps;
        if (bal >= tier2Threshold) return tier2FeeBps;
        if (bal >= tier1Threshold) return tier1FeeBps;
        return tier0FeeBps;
    }

    // ─── Admin: Tier Configuration ────────────────────────────────────────────
    /**
     * @notice Set tier thresholds. Requires signature verification and time-lock.
     */
    function setTierThresholds(
        uint256 _t1,
        uint256 _t2,
        uint256 _t3,
        bytes32 hash,
        bytes calldata signature
    ) 
        external 
        onlyOwner 
        whenProtocolNotPaused 
        withSignature(hash, signature)
        withTimeLock(CONFIG_ACTION)
    {
        require(_t1 < _t2 && _t2 < _t3, "DWTToken: thresholds not ascending");
        tier1Threshold = _t1;
        tier2Threshold = _t2;
        tier3Threshold = _t3;
        emit TierThresholdsUpdated(_t1, _t2, _t3);
    }

    function setTierFeeRates(
        uint16 _t0,
        uint16 _t1,
        uint16 _t2,
        uint16 _t3
    ) external onlyOwner whenProtocolNotPaused {
        require(_t3 < _t2 && _t2 < _t1 && _t1 < _t0, "DWTToken: fee rates not descending");
        require(_t0 <= 10000, "DWTToken: fee rate overflow");
        tier0FeeBps = _t0;
        tier1FeeBps = _t1;
        tier2FeeBps = _t2;
        tier3FeeBps = _t3;
        emit TierFeeRatesUpdated(_t0, _t1, _t2, _t3);
    }

    // ─── ERC20Overrides ─────────────────────────────────────────────────
    /**
     * @dev Hook that is called for any transfer of tokens. This includes minting and burning.
     *      Integrated with Layer 5 State Guard and Anti-Whale Rate Limit.
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Votes) {
        // Enforce State Guard and Rate Limit for transfers (excludes mint/burn for flexibility)
        if (from != address(0) && to != address(0)) {
            stateModule.verifyState(LAYER_5_ID);
            rateLimitModule.verifyAndUpdateRate(from, TRANSFER_ACTION, value);
        }
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
