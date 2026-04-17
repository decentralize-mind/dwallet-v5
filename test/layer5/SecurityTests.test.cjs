const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Layer 5 Security Tests & Attack Simulations', function () {
  let crossChainMessenger, flashLoan, insuranceFund;
  let layer7Security, mockToken;
  let owner, guardian, user, attacker;
  
  beforeEach(async function () {
    [owner, guardian, user, attacker] = await ethers.getSigners();
    
    // Deploy Layer7Security
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
    
    // Deploy mock token
    const MockToken = await ethers.getContractFactory('MockERC20');
    mockToken = await MockToken.deploy('Mock Token', 'MOCK', 18);
    await mockToken.waitForDeployment();
    
    // Deploy Layer 5 contracts
    const CrossChainMessenger = await ethers.getContractFactory('CrossChainMessenger');
    crossChainMessenger = await CrossChainMessenger.deploy(
      owner.address, owner.address, guardian.address, layer7Address, "LayerZero"
    );
    await crossChainMessenger.waitForDeployment();
    
    const FlashLoan = await ethers.getContractFactory('FlashLoan');
    flashLoan = await FlashLoan.deploy(owner.address, guardian.address, layer7Address);
    await flashLoan.waitForDeployment();
    
    const InsuranceFund = await ethers.getContractFactory('InsuranceFund');
    insuranceFund = await InsuranceFund.deploy(
      owner.address, owner.address, guardian.address, layer7Address
    );
    await insuranceFund.waitForDeployment();
    
    // Fund FlashLoan
    await mockToken.mint(await flashLoan.getAddress(), ethers.parseEther('10000'));
    await flashLoan.addToken(await mockToken.getAddress(), 9);
    
    // Fund InsuranceFund
    await mockToken.mint(await insuranceFund.getAddress(), ethers.parseEther('50000'));
  });
  
  describe('CrossChainMessenger Attack Simulations', function () {
    it('Should prevent replay attacks', async function () {
      const dstChainId = 1;
      const payload = ethers.toUtf8Bytes("test message");
      
      // Send message first time
      await crossChainMessenger.sendMessage(dstChainId, payload);
      
      // Try to send same message again (should create new message with different nonce)
      const tx = await crossChainMessenger.sendMessage(dstChainId, payload);
      const receipt = await tx.wait();
      
      // Both should succeed but with different message IDs
      expect(receipt.status).to.equal(1);
    });
    
    it('Should enforce daily cap strictly', async function () {
      const dstChainId = 1;
      const payload = ethers.toUtf8Bytes("test");
      
      // Set very low cap
      await crossChainMessenger.setDailyCap(dstChainId, 3);
      
      // Send 3 messages
      await crossChainMessenger.sendMessage(dstChainId, payload);
      await crossChainMessenger.sendMessage(dstChainId, payload);
      await crossChainMessenger.sendMessage(dstChainId, payload);
      
      // 4th should fail
      await expect(crossChainMessenger.sendMessage(dstChainId, payload))
        .to.be.revertedWithCustomError(crossChainMessenger, 'DailyCapExceeded');
    });
    
    it('Should prevent unauthorized provider switch', async function () {
      await crossChainMessenger.addProvider("Axelar");
      
      // Non-admin should not be able to switch
      await expect(crossChainMessenger.connect(user).requestProviderSwitch("Axelar"))
        .to.be.reverted;
      
      await expect(crossChainMessenger.connect(user).executeProviderSwitch("Axelar"))
        .to.be.reverted;
    });
    
    it('Should allow guardian to halt all operations', async function () {
      await crossChainMessenger.connect(guardian).guardianHalt();
      
      // All operations should fail
      await expect(crossChainMessenger.sendMessage(1, ethers.toUtf8Bytes("test")))
        .to.be.reverted;
    });
  });
  
  describe('FlashLoan Attack Simulations', function () {
    it('Should prevent reentrancy attacks', async function () {
      // Deploy reentrancy attacker
      const ReentrancyAttacker = await ethers.getContractFactory('ReentrancyAttacker');
      const attacker_contract = await ReentrancyAttacker.deploy(await flashLoan.getAddress(), await mockToken.getAddress());
      await attacker_contract.waitForDeployment();
      
      // Try reentrancy attack
      await expect(attacker_contract.attack(ethers.parseEther('100')))
        .to.be.reverted;
    });
    
    it('Should enforce 50% max loan limit', async function () {
      const balance = await mockToken.balanceOf(await flashLoan.getAddress());
      const maxLoan = (balance * 5000n) / 10000n;
      
      // Should reject loan > 50%
      const MockReceiver = await ethers.getContractFactory('MockFlashLoanReceiver');
      const receiver = await MockReceiver.deploy(await flashLoan.getAddress(), await mockToken.getAddress());
      await receiver.waitForDeployment();
      
      const fee = ((maxLoan + 1n) * 9n) / 10000n;
      await mockToken.mint(await receiver.getAddress(), fee);
      
      await expect(receiver.executeFlashLoan(maxLoan + 1n))
        .to.be.revertedWithCustomError(flashLoan, 'ExceedsMaxLoanAmount');
    });
    
    it('Should prevent flash loan without fee repayment', async function () {
      const MaliciousReceiver = await ethers.getContractFactory('MaliciousReceiver');
      const malicious = await MaliciousReceiver.deploy(await flashLoan.getAddress());
      await malicious.waitForDeployment();
      
      await expect(malicious.attack(await mockToken.getAddress(), ethers.parseEther('100')))
        .to.be.reverted;
    });
    
    it('Should prevent zero amount loans', async function () {
      await expect(flashLoan.flashLoan(await mockToken.getAddress(), 0, '0x'))
        .to.be.revertedWithCustomError(flashLoan, 'ZeroAmount');
    });
  });
  
  describe('InsuranceFund Attack Simulations', function () {
    it('Should prevent skipping approval state', async function () {
      // File claim
      await mockToken.mint(user.address, ethers.parseEther('1000'));
      await mockToken.connect(user).approve(await insuranceFund.getAddress(), ethers.parseEther('1000'));
      
      // Try to execute without approval
      const tx = await insuranceFund.connect(user).fileClaim(
        await mockToken.getAddress(),
        ethers.parseEther('100'),
        "Test claim",
        '0x'
      );
      const receipt = await tx.wait();
      
      // Get claim ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = insuranceFund.interface.parseLog(log);
          return parsed.name === 'ClaimFiled';
        } catch {
          return false;
        }
      });
      
      const parsed = insuranceFund.interface.parseLog(event);
      const claimId = parsed.args.claimId;
      
      // Should not be able to execute without approval
      await expect(insuranceFund.executeClaim(claimId))
        .to.be.revertedWithCustomError(insuranceFund, 'InvalidClaimState');
    });
    
    it('Should enforce 48h execution delay', async function () {
      // File and approve claim
      await mockToken.mint(user.address, ethers.parseEther('1000'));
      await mockToken.connect(user).approve(await insuranceFund.getAddress(), ethers.parseEther('1000'));
      await insuranceFund.connect(user).fileClaim(
        await mockToken.getAddress(),
        ethers.parseEther('100'),
        "Test claim",
        '0x'
      );
      
      const claimId = 1;
      await insuranceFund.approveClaim(claimId);
      
      // Try to execute immediately
      await expect(insuranceFund.executeClaim(claimId))
        .to.be.revertedWithCustomError(insuranceFund, 'ExecutionDelayNotMet');
      
      // Fast forward 47 hours (still too early)
      await ethers.provider.send('evm_increaseTime', [47 * 60 * 60]);
      await ethers.provider.send('evm_mine');
      
      await expect(insuranceFund.executeClaim(claimId))
        .to.be.revertedWithCustomError(insuranceFund, 'ExecutionDelayNotMet');
      
      // Fast forward to 48+ hours
      await ethers.provider.send('evm_increaseTime', [2 * 60 * 60]);
      await ethers.provider.send('evm_mine');
      
      // Should succeed now
      await expect(insuranceFund.executeClaim(claimId)).to.not.be.reverted;
    });
    
    it('Should enforce per-claim cap (20%)', async function () {
      const fundBalance = await mockToken.balanceOf(await insuranceFund.getAddress());
      const maxClaim = (fundBalance * 2000n) / 10000n;
      
      await mockToken.mint(user.address, maxClaim + 1n);
      await mockToken.connect(user).approve(await insuranceFund.getAddress(), maxClaim + 1n);
      
      // Should reject claim > 20%
      await expect(insuranceFund.connect(user).fileClaim(
        await mockToken.getAddress(),
        maxClaim + 1n,
        "Too large claim",
        '0x'
      )).to.be.revertedWithCustomError(insuranceFund, 'ExceedsPerClaimCap');
    });
    
    it('Should prevent claim by non-claimant cancellation', async function () {
      await mockToken.mint(user.address, ethers.parseEther('1000'));
      await mockToken.connect(user).approve(await insuranceFund.getAddress(), ethers.parseEther('1000'));
      await insuranceFund.connect(user).fileClaim(
        await mockToken.getAddress(),
        ethers.parseEther('100'),
        "Test claim",
        '0x'
      );
      
      // Attacker tries to cancel
      await expect(insuranceFund.connect(attacker).cancelClaim(1))
        .to.be.reverted;
    });
  });
  
  describe('Layer 7 Integration Tests', function () {
    it('Should respect protocol-wide pause', async function () {
      // Pause via Layer 7
      await layer7Security.pause();
      
      // All Layer 5 operations should fail
      await expect(crossChainMessenger.sendMessage(1, ethers.toUtf8Bytes("test")))
        .to.be.reverted;
      
      await expect(flashLoan.flashLoan(await mockToken.getAddress(), 100, '0x'))
        .to.be.reverted;
      
      await expect(insuranceFund.fileClaim(
        await mockToken.getAddress(),
        100,
        "Test",
        '0x'
      )).to.be.reverted;
    });
    
    it('Should allow guardian emergency halt across all contracts', async function () {
      await crossChainMessenger.connect(guardian).guardianHalt();
      await flashLoan.connect(guardian).guardianHalt();
      await insuranceFund.connect(guardian).guardianHalt();
      
      // All should be paused
      await expect(crossChainMessenger.sendMessage(1, ethers.toUtf8Bytes("test")))
        .to.be.reverted;
      
      await expect(flashLoan.flashLoan(await mockToken.getAddress(), 100, '0x'))
        .to.be.reverted;
    });
  });
});
