const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('NFTMembership - Comprehensive Tests', function () {
  let nft, dwtToken, security
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

  describe('Deployment & Configuration', function () {
    it('Should deploy with correct name and symbol', async function () {
      expect(await nft.name()).to.equal("DWT Membership Pass")
      expect(await nft.symbol()).to.equal("DWTPASS")
    })

    it('Should initialize with 4 tiers configured', async function () {
      for (let tier = 0; tier < 4; tier++) {
        const config = await nft.tierConfigs(tier)
        expect(config.enabled).to.be.true
        expect(config.ethPrice).to.be.gt(0)
      }
    })

    it('Should set correct default tier prices', async function () {
      const bronze = await nft.tierConfigs(0)
      const silver = await nft.tierConfigs(1)
      const gold = await nft.tierConfigs(2)
      const platinum = await nft.tierConfigs(3)

      expect(bronze.ethPrice).to.equal(ethers.parseEther('0.05'))
      expect(silver.ethPrice).to.equal(ethers.parseEther('0.15'))
      expect(gold.ethPrice).to.equal(ethers.parseEther('0.50'))
      expect(platinum.ethPrice).to.equal(ethers.parseEther('1.50'))
    })
  })

  describe('Minting with ETH', function () {
    it('Should allow minting Bronze tier with ETH', async function () {
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      
      const tx = await nft.connect(user1).mintWithETH(0, { value: bronzePrice })
      const receipt = await tx.wait()
      const block = await ethers.provider.getBlock(receipt.blockNumber)
      
      await expect(tx)
        .to.emit(nft, 'PassMinted')
        .withArgs(user1.address, 1, 0, block.timestamp + 365 * 24 * 3600)

      expect(await nft.balanceOf(user1.address)).to.equal(1)
      expect(await nft.ownerOf(1)).to.equal(user1.address)
    })

    it('Should allow minting Platinum tier with ETH', async function () {
      const platinumPrice = (await nft.tierConfigs(3)).ethPrice
      
      await nft.connect(user1).mintWithETH(3, { value: platinumPrice })
      
      const tokenData = await nft.tokenData(1)
      expect(tokenData.tier).to.equal(3)
      expect(await nft.highestTier(user1.address)).to.equal(4) // tier 3 + 1
    })

    it('Should revert if ETH payment is insufficient', async function () {
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      const insufficientAmount = bronzePrice - ethers.parseEther('0.01')

      await expect(nft.connect(user1).mintWithETH(0, { value: insufficientAmount }))
        .to.be.revertedWithCustomError(nft, 'InsufficientPayment')
    })

    it('Should revert if tier is invalid', async function () {
      await expect(nft.connect(user1).mintWithETH(5, { value: ethers.parseEther('1') }))
        .to.be.revertedWithCustomError(nft, 'InvalidTier')
    })

    it('Should allow whitelisted users to mint for free', async function () {
      await nft.setFreeMintWhitelist([user1.address], true)
      
      // Should succeed with 0 ETH
      await nft.connect(user1).mintWithETH(0, { value: 0 })
      
      expect(await nft.balanceOf(user1.address)).to.equal(1)
    })
  })

  describe('Minting with DWT', function () {
    it('Should allow minting with DWT tokens', async function () {
      const bronzePrice = (await nft.tierConfigs(0)).dwtPrice
      
      await dwtToken.connect(user1).approve(await nft.getAddress(), bronzePrice)
      await nft.connect(user1).mintWithDWT(0)
      
      expect(await nft.balanceOf(user1.address)).to.equal(1)
      
      // Verify DWT was transferred
      expect(await dwtToken.balanceOf(await nft.getAddress())).to.equal(bronzePrice)
    })

    it('Should revert if DWT tier price is zero', async function () {
      // Configure tier 0 to be ETH-only (dwtPrice = 0)
      const config = await nft.tierConfigs(0)
      await nft.configureTier(
        0,
        config.ethPrice,
        0, // dwtPrice
        config.dwtHoldRequirement,
        config.maxSupply,
        config.durationSeconds,
        config.baseURI,
        config.soulbound,
        config.enabled
      )

      await expect(nft.connect(user1).mintWithDWT(0))
        .to.be.revertedWithCustomError(nft, 'InsufficientPayment')
    })

    it('Should revert if user has insufficient DWT', async function () {
      // Transfer DWT away from user1
      const balance = await dwtToken.balanceOf(user1.address)
      await dwtToken.connect(user1).transfer(user2.address, balance)

      await expect(nft.connect(user1).mintWithDWT(0))
        .to.be.reverted
    })
  })

  describe('Admin Minting', function () {
    it('Should allow owner to admin mint', async function () {
      await nft.adminMint(user1.address, 2) // Gold tier
      
      expect(await nft.balanceOf(user1.address)).to.equal(1)
      expect(await nft.ownerOf(1)).to.equal(user1.address)
    })

    it('Should revert if non-owner tries to admin mint', async function () {
      await expect(nft.connect(user1).adminMint(user2.address, 0))
        .to.be.reverted
    })

    it('Should revert if minting to zero address', async function () {
      await expect(nft.adminMint(ethers.ZeroAddress, 0))
        .to.be.revertedWithCustomError(nft, 'ZeroAddress')
    })
  })

  describe('Tier Upgrades', function () {
    beforeEach(async function () {
      // Mint Bronze tier first
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      await nft.connect(user1).mintWithETH(0, { value: bronzePrice })
    })

    it('Should allow upgrading from Bronze to Silver', async function () {
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      const silverPrice = (await nft.tierConfigs(1)).ethPrice
      const delta = silverPrice - bronzePrice

      await expect(nft.connect(user1).upgradeWithETH(1, { value: delta }))
        .to.emit(nft, 'PassUpgraded')
        .withArgs(1, 0, 1)

      const tokenData = await nft.tokenData(1)
      expect(tokenData.tier).to.equal(1)
    })

    it('Should revert if upgrade payment is insufficient', async function () {
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      const silverPrice = (await nft.tierConfigs(1)).ethPrice
      const delta = silverPrice - bronzePrice
      const insufficientAmount = delta - ethers.parseEther('0.01')

      await expect(nft.connect(user1).upgradeWithETH(1, { value: insufficientAmount }))
        .to.be.revertedWithCustomError(nft, 'InsufficientPayment')
    })

    it('Should revert if upgrading max tier', async function () {
      // Mint Platinum (tier 3)
      await nft.connect(user2).mintWithETH(3, { value: ethers.parseEther('1.50') })

      await expect(nft.connect(user2).upgradeWithETH(2, { value: ethers.parseEther('1') }))
        .to.be.revertedWithCustomError(nft, 'InvalidTier')
    })

    it('Should revert if user does not own token', async function () {
      await expect(nft.connect(user2).upgradeWithETH(1, { value: ethers.parseEther('0.1') }))
        .to.be.reverted
    })
  })

  describe('Renewal & Expiry', function () {
    it('Should allow renewing an expiring pass', async function () {
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      await nft.connect(user1).mintWithETH(0, { value: bronzePrice })
      
      const originalExpiry = (await nft.tokenData(1)).expiry
      
      // Renew
      await nft.connect(user1).renewWithETH(1, { value: bronzePrice })
      const newExpiry = (await nft.tokenData(1)).expiry
      
      expect(newExpiry).to.be.gt(originalExpiry)
    })

    it('Should revert if renewal payment is insufficient', async function () {
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      await nft.connect(user1).mintWithETH(0, { value: bronzePrice })
      
      const insufficientAmount = bronzePrice - ethers.parseEther('0.01')
      
      await expect(nft.connect(user1).renewWithETH(1, { value: insufficientAmount }))
        .to.be.revertedWithCustomError(nft, 'InsufficientPayment')
    })
  })

  describe('Access Control', function () {
    it('Should return true if user has required tier', async function () {
      await nft.connect(user1).mintWithETH(2, { value: ethers.parseEther('0.50') }) // Gold
      
      expect(await nft.hasAccess(user1.address, 2)).to.be.true // Gold
      expect(await nft.hasAccess(user1.address, 1)).to.be.true // Silver (lower)
      expect(await nft.hasAccess(user1.address, 0)).to.be.true // Bronze (lower)
    })

    it('Should return false if user has insufficient tier', async function () {
      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') }) // Bronze
      
      expect(await nft.hasAccess(user1.address, 1)).to.be.false // Silver (higher)
      expect(await nft.hasAccess(user1.address, 2)).to.be.false // Gold (higher)
    })

    it('Should validate DWT holding requirement', async function () {
      const silverConfig = await nft.tierConfigs(1)
      const dwtRequired = silverConfig.dwtHoldRequirement

      // Mint Silver tier
      await nft.connect(user1).mintWithETH(1, { value: silverConfig.ethPrice })
      
      // Transfer DWT away
      await dwtToken.connect(user1).transfer(user2.address, await dwtToken.balanceOf(user1.address))

      // Should fail DWT requirement check
      expect(await nft.hasAccess(user1.address, 1)).to.be.false

      // Restore DWT balance
      await dwtToken.connect(user2).transfer(user1.address, dwtRequired)
      expect(await nft.hasAccess(user1.address, 1)).to.be.true
    })

    it('Should return false for expired passes', async function () {
      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') })
      
      // Manually set expiry to past (via admin config with 1 second duration)
      await nft.configureTier(0, ethers.parseEther('0.05'), 0, 0, 1000, 1, '', false, true)
      await nft.connect(user2).mintWithETH(0, { value: ethers.parseEther('0.05') })
      
      // Wait for expiry
      await ethers.provider.send('evm_increaseTime', [2])
      await ethers.provider.send('evm_mine')

      expect(await nft.hasAccess(user2.address, 0)).to.be.false
    })
  })

  describe('Soulbound (Non-Transferable)', function () {
    it('Should allow transferring non-soulbound tokens', async function () {
      // Configure tier 0 as non-soulbound (already default)
      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') })
      
      await expect(nft.connect(user1).transferFrom(user1.address, user2.address, 1))
        .to.not.be.reverted
      
      expect(await nft.ownerOf(1)).to.equal(user2.address)
    })

    it('Should block transferring soulbound tokens', async function () {
      // Configure tier 0 as soulbound
      const config = await nft.tierConfigs(0)
      await nft.configureTier(
        0,
        config.ethPrice,
        config.dwtPrice,
        config.dwtHoldRequirement,
        config.maxSupply,
        config.durationSeconds,
        config.baseURI,
        true, // soulbound
        config.enabled
      )

      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') })
      
      await expect(nft.connect(user1).transferFrom(user1.address, user2.address, 1))
        .to.be.revertedWithCustomError(nft, 'Soulbound')
    })
  })

  describe('Tier Supply Caps', function () {
    it('Should enforce max supply per tier', async function () {
      // Configure tier 0 with max supply of 2
      const config = await nft.tierConfigs(0)
      await nft.configureTier(
        0,
        config.ethPrice,
        config.dwtPrice,
        config.dwtHoldRequirement,
        2, // maxSupply
        config.durationSeconds,
        config.baseURI,
        config.soulbound,
        config.enabled
      )

      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') })
      await nft.connect(user2).mintWithETH(0, { value: ethers.parseEther('0.05') })
      
      await expect(nft.connect(user3).mintWithETH(0, { value: ethers.parseEther('0.05') }))
        .to.be.revertedWithCustomError(nft, 'TierCapReached')
    })
  })

  describe('Withdrawals', function () {
    beforeEach(async function () {
      // Mint some passes to accumulate ETH and DWT in contract
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      await nft.connect(user1).mintWithETH(0, { value: bronzePrice })
      
      await dwtToken.connect(user2).approve(await nft.getAddress(), ethers.parseEther('1000'))
      await nft.connect(user2).mintWithDWT(0)
    })

    it('Should allow owner to withdraw ETH', async function () {
      const balanceBefore = await ethers.provider.getBalance(owner.address)
      
      const tx = await nft.withdrawETH(owner.address)
      const receipt = await tx.wait()
      const gasUsed = receipt.gasUsed * receipt.gasPrice
      
      const balanceAfter = await ethers.provider.getBalance(owner.address)
      expect(balanceAfter).to.be.gt(balanceBefore - gasUsed)
    })

    it('Should allow owner to withdraw DWT', async function () {
      const dwtBalance = await dwtToken.balanceOf(await nft.getAddress())
      
      await nft.withdrawDWT(owner.address, dwtBalance)
      
      expect(await dwtToken.balanceOf(await nft.getAddress())).to.equal(0)
      expect(await dwtToken.balanceOf(owner.address)).to.equal(dwtBalance)
    })

    it('Should revert if non-owner tries to withdraw', async function () {
      await expect(nft.connect(user1).withdrawETH(user1.address))
        .to.be.reverted
    })
  })

  describe('Pause & Security', function () {
    it('Should allow owner to pause contract', async function () {
      await nft.pause()
      
      await expect(nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') }))
        .to.be.reverted
    })

    it('Should allow owner to unpause contract', async function () {
      await nft.pause()
      await nft.unpause()
      
      const bronzePrice = (await nft.tierConfigs(0)).ethPrice
      await expect(nft.connect(user1).mintWithETH(0, { value: bronzePrice }))
        .to.not.be.reverted
    })

    it('Should allow owner to configure tiers when paused', async function () {
      await nft.pause()
      
      // Should still be able to configure
      const config = await nft.tierConfigs(0)
      await expect(nft.configureTier(0, config.ethPrice, config.dwtPrice, 0, config.maxSupply, config.durationSeconds, '', false, true))
        .to.not.be.reverted
    })
  })

  describe('Active Tier Query', function () {
    it('Should return highest active tier', async function () {
      await nft.connect(user1).mintWithETH(0, { value: ethers.parseEther('0.05') }) // Bronze
      
      // Wait for cooldown to expire
      await ethers.provider.send('evm_increaseTime', [3600]) // 1 hour
      await ethers.provider.send('evm_mine')
      
      await nft.connect(user1).mintWithETH(2, { value: ethers.parseEther('0.50') }) // Gold
      
      expect(await nft.activeTier(user1.address)).to.equal(2) // Gold
    })

    it('Should return 255 if user has no passes', async function () {
      expect(await nft.activeTier(user1.address)).to.equal(255)
    })
  })
})
