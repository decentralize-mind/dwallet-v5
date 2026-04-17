const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CrossChainMessenger', function () {
  let messenger, layer7Security;
  let owner, operator, guardian, user, attacker;
  
  const LAYER_ID = ethers.keccak256(ethers.toUtf8Bytes("LAYER_5_MESSENGER"));
  
  beforeEach(async function () {
    [owner, operator, guardian, user, attacker] = await ethers.getSigners();
    
    // Deploy mock Layer7Security
    const Layer7Security = await ethers.getContractFactory('Layer7Security');
    layer7Security = await Layer7Security.deploy(
      [owner.address],
      1,
      100,
      ethers.parseEther('100'),
      0
    );
    await layer7Security.waitForDeployment();
    const layer7Address = await layer7Security.getAddress();
    
    // Deploy CrossChainMessenger
    const CrossChainMessenger = await ethers.getContractFactory('CrossChainMessenger');
    messenger = await CrossChainMessenger.deploy(
      owner.address,
      operator.address,
      guardian.address,
      layer7Address,
      "LayerZero"
    );
    await messenger.waitForDeployment();
  });
  
  describe('Deployment', function () {
    it('Should set the correct admin', async function () {
      expect(await messenger.hasRole(await messenger.ADMIN_ROLE(), owner.address)).to.be.true;
    });
    
    it('Should set the correct operator', async function () {
      expect(await messenger.hasRole(await messenger.OPERATOR_ROLE(), operator.address)).to.be.true;
    });
    
    it('Should set the correct guardian', async function () {
      expect(await messenger.hasRole(await messenger.GUARDIAN_ROLE(), guardian.address)).to.be.true;
    });
    
    it('Should set the initial provider', async function () {
      expect(await messenger.activeProvider()).to.equal("LayerZero");
    });
    
    it('Should set default daily cap', async function () {
      expect(await messenger.dailyMessageCaps(0)).to.equal(1000);
    });
  });
  
  describe('Message Sending', function () {
    it('Should send a message successfully', async function () {
      const dstChainId = 1;
      const payload = ethers.toUtf8Bytes("test message");
      
      await expect(messenger.connect(user).sendMessage(dstChainId, payload))
        .to.emit(messenger, 'MessageSent');
    });
    
    it('Should increment nonce for each message', async function () {
      const dstChainId = 1;
      const payload = ethers.toUtf8Bytes("message 1");
      
      await messenger.connect(user).sendMessage(dstChainId, payload);
      expect(await messenger.chainNonces(dstChainId)).to.equal(1);
      
      await messenger.connect(user).sendMessage(dstChainId, payload);
      expect(await messenger.chainNonces(dstChainId)).to.equal(2);
    });
    
    it('Should reject invalid chain ID', async function () {
      const payload = ethers.toUtf8Bytes("test");
      await expect(messenger.sendMessage(0, payload))
        .to.be.revertedWithCustomError(messenger, 'InvalidChainId');
    });
    
    it('Should reject empty payload', async function () {
      await expect(messenger.sendMessage(1, '0x'))
        .to.be.revertedWithCustomError(messenger, 'InvalidPayload');
    });
    
    it('Should enforce daily cap', async function () {
      const dstChainId = 1;
      const payload = ethers.toUtf8Bytes("test");
      
      // Set cap to 2 messages per day
      await messenger.connect(owner).setDailyCap(dstChainId, 2);
      
      await messenger.sendMessage(dstChainId, payload);
      await messenger.sendMessage(dstChainId, payload);
      
      await expect(messenger.sendMessage(dstChainId, payload))
        .to.be.revertedWithCustomError(messenger, 'DailyCapExceeded');
    });
  });
  
  describe('Provider Management', function () {
    it('Should request provider switch', async function () {
      await messenger.connect(owner).addProvider("Axelar");
      
      await expect(messenger.connect(owner).requestProviderSwitch("Axelar"))
        .to.emit(messenger, 'ProviderSwitchRequested');
    });
    
    it('Should not execute provider switch before delay', async function () {
      await messenger.connect(owner).addProvider("Axelar");
      await messenger.connect(owner).requestProviderSwitch("Axelar");
      
      await expect(messenger.connect(owner).executeProviderSwitch("Axelar"))
        .to.be.revertedWithCustomError(messenger, 'ProviderSwitchDelayNotMet');
    });
    
    it('Should execute provider switch after delay', async function () {
      await messenger.connect(owner).addProvider("Axelar");
      await messenger.connect(owner).requestProviderSwitch("Axelar");
      
      // Fast forward 8 days (more than 7 day delay)
      await ethers.provider.send('evm_increaseTime', [8 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');
      
      await expect(messenger.connect(owner).executeProviderSwitch("Axelar"))
        .to.emit(messenger, 'ProviderSwitchExecuted');
      
      expect(await messenger.activeProvider()).to.equal("Axelar");
    });
    
    it('Should only allow admin to add providers', async function () {
      await expect(messenger.connect(user).addProvider("Axelar"))
        .to.be.reverted;
    });
  });
  
  describe('Emergency Functions', function () {
    it('Should allow guardian to halt', async function () {
      await expect(messenger.connect(guardian).guardianHalt())
        .to.emit(messenger, 'GuardianHalt');
      
      // Should be paused
      await expect(messenger.sendMessage(1, ethers.toUtf8Bytes("test")))
        .to.be.reverted; // Paused
    });
    
    it('Should allow admin to resume after halt', async function () {
      await messenger.connect(guardian).guardianHalt();
      
      await expect(messenger.connect(owner).adminResume())
        .to.not.be.reverted;
      
      // Should work again
      await expect(messenger.sendMessage(1, ethers.toUtf8Bytes("test")))
        .to.not.be.reverted;
    });
    
    it('Should not allow non-guardian to halt', async function () {
      await expect(messenger.connect(user).guardianHalt())
        .to.be.reverted;
    });
    
    it('Should not allow non-admin to resume', async function () {
      await messenger.connect(guardian).guardianHalt();
      
      await expect(messenger.connect(user).adminResume())
        .to.be.reverted;
    });
  });
  
  describe('View Functions', function () {
    it('Should return correct nonce', async function () {
      const dstChainId = 1;
      expect(await messenger.getNonce(dstChainId)).to.equal(0);
      
      await messenger.sendMessage(dstChainId, ethers.toUtf8Bytes("test"));
      expect(await messenger.getNonce(dstChainId)).to.equal(1);
    });
    
    it('Should return message details', async function () {
      const dstChainId = 1;
      const payload = ethers.toUtf8Bytes("test message");
      
      const tx = await messenger.sendMessage(dstChainId, payload);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => {
        try {
          const parsed = messenger.interface.parseLog(log);
          return parsed.name === 'MessageSent';
        } catch {
          return false;
        }
      });
      
      const parsed = messenger.interface.parseLog(event);
      const messageId = parsed.args.messageId;
      
      const message = await messenger.getMessage(messageId);
      expect(message.dstChainId).to.equal(dstChainId);
      expect(message.sender).to.equal(await owner.getAddress());
    });
  });
});
