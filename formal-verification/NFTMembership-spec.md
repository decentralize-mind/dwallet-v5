# NFTMembership Formal Verification Specifications

This document contains formal verification properties for the NFTMembership contract's access control logic.
These specifications can be used with formal verification tools like Certora Prover, HEVM, or Model Checking.

---

## 1. Access Control Invariants

### Property 1.1: highestTier Monotonicity (on mint)
**Description**: When a user mints a new pass, their highestTier can only increase or stay the same.

```
rule mintIncreasesHighestTier(address user, uint8 tier) {
    require tier < TIER_COUNT;
    require !paused();
    
    uint8 oldHighest = highestTier[user];
    
    mintWithETH(tier);  // or mintWithDWT
    
    uint8 newHighest = highestTier[user];
    
    assert newHighest >= oldHighest;
    assert newHighest == max(oldHighest, tier + 1);
}
```

### Property 1.2: hasAccess Implies Valid Token
**Description**: If `hasAccess(user, minTier)` returns true, then user must own at least one non-expired token with tier >= minTier.

```
rule hasAccessImpliesValidToken(address user, uint8 minTier) {
    bool access = hasAccess(user, minTier);
    
    if (access) {
        assert exists uint256 tokenId such that:
            ownerOf(tokenId) == user &&
            tokenData[tokenId].tier >= minTier &&
            (tokenData[tokenId].expiry == 0 || block.timestamp <= tokenData[tokenId].expiry) &&
            dwtToken.balanceOf(user) >= tierConfigs[tokenData[tokenId].tier].dwtHoldRequirement;
    }
}
```

### Property 1.3: No Access Without Token
**Description**: If a user owns no tokens, `hasAccess` must return false.

```
rule noTokenNoAccess(address user, uint8 minTier) {
    require balanceOf(user) == 0;
    
    assert hasAccess(user, minTier) == false;
}
```

### Property 1.4: Expired Token Denies Access
**Description**: If all user's tokens at tier >= minTier are expired, `hasAccess` must return false.

```
rule expiredTokensDenyAccess(address user, uint8 minTier) {
    require balanceOf(user) > 0;
    require forall uint256 i in [0, balanceOf(user)):
        let tokenId = tokenOfOwnerByIndex(user, i);
        tokenData[tokenId].tier >= minTier implies
        (tokenData[tokenId].expiry > 0 && block.timestamp > tokenData[tokenId].expiry);
    
    assert hasAccess(user, minTier) == false;
}
```

---

## 2. Tier Upgrade Invariants

### Property 2.1: Upgrade Increases Token Tier
**Description**: After successful upgrade, the token's tier increases by exactly 1.

```
rule upgradeIncreasesTierByOne(uint256 tokenId) {
    require ownerOf(tokenId) == msg.sender;
    require tokenData[tokenId].expiry == 0 || block.timestamp <= tokenData[tokenId].expiry;
    
    uint8 oldTier = tokenData[tokenId].tier;
    require oldTier < TIER_COUNT - 1;
    require tierConfigs[oldTier + 1].enabled;
    
    uint256 delta = tierConfigs[oldTier + 1].ethPrice - tierConfigs[oldTier].ethPrice;
    upgradeWithETH(tokenId){value: delta};
    
    assert tokenData[tokenId].tier == oldTier + 1;
}
```

### Property 2.2: Upgrade Requires Sufficient Payment
**Description**: Upgrade must revert if payment is less than price delta.

```
rule upgradeRequiresSufficientPayment(uint256 tokenId, uint256 payment) {
    require ownerOf(tokenId) == msg.sender;
    
    uint8 oldTier = tokenData[tokenId].tier;
    uint8 newTier = oldTier + 1;
    uint256 delta = tierConfigs[newTier].ethPrice - tierConfigs[oldTier].ethPrice;
    
    require payment < delta;
    
    upgradeWithETH(tokenId){value: payment} reverts;
}
```

---

## 3. Soulbound Token Invariants

### Property 3.1: Soulbound Tokens Cannot Be Transferred
**Description**: If a token's tier is configured as soulbound, transferFrom must revert.

```
rule soulboundCannotTransfer(uint256 tokenId, address to) {
    require to != address(0);
    require ownerOf(tokenId) == msg.sender;
    require tierConfigs[tokenData[tokenId].tier].soulbound == true;
    
    transferFrom(msg.sender, to, tokenId) reverts with Soulbound();
}
```

### Property 3.2: Non-Soulbound Tokens Can Be Transferred
**Description**: If a token's tier is not soulbound, transferFrom must succeed.

```
rule nonSoulboundCanTransfer(uint256 tokenId, address to) {
    require to != address(0);
    require ownerOf(tokenId) == msg.sender;
    require tierConfigs[tokenData[tokenId].tier].soulbound == false;
    
    transferFrom(msg.sender, to, tokenId) does not revert;
    assert ownerOf(tokenId) == to;
}
```

---

## 4. Supply Cap Invariants

### Property 4.1: Supply Cap Is Enforced
**Description**: Minting must revert if currentSupply >= maxSupply.

```
rule supplyCapEnforced(uint8 tier) {
    require tierConfigs[tier].maxSupply > 0;
    require tierConfigs[tier].currentSupply >= tierConfigs[tier].maxSupply;
    
    mintWithETH(tier){value: tierConfigs[tier].ethPrice} reverts with TierCapReached();
}
```

### Property 4.2: Supply Count Is Accurate
**Description**: currentSupply must equal the actual number of tokens minted for each tier.

```
rule supplyCountAccurate(uint8 tier) {
    uint256 actualCount = countTokensInTier(tier);
    assert tierConfigs[tier].currentSupply == actualCount;
}

function countTokensInTier(uint8 tier) returns (uint256) {
    uint256 count = 0;
    for (uint256 tokenId = 1; tokenId < _nextTokenId; tokenId++) {
        if (_exists(tokenId) && tokenData[tokenId].tier == tier) {
            count++;
        }
    }
    return count;
}
```

---

## 5. Expiry Invariants

### Property 5.1: Expiry Is Set Correctly on Mint
**Description**: When minting, expiry should be set to block.timestamp + durationSeconds (or 0 if permanent).

```
rule expirySetCorrectlyOnMint(address user, uint8 tier) {
    uint256 tokenIdBefore = _nextTokenId - 1;
    
    mintWithETH(tier){value: tierConfigs[tier].ethPrice};
    
    uint256 tokenId = tokenIdBefore + 1;
    uint256 expectedExpiry = tierConfigs[tier].durationSeconds > 0 
        ? block.timestamp + tierConfigs[tier].durationSeconds 
        : 0;
    
    assert tokenData[tokenId].expiry == expectedExpiry;
}
```

### Property 5.2: Renewal Extends Expiry
**Description**: After renewal, the new expiry should be based on the later of current expiry or block.timestamp.

```
rule renewalExtendsExpiry(uint256 tokenId, uint256 payment) {
    require ownerOf(tokenId) == msg.sender;
    require payment >= tierConfigs[tokenData[tokenId].tier].ethPrice;
    
    uint256 oldExpiry = tokenData[tokenId].expiry;
    uint8 tier = tokenData[tokenId].tier;
    uint256 duration = tierConfigs[tier].durationSeconds;
    
    renewWithETH(tokenId){value: payment};
    
    uint256 base = oldExpiry > block.timestamp ? oldExpiry : block.timestamp;
    uint256 expectedNewExpiry = base + duration;
    
    assert tokenData[tokenId].expiry == expectedNewExpiry;
}
```

---

## 6. DWT Holding Requirement Invariants

### Property 6.1: Access Requires DWT Balance
**Description**: If a tier has dwtHoldRequirement > 0, user must have sufficient DWT balance for access.

```
rule accessRequiresDWTBalance(address user, uint8 minTier) {
    bool access = hasAccess(user, minTier);
    
    if (access) {
        assert exists uint256 tokenId such that:
            ownerOf(tokenId) == user &&
            tokenData[tokenId].tier >= minTier &&
            (tokenData[tokenId].expiry == 0 || block.timestamp <= tokenData[tokenId].expiry) &&
            dwtToken.balanceOf(user) >= tierConfigs[tokenData[tokenId].tier].dwtHoldRequirement;
    }
}
```

---

## 7. Security State Invariants

### Property 7.1: Pause Prevents Minting
**Description**: When contract is paused, all minting functions must revert.

```
rule pausePreventsMinting(uint8 tier) {
    pause();
    
    mintWithETH(tier){value: tierConfigs[tier].ethPrice} reverts;
    mintWithDWT(tier) reverts;
    adminMint(address(1), tier) does not revert; // Admin can still mint
}
```

### Property 7.2: Protocol Pause Prevents Minting
**Description**: When protocol is paused via Layer7, all minting must revert.

```
rule protocolPausePreventsMinting(uint8 tier) {
    // Assume securityController.paused() returns true
    mintWithETH(tier){value: tierConfigs[tier].ethPrice} reverts with SecurityLayerPaused();
}
```

---

## 8. Optimization Verification

### Property 8.1: highestTier Cache Correctness
**Description**: highestTier[user] must always equal the maximum tier among all non-expired tokens owned by user.

```
rule highestTierCacheCorrectness(address user) {
    uint8 expectedHighest = 0;
    
    for (uint256 i = 0; i < balanceOf(user); i++) {
        uint256 tokenId = tokenOfOwnerByIndex(user, i);
        TokenData memory td = tokenData[tokenId];
        
        if (td.expiry == 0 || block.timestamp <= td.expiry) {
            uint8 tierValue = td.tier + 1;
            if (tierValue > expectedHighest) {
                expectedHighest = tierValue;
            }
        }
    }
    
    assert highestTier[user] == expectedHighest;
}
```

### Property 8.2: hasAccess Gas Optimization
**Description**: If highestTier[user] < minTier + 1, hasAccess must return false without iterating.

```
rule hasAccessEarlyReturn(address user, uint8 minTier) {
    require highestTier[user] < minTier + 1;
    
    // Should return false immediately without expensive iteration
    assert hasAccess(user, minTier) == false;
}
```

---

## Running Formal Verification

### Using Certora Prover

1. Install Certora CLI:
```bash
pip install certora-cli
```

2. Create specification file (`NFTMembership.spec`):
```
// Translate the properties above to Certora specification language
// See: https://certora.atlassian.net/wiki/spaces/CPD/overview
```

3. Run verification:
```bash
certoraRun NFTMembership.sol:NFTMembership \
  --spec NFTMembership.spec \
  --solc_args "['--optimize']" \
  --msg "Verify access control invariants"
```

### Using HEVM (Foundry)

1. Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
```

2. Create invariant tests in `test/NFTMembership.invariant.t.sol`

3. Run invariant testing:
```bash
forge test --match-contract NFTMembershipInvariantTest -vvv
```

---

## Verification Status

| Property Category | Status | Notes |
|------------------|--------|-------|
| Access Control | ✅ Specified | Requires tool execution |
| Tier Upgrades | ✅ Specified | Requires tool execution |
| Soulbound | ✅ Specified | Requires tool execution |
| Supply Caps | ✅ Specified | Requires tool execution |
| Expiry | ✅ Specified | Requires tool execution |
| DWT Requirements | ✅ Specified | Requires tool execution |
| Security States | ✅ Specified | Requires tool execution |
| Optimizations | ✅ Specified | Requires tool execution |

**Note**: These specifications define the formal properties. Actual verification requires running with formal verification tools (Certora, HEVM, etc.). The comprehensive test suite (35 unit tests + 16 integration tests) provides strong coverage of these properties through concrete test cases.
