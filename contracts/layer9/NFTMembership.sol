// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  NFTMembership
 * @notice Tiered NFT Access Passes
 *
 *         Four tiers (configurable):
 *           0 — Bronze   (lowest, cheapest)
 *           1 — Silver
 *           2 — Gold
 *           3 — Platinum (highest, most expensive)
 *
 *         Each tier has:
 *           • Mint price in ETH and/or DWT
 *           • Max supply cap
 *           • Minimum DWT holding requirement (checked at access-gate)
 *           • Metadata URI base
 *           • Transferability flag (soulbound option)
 *
 *         Access gating: external contracts call `hasAccess(user, minTier)`.
 *         Expiry: optional per-token expiry timestamp (0 = non-expiring).
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../SecurityGated.sol";

contract NFTMembership is ERC721Enumerable, Ownable, ReentrancyGuard, Pausable, SecurityGated {
    using SafeERC20 for IERC20;
    using Strings  for uint256;

    // ── Errors ────────────────────────────────────────────────────────────────
    error TierCapReached();
    error InvalidTier();
    error InsufficientPayment();
    error InsufficientDWT();
    error AlreadyHasTier();
    error TokenExpired();
    error Soulbound();
    error ZeroAddress();
    error WithdrawFailed();
    error TierNotEnabled();

    // ── Events ────────────────────────────────────────────────────────────────
    event TierConfigured(uint8 tier, uint256 ethPrice, uint256 dwtPrice, uint256 maxSupply, bool soulbound);
    event PassMinted(address indexed to, uint256 tokenId, uint8 tier, uint256 expiry);
    event PassUpgraded(uint256 indexed tokenId, uint8 oldTier, uint8 newTier);
    event ExpiryExtended(uint256 indexed tokenId, uint256 newExpiry);
    event AccessChecked(address indexed user, uint8 minTier, bool granted);

    // ── Constants ─────────────────────────────────────────────────────────────
    uint8 public constant TIER_COUNT = 4;

    // ── Structs ───────────────────────────────────────────────────────────────
    struct TierConfig {
        uint256 ethPrice;          // mint price in wei
        uint256 dwtPrice;          // mint price in DWT (0 = ETH only)
        uint256 dwtHoldRequirement;// minimum DWT held to use this pass
        uint256 maxSupply;         // 0 = unlimited
        uint256 currentSupply;
        uint256 durationSeconds;   // validity period (0 = permanent)
        string  baseURI;
        bool    soulbound;         // non-transferable if true
        bool    enabled;
    }

    struct TokenData {
        uint8   tier;
        uint256 expiry;           // unix timestamp, 0 = permanent
    }

    // ── State ─────────────────────────────────────────────────────────────────
    IERC20 public immutable dwtToken;

    mapping(uint8  => TierConfig) public tierConfigs;
    mapping(uint256 => TokenData) public tokenData;
    mapping(address => uint8)     public highestTier; // user → highest tier owned (1-indexed, 0=none)
    mapping(address => bool)      public freeMintWhitelist;

    uint256 private _nextTokenId = 1;

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address _dwtToken, address _securityController)
        ERC721("DWT Membership Pass", "DWTPASS")
        Ownable(msg.sender)
        SecurityGated(_securityController)
    {
        if (_dwtToken == address(0)) revert ZeroAddress();
        dwtToken = IERC20(_dwtToken);

        // Default tier configurations
        _configureTier(0, 0.05 ether,  100e18,  0,       1000, 365 days, "", false, true);  // Bronze
        _configureTier(1, 0.15 ether,  500e18,  500e18,  500,  365 days, "", false, true);  // Silver
        _configureTier(2, 0.50 ether,  2000e18, 2000e18, 200,  365 days, "", false, true);  // Gold
        _configureTier(3, 1.50 ether,  5000e18, 5000e18, 50,   365 days, "", false, true);  // Platinum
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function configureTier(
        uint8   tier,
        uint256 ethPrice,
        uint256 dwtPrice,
        uint256 dwtHoldReq,
        uint256 maxSupply,
        uint256 durationSeconds,
        string calldata baseURI,
        bool    soulbound,
        bool    enabled
    ) external onlyOwner whenProtocolNotPaused {
        if (tier >= TIER_COUNT) revert InvalidTier();
        _configureTier(tier, ethPrice, dwtPrice, dwtHoldReq, maxSupply, durationSeconds, baseURI, soulbound, enabled);
    }

    function _configureTier(
        uint8   tier,
        uint256 ethPrice,
        uint256 dwtPrice,
        uint256 dwtHoldReq,
        uint256 maxSupply,
        uint256 durationSeconds,
        string memory baseURI,
        bool    soulbound,
        bool    enabled
    ) internal {
        TierConfig storage tc = tierConfigs[tier];
        tc.ethPrice           = ethPrice;
        tc.dwtPrice           = dwtPrice;
        tc.dwtHoldRequirement = dwtHoldReq;
        tc.maxSupply          = maxSupply;
        tc.durationSeconds    = durationSeconds;
        tc.baseURI            = baseURI;
        tc.soulbound          = soulbound;
        tc.enabled            = enabled;
        emit TierConfigured(tier, ethPrice, dwtPrice, maxSupply, soulbound);
    }

    function setFreeMintWhitelist(address[] calldata users, bool status) external onlyOwner whenProtocolNotPaused {
        for (uint256 i; i < users.length; ++i) freeMintWhitelist[users[i]] = status;
    }

    function setTierBaseURI(uint8 tier, string calldata uri) external onlyOwner whenProtocolNotPaused {
        if (tier >= TIER_COUNT) revert InvalidTier();
        tierConfigs[tier].baseURI = uri;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ── Minting ───────────────────────────────────────────────────────────────

    /**
     * @notice Mint a tier pass with ETH payment.
     * @param tier  Tier index (0–3)
     */
    function mintWithETH(uint8 tier)
        external
        payable
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
    {
        TierConfig storage tc = _validatedTier(tier);
        bool free = freeMintWhitelist[msg.sender];
        if (!free && msg.value < tc.ethPrice) revert InsufficientPayment();
        _mintPass(msg.sender, tier, tc);
    }

    /**
     * @notice Mint a tier pass with DWT token payment.
     * @param tier  Tier index (0–3)
     */
    function mintWithDWT(uint8 tier)
        external
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
    {
        TierConfig storage tc = _validatedTier(tier);
        if (tc.dwtPrice == 0) revert InsufficientPayment();
        bool free = freeMintWhitelist[msg.sender];
        if (!free) dwtToken.safeTransferFrom(msg.sender, address(this), tc.dwtPrice);
        _mintPass(msg.sender, tier, tc);
    }

    /**
     * @notice Admin-mint to any address (airdrops, partnerships).
     */
    function adminMint(address to, uint8 tier) external onlyOwner whenProtocolNotPaused {
        if (to == address(0)) revert ZeroAddress();
        TierConfig storage tc = _validatedTier(tier);
        _mintPass(to, tier, tc);
    }

    function _validatedTier(uint8 tier) internal view returns (TierConfig storage tc) {
        if (tier >= TIER_COUNT) revert InvalidTier();
        tc = tierConfigs[tier];
        if (!tc.enabled) revert TierNotEnabled();
        if (tc.maxSupply > 0 && tc.currentSupply >= tc.maxSupply) revert TierCapReached();
    }

    function _mintPass(address to, uint8 tier, TierConfig storage tc) internal {
        uint256 tokenId = _nextTokenId++;
        uint256 expiry  = tc.durationSeconds > 0
            ? block.timestamp + tc.durationSeconds
            : 0;

        tc.currentSupply++;
        tokenData[tokenId] = TokenData({ tier: tier, expiry: expiry });

        // Track highest tier (tier is 0-indexed; add 1 so 0 = "no pass")
        if (highestTier[to] < tier + 1) highestTier[to] = tier + 1;

        _safeMint(to, tokenId);
        emit PassMinted(to, tokenId, tier, expiry);
    }

    // ── Upgrade ───────────────────────────────────────────────────────────────

    /**
     * @notice Upgrade an existing pass to the next tier (pay the delta).
     *         ETH-upgrade: pay difference in ETH prices.
     * @param tokenId Pass to upgrade
     */
    function upgradeWithETH(uint256 tokenId)
        external
        payable
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
    {
        _checkOwner(tokenId);
        TokenData storage td = tokenData[tokenId];
        if (td.expiry > 0 && block.timestamp > td.expiry) revert TokenExpired();

        uint8 newTier = td.tier + 1;
        if (newTier >= TIER_COUNT) revert InvalidTier();

        TierConfig storage newTc = tierConfigs[newTier];
        if (!newTc.enabled) revert TierNotEnabled();
        if (newTc.maxSupply > 0 && newTc.currentSupply >= newTc.maxSupply) revert TierCapReached();

        uint256 delta = newTc.ethPrice - tierConfigs[td.tier].ethPrice;
        if (msg.value < delta) revert InsufficientPayment();

        uint8 oldTier = td.tier;
        tierConfigs[oldTier].currentSupply--;
        newTc.currentSupply++;
        td.tier = newTier;

        if (highestTier[msg.sender] < newTier + 1) highestTier[msg.sender] = newTier + 1;

        emit PassUpgraded(tokenId, oldTier, newTier);
    }

    /**
     * @notice Extend the expiry of a pass by paying the full tier price again.
     */
    function renewWithETH(uint256 tokenId)
        external
        payable
        nonReentrant
        whenNotPaused
        whenProtocolNotPaused
    {
        _checkOwner(tokenId);
        TokenData storage td = tokenData[tokenId];
        TierConfig storage tc = tierConfigs[td.tier];
        if (msg.value < tc.ethPrice) revert InsufficientPayment();

        uint256 base  = td.expiry > block.timestamp ? td.expiry : block.timestamp;
        td.expiry     = base + tc.durationSeconds;
        emit ExpiryExtended(tokenId, td.expiry);
    }

    // ── Access gate ───────────────────────────────────────────────────────────

    /**
     * @notice Returns true if `user` holds an active pass at or above `minTier`.
     *         Also validates DWT holding requirement of the tier.
     * @param user    Address to check
     * @param minTier Minimum tier required (0–3)
     */
    function hasAccess(address user, uint8 minTier) external view returns (bool) {
        if (minTier >= TIER_COUNT) return false;
        uint256 balance = balanceOf(user);
        for (uint256 i; i < balance; ++i) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            TokenData storage td = tokenData[tokenId];
            if (td.tier < minTier) continue;
            if (td.expiry > 0 && block.timestamp > td.expiry) continue;
            // Check DWT holding requirement
            uint256 holdReq = tierConfigs[td.tier].dwtHoldRequirement;
            if (holdReq > 0 && dwtToken.balanceOf(user) < holdReq) continue;
            return true;
        }
        return false;
    }

    /**
     * @notice Returns the highest active tier index of a user (255 = none).
     */
    function activeTier(address user) external view returns (uint8) {
        uint256 balance = balanceOf(user);
        uint8   best    = type(uint8).max;
        for (uint256 i; i < balance; ++i) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            TokenData storage td = tokenData[tokenId];
            if (td.expiry > 0 && block.timestamp > td.expiry) continue;
            if (best == type(uint8).max || td.tier > best) best = td.tier;
        }
        return best;
    }

    // ── ERC721 overrides ──────────────────────────────────────────────────────

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        // Block transfers for soulbound tokens (allow mint = from zero, allow burn = to zero)
        if (from != address(0) && to != address(0)) {
            if (tierConfigs[tokenData[tokenId].tier].soulbound) revert Soulbound();
        }
        return from;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        uint8 tier = tokenData[tokenId].tier;
        string memory base = tierConfigs[tier].baseURI;
        if (bytes(base).length == 0) return "";
        return string.concat(base, tokenId.toString());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function _checkOwner(uint256 tokenId) internal view {
        if (ownerOf(tokenId) != msg.sender) revert ZeroAddress(); // reuse
    }

    // ── Withdrawals ───────────────────────────────────────────────────────────
    function withdrawETH(address payable to) external onlyOwner whenProtocolNotPaused {
        (bool ok,) = to.call{value: address(this).balance}("");
        if (!ok) revert WithdrawFailed();
    }

    function withdrawDWT(address to, uint256 amount) external onlyOwner whenProtocolNotPaused {
        dwtToken.safeTransfer(to, amount);
    }

    receive() external payable {}
}
