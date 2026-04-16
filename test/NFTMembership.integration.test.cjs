const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('NFTMembership - Integration Tests', function () {
  let nft, dwtToken, security, launchpad
  let owner, admin, user1, user2, user3, attacker
  
  const LAYER_9_ID = ethers.keccak256(ethers.toUtf8Bytes("LAYER_9_SETTLEMENT"))

  beforeEach(async function () {
    ;[owner, admin, user1, user2, user3, attacker] = await ethers.getSigners()

    // Deploy DWT Token
    const MockToken = await ethers.getContractFactory('MockERC20')
    dwtToken = await MockToken.deploy("DWT Token", "DWT", 18)
    await dwtToken.waitForDeployment()

    // Deploy Security Infrastructure
    const Security = await ethers.getContractFactory('Layer7Security')
    security = await Security.deploy([owner.address], 1, 100, ethers.parseEther('100'), 0)
    await security.waitForDeployment()
    const securityAddr = await security.getAddress()

    // Deploy NFTMembership
    const NFTMembership = await ethers.getContractFactory('contracts/layer9/NFTMembership.sol:NFTMembership')
    nft = await NFTMembership.deploy(
      await dwtToken.getAddress(),
      securityAddr
    )
    await nft.waitForDeployment()

    // Mint DWT tokens to users
    await dwtToken.mint(user1.address, ethers.parseEther('100000'))
    await dwtToken.mint(user2.address, ethers.parseEther('100000'))
    await dwtToken.mint(user3.address, ethers.parseEther('100000'))
  })

  describe('Integration with Launchpad-style Contract', function () {
    let mockLaunchpad

    beforeEach(async function () {
      const MockLaunchpad = await ethers.getContractFactory('MockLaunchpad')
      mockLaunchpad = await MockLaunchpad.deploy(await nft.getAddress())
      await mockLaunchpad.waitForDeployment()
    })

    it('Should grant higher allocation to higher tier users', async function () {
      // User1 mints Bronze
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      await nft.connect(user1).mintWithETH(0, { value: bronzePrice })
      
      // User2 mints Gold
      const goldPrice = (await nft.tierConfigs(2)).ethPrice
      await nft.connect(user2).mintWithETH(2, { value: goldPrice })
      
      // Register both with same base allocation
      const baseAllocation = ethers.parseEther('1000')
      await mockLaunchpad.connect(user1).register(user1.address, baseAllocation)
      await mockLaunchpad.connect(user2).register(user2.address, baseAllocation)
      
      // Check allocations
      const user1Alloc = await mockLaunchpad.getAllocation(user1.address)
      const user2Alloc = await mockLaunchpad.getAllocation(user2.address)
      
      expect(user1Alloc).to.equal(baseAllocation * 1n) // Bronze multiplier: 1
      expect(user2Alloc).to.equal(baseAllocation * 8n) // Gold multiplier: 8
      expect(user2Alloc).to.be.gt(user1Alloc)
    })

    it('Should reject users without membership pass', async function () {
      const baseAllocation = ethers.parseEther('1000')
      
      await expect(mockLaunchpad.connect(user1).register(user1.address, baseAllocation))
        .to.be.revertedWith("No membership pass")
    })

    it('Should correctly check tier access for gated features', async function () {
      // User1 mints Silver
      const silverPrice = (await nft.tierConfigs(1)).ethPrice
      await nft.connect(user1).mintWithETH(1, { value: silverPrice })
      
      // Check access levels
      expect(await mockLaunchpad.hasTierAccess(user1.address, 0)).to.be.true  // Bronze
      expect(await mockLaunchpad.hasTierAccess(user1.address, 1)).to.be.true  // Silver
      expect(await mockLaunchpad.hasTierAccess(user1.address, 2)).to.be.false // Gold
      expect(await mockLaunchpad.hasTierAccess(user1.address, 3)).to.be.false // Platinum
    })

    it('Should update allocation after tier upgrade', async function () {
      // User1 mints Bronze
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      await nft.connect(user1).mintWithETH(0, { value: bronzePrice })
      
      // Register
      const baseAllocation = ethers.parseEther('1000')
      await mockLaunchpad.connect(user1).register(user1.address, baseAllocation)
      
      let alloc = await mockLaunchpad.getAllocation(user1.address)
      expect(alloc).to.equal(baseAllocation * 1n) // Bronze
      
      // Upgrade to Silver
      const silverPrice = (await nft.tierConfigs(1)).ethPrice
      const delta = silverPrice - bronzePrice
      await nft.connect(user1).upgradeWithETH(1, { value: delta })
      
      // Re-register to get updated allocation
      await mockLaunchpad.connect(user1).register(user1.address, baseAllocation)
      alloc = await mockLaunchpad.getAllocation(user1.address)
      
      expect(alloc).to.equal(baseAllocation * 3n) // Silver
    })
  })

  describe('Integration with Staking Contract', function () {
    let mockStaking

    beforeEach(async function () {
      const MockStaking = await ethers.getContractFactory('MockStaking')
      mockStaking = await MockStaking.deploy(await nft.getAddress())
      await mockStaking.waitForDeployment()
    })

    it('Should provide tier-based APY', async function () {
      // User1 mints Gold
      const goldPrice = (await nft.tierConfigs(2)).ethPrice
      await nft.connect(user1).mintWithETH(2, { value: goldPrice })
      
      const apy = await mockStaking.getUserAPY(user1.address)
      expect(apy).to.equal(1200) // 12%
    })

    it('Should allow staking only for members', async function () {
      expect(await mockStaking.canStake(user1.address)).to.be.false
      
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      await nft.connect(user1).mintWithETH(0, { value: bronzePrice })
      
      expect(await mockStaking.canStake(user1.address)).to.be.true
    })

    it('Should update APY after tier upgrade', async function () {
      // Mint Bronze
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      await nft.connect(user1).mintWithETH(0, { value: bronzePrice })
      
      let apy = await mockStaking.getUserAPY(user1.address)
      expect(apy).to.equal(500) // 5%
      
      // Upgrade to Silver (tier 1)
      const silverPrice = (await nft.tierConfigs(1)).ethPrice
      const delta = silverPrice - bronzePrice
      await nft.connect(user1).upgradeWithETH(1, { value: delta })
      
      const silverAPY = await mockStaking.getUserAPY(user1.address)
      expect(silverAPY).to.equal(800) // 8%
      
      // Mint another user with Platinum directly
      const platinumPrice = (await nft.tierConfigs(3)).ethPrice
      await nft.connect(user2).mintWithETH(3, { value: platinumPrice })
      const platinumAPY = await mockStaking.getUserAPY(user2.address)
      expect(platinumAPY).to.equal(2000) // 20%
    })
  })

  describe('Integration with Governance Contract', function () {
    let mockGovernance

    beforeEach(async function () {
      const MockGovernance = await ethers.getContractFactory('MockGovernance')
      mockGovernance = await MockGovernance.deploy(await nft.getAddress())
      await mockGovernance.waitForDeployment()
    })

    it('Should grant voting power based on tier', async function () {
      await nft.connect(user1).mintWithETH(2, { value: ethers.parseEther('0.50') }) // Gold
      
      const votingPower = await mockGovernance.getVotingPower(user1.address)
      expect(votingPower).to.equal(10)
    })

    it('Should restrict proposal creation to Gold+', async function () {
      // Bronze user cannot propose
      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') })
      expect(await mockGovernance.canPropose(user1.address)).to.be.false
      
      // Gold user can propose
      await nft.connect(user2).mintWithETH(2, { value: ethers.parseEther('0.50') })
      expect(await mockGovernance.canPropose(user2.address)).to.be.true
    })

    it('Should allow all members to vote', async function () {
      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') })
      expect(await mockGovernance.canVote(user1.address)).to.be.true
    })
  })

  describe('Cross-Contract Security Scenarios', function () {
    it('Should deny access when pass expires during integration', async function () {
      // Configure tier with 1 second duration
      await nft.configureTier(0, ethers.parseEther('0.05'), 0, 0, 1000, 1, '', false, true)
      
      // Mint pass
      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') })
      
      // Verify access works
      expect(await nft.hasAccess(user1.address, 0)).to.be.true
      
      // Wait for expiry
      await ethers.provider.send('evm_increaseTime', [2])
      await ethers.provider.send('evm_mine')
      
      // Access should be denied
      expect(await nft.hasAccess(user1.address, 0)).to.be.false
    })

    it('Should deny access when DWT balance drops below requirement', async function () {
      const silverConfig = await nft.tierConfigs(1)
      
      // Mint Silver with sufficient DWT
      await nft.connect(user1).mintWithETH(1, { value: silverConfig.ethPrice })
      expect(await nft.hasAccess(user1.address, 1)).to.be.true
      
      // Transfer DWT away
      const balance = await dwtToken.balanceOf(user1.address)
      await dwtToken.connect(user1).transfer(user2.address, balance)
      
      // Access should be denied due to insufficient DWT
      expect(await nft.hasAccess(user1.address, 1)).to.be.false
    })

    it('Should update highestTier correctly after transfer', async function () {
      // Configure non-soulbound tier
      await nft.configureTier(0, ethers.parseEther('0.05'), 0, 0, 1000, 365 * 24 * 3600, '', false, true)
      
      // User1 mints Bronze
      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') })
      expect(await nft.highestTier(user1.address)).to.equal(1)
      
      // Transfer to user2
      await nft.connect(user1).transferFrom(user1.address, user2.address, 1)
      
      // highestTier should update
      expect(await nft.highestTier(user1.address)).to.equal(0)
      expect(await nft.highestTier(user2.address)).to.equal(1)
    })

    it('Should handle multiple NFTs with different tiers correctly', async function () {
      // User mints Bronze and Gold
      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') })
      await nft.connect(user1).mintWithETH(2, { value: ethers.parseEther('0.50') })
      
      // highestTier should be Gold (tier 2 + 1 = 3)
      expect(await nft.highestTier(user1.address)).to.equal(3)
      
      // hasAccess should return true for Silver (tier 1)
      expect(await nft.hasAccess(user1.address, 1)).to.be.true
      
      // Even if we transfer away Bronze, should still have Gold
      await nft.connect(user1).transferFrom(user1.address, user2.address, 1)
      expect(await nft.highestTier(user1.address)).to.equal(3)
      expect(await nft.hasAccess(user1.address, 2)).to.be.true
    })
  })

  describe('Gas Optimization Verification', function () {
    it('Should use less gas with highestTier cache for non-members', async function () {
      // User has no NFTs - estimate gas for view function
      const gasUsed = await nft.hasAccess.estimateGas(user1.address, 2)
      
      console.log(`Gas used for non-member access check: ${gasUsed}`)
      // Should be relatively cheap due to early return (highestTier check)
      // Note: estimateGas for view functions includes overhead, but still much cheaper than looping
      expect(gasUsed).to.be.lt(30000n) // Should be low due to cache hit
    })

    it('Should efficiently check access for high-tier members', async function () {
      // Mint Platinum
      await nft.connect(user1).mintWithETH(3, { value: ethers.parseEther('1.50') })
      
      const gasUsed = await nft.hasAccess.estimateGas(user1.address, 0)
      
      console.log(`Gas used for Platinum member access check: ${gasUsed}`)
      // Should be reasonable even with DWT balance check
      expect(gasUsed).to.be.lt(50000n)
    })
  })

  describe('Additional Edge Cases', function () {
    it('Should handle multiple transfers and recalculate highestTier correctly', async function () {
      // Configure non-soulbound tier
      const config = await nft.tierConfigs(0)
      await nft.configureTier(
        0,
        config.ethPrice,
        config.dwtPrice,
        config.dwtHoldRequirement,
        config.maxSupply,
        config.durationSeconds,
        config.baseURI,
        false, // non-soulbound
        config.enabled
      )
      
      // User1 mints Bronze and Silver
      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') })
      await nft.connect(user1).mintWithETH(1, { value: ethers.parseEther('0.15') })
      
      expect(await nft.highestTier(user1.address)).to.equal(2) // Silver
      
      // Transfer Bronze to user2
      await nft.connect(user1).transferFrom(user1.address, user2.address, 1)
      
      // User1 should still have Silver (tier 2)
      expect(await nft.highestTier(user1.address)).to.equal(2)
      // User2 should have Bronze (tier 1)
      expect(await nft.highestTier(user2.address)).to.equal(1)
      
      // Transfer Silver to user3
      await nft.connect(user1).transferFrom(user1.address, user3.address, 2)
      
      // User1 should have no tokens now
      expect(await nft.highestTier(user1.address)).to.equal(0)
      expect(await nft.balanceOf(user1.address)).to.equal(0)
      
      // User3 should have Silver
      expect(await nft.highestTier(user3.address)).to.equal(2)
    })

    it('Should emit HighestTierUpdated event on mint', async function () {
      await expect(nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') }))
        .to.emit(nft, 'HighestTierUpdated')
        .withArgs(user1.address, 0, 1)
    })

    it('Should emit HighestTierUpdated event on upgrade', async function () {
      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') })
      
      const silverPrice = (await nft.tierConfigs(1)).ethPrice
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      const delta = silverPrice - bronzePrice
      
      await expect(nft.connect(user1).upgradeWithETH(1, { value: delta }))
        .to.emit(nft, 'HighestTierUpdated')
        .withArgs(user1.address, 1, 2)
    })

    it('Should emit FreeMintWhitelistUpdated event', async function () {
      await expect(nft.setFreeMintWhitelist([user1.address], true))
        .to.emit(nft, 'FreeMintWhitelistUpdated')
        .withArgs(user1.address, true)
      
      await expect(nft.setFreeMintWhitelist([user1.address], false))
        .to.emit(nft, 'FreeMintWhitelistUpdated')
        .withArgs(user1.address, false)
    })

    it('Should handle expired tokens in highestTier recalculation', async function () {
      // Configure tier with 2 second duration
      await nft.configureTier(0, ethers.parseEther('0.05'), 0, 0, 1000, 2, '', false, true)
      
      // Mint pass
      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') })
      expect(await nft.highestTier(user1.address)).to.equal(1)
      
      // Wait for expiry
      await ethers.provider.send('evm_increaseTime', [3])
      await ethers.provider.send('evm_mine')
      
      // Trigger recalculation by minting another token
      await nft.configureTier(1, ethers.parseEther('0.15'), 0, 0, 1000, 365 * 24 * 3600, '', false, true)
      await nft.connect(user1).mintWithETH(1, { value: ethers.parseEther('0.15') })
      
      // highestTier should be Silver (tier 1 + 1 = 2), not counting expired Bronze
      expect(await nft.highestTier(user1.address)).to.equal(2)
    })

    it('Should prevent upgrade to disabled tier', async function () {
      // Mint Bronze
      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') })
      
      // Disable Silver tier
      const silverConfig = await nft.tierConfigs(1)
      await nft.configureTier(
        1,
        silverConfig.ethPrice,
        silverConfig.dwtPrice,
        silverConfig.dwtHoldRequirement,
        silverConfig.maxSupply,
        silverConfig.durationSeconds,
        silverConfig.baseURI,
        silverConfig.soulbound,
        false // disabled
      )
      
      // Try to upgrade to disabled Silver tier
      await expect(nft.connect(user1).upgradeWithETH(1, { value: ethers.parseEther('0.1') }))
        .to.be.revertedWithCustomError(nft, 'TierNotEnabled')
    })
  })
})
