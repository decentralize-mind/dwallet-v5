const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('FlashLoan', function () {
  let flashLoan, layer7Security, mockToken;
  let owner, guardian, user, attacker;
  
  const LAYER_ID = ethers.keccak256(ethers.toUtf8Bytes("LAYER_5_FLASHLOAN"));
  
  beforeEach(async function () {
    [owner, guardian, user, attacker] = await ethers.getSigners();
    
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
    
    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory('MockERC20');
    mockToken = await MockToken.deploy('Mock Token', 'MOCK', 18);
    await mockToken.waitForDeployment();
    
    // Deploy FlashLoan
    const FlashLoan = await ethers.getContractFactory('FlashLoan');
    flashLoan = await FlashLoan.deploy(
      owner.address,
      guardian.address,
      await layer7Security.getAddress()
    );
    await flashLoan.waitForDeployment();
    
    // Add token support
    await flashLoan.addToken(await mockToken.getAddress(), 9); // 0.09% fee
    
    // Fund flash loan pool
    await mockToken.mint(await flashLoan.getAddress(), ethers.parseEther('10000'));
  });
  
  describe('Deployment', function () {
    it('Should set correct admin and guardian', async function () {
      expect(await flashLoan.hasRole(await flashLoan.ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await flashLoan.hasRole(await flashLoan.GUARDIAN_ROLE(), guardian.address)).to.be.true;
    });
    
    it('Should set default fee', async function () {
      expect(await flashLoan.flashLoanFees(ethers.ZeroAddress)).to.equal(9);
    });
    
    it('Should support added tokens', async function () {
      expect(await flashLoan.isTokenSupported(await mockToken.getAddress())).to.be.true;
    });
  });
  
  describe('Flash Loan Execution', function () {
    it('Should execute flash loan successfully', async function () {
      const amount = ethers.parseEther('100');
      const fee = (amount * 9n) / 10000n;
      
      // Deploy mock receiver
      const MockReceiver = await ethers.getContractFactory('MockFlashLoanReceiver');
      const receiver = await MockReceiver.deploy(await flashLoan.getAddress(), await mockToken.getAddress());
      await receiver.waitForDeployment();
      
      // Fund receiver with fee
      await mockToken.mint(await receiver.getAddress(), fee);
      
      await expect(
        receiver.executeFlashLoan(amount)
      ).to.emit(flashLoan, 'FlashLoanExecuted');
    });
    
    it('Should reject zero amount', async function () {
      await expect(flashLoan.flashLoan(await mockToken.getAddress(), 0, '0x'))
        .to.be.revertedWithCustomError(flashLoan, 'ZeroAmount');
    });
    
    it('Should reject unsupported token', async function () {
      const unsupportedToken = await ethers.deployContract('MockERC20', ['Unsupported', 'UNS', 18]);
      await expect(flashLoan.flashLoan(await unsupportedToken.getAddress(), 100, '0x'))
        .to.be.revertedWithCustomError(flashLoan, 'TokenNotSupported');
    });
    
    it('Should enforce 50% max loan limit', async function () {
      const poolBalance = await mockToken.balanceOf(await flashLoan.getAddress());
      const maxLoan = (poolBalance * 5000n) / 10000n;
      
      const MockReceiver = await ethers.getContractFactory('MockFlashLoanReceiver');
      const receiver = await MockReceiver.deploy(await flashLoan.getAddress(), await mockToken.getAddress());
      await receiver.waitForDeployment();
      
      // Try to borrow more than 50%
      await mockToken.mint(await receiver.getAddress(), ethers.parseEther('1000')); // Extra for fee
      
      await expect(
        receiver.executeFlashLoan(maxLoan + 1n)
      ).to.be.revertedWithCustomError(flashLoan, 'ExceedsMaxLoanAmount');
    });
    
    it('Should reject if callback fails', async function () {
      const amount = ethers.parseEther('100');
      
      // Deploy malicious receiver that doesn't repay
      const MaliciousReceiver = await ethers.getContractFactory('MaliciousFlashLoanReceiver');
      const receiver = await MaliciousReceiver.deploy(await flashLoan.getAddress());
      await receiver.waitForDeployment();
      
      await expect(
        receiver.executeMaliciousLoan(await mockToken.getAddress(), amount)
      ).to.be.reverted;
    });
  });
  
  describe('Fee Management', function () {
    it('Should calculate correct fee', async function () {
      const amount = ethers.parseEther('1000');
      const fee = await flashLoan.getFlashLoanFee(await mockToken.getAddress(), amount);
      const expectedFee = (amount * 9n) / 10000n;
      
      expect(fee).to.equal(expectedFee);
    });
    
    it('Should update fee for token', async function () {
      await expect(flashLoan.updateFee(await mockToken.getAddress(), 15))
        .to.emit(flashLoan, 'FeeUpdated');
      
      expect(await flashLoan.flashLoanFees(await mockToken.getAddress())).to.equal(15);
    });
    
    it('Should allow admin to withdraw fees', async function () {
      // Execute a loan to generate fees
      const amount = ethers.parseEther('1000');
      const fee = (amount * 9n) / 10000n;
      
      const MockReceiver = await ethers.getContractFactory('MockFlashLoanReceiver');
      const receiver = await MockReceiver.deploy(await flashLoan.getAddress(), await mockToken.getAddress());
      await receiver.waitForDeployment();
      
      await mockToken.mint(await receiver.getAddress(), fee);
      await receiver.executeFlashLoan(amount);
      
      // Withdraw fees
      const balanceBefore = await mockToken.balanceOf(owner.address);
      await flashLoan.withdrawFees(await mockToken.getAddress(), owner.address);
      const balanceAfter = await mockToken.balanceOf(owner.address);
      
      expect(balanceAfter - balanceBefore).to.be.greaterThan(0);
    });
  });
  
  describe('Emergency Functions', function () {
    it('Should allow guardian to halt', async function () {
      await expect(flashLoan.connect(guardian).guardianHalt())
        .to.not.be.reverted;
      
      // Should be paused
      await expect(flashLoan.flashLoan(await mockToken.getAddress(), 100, '0x'))
        .to.be.reverted; // Paused
    });
    
    it('Should allow admin to resume', async function () {
      await flashLoan.connect(guardian).guardianHalt();
      await flashLoan.connect(owner).adminResume();
      
      // Should work again
      const MockReceiver = await ethers.getContractFactory('MockFlashLoanReceiver');
      const receiver = await MockReceiver.deploy(await flashLoan.getAddress(), await mockToken.getAddress());
      await receiver.waitForDeployment();
      
      const fee = (ethers.parseEther('100') * 9n) / 10000n;
      await mockToken.mint(await receiver.getAddress(), fee);
      
      await expect(receiver.executeFlashLoan(ethers.parseEther('100'))).to.not.be.reverted;
    });
    
    it('Should allow emergency withdrawal', async function () {
      const amount = ethers.parseEther('100');
      const balanceBefore = await mockToken.balanceOf(owner.address);
      
      await flashLoan.emergencyWithdraw(await mockToken.getAddress(), amount, owner.address);
      
      const balanceAfter = await mockToken.balanceOf(owner.address);
      expect(balanceAfter - balanceBefore).to.equal(amount);
    });
  });
  
  describe('Token Management', function () {
    it('Should add new token', async function () {
      const newToken = await ethers.deployContract('MockERC20', ['New Token', 'NEW', 18]);
      
      await expect(flashLoan.addToken(await newToken.getAddress(), 12))
        .to.emit(flashLoan, 'TokenAdded');
      
      expect(await flashLoan.isTokenSupported(await newToken.getAddress())).to.be.true;
    });
    
    it('Should remove token', async function () {
      await expect(flashLoan.removeToken(await mockToken.getAddress()))
        .to.emit(flashLoan, 'TokenRemoved');
      
      expect(await flashLoan.isTokenSupported(await mockToken.getAddress())).to.be.false;
    });
    
    it('Should only allow admin to manage tokens', async function () {
      await expect(flashLoan.connect(user).addToken(await mockToken.getAddress(), 10))
        .to.be.reverted;
    });
  });
  
  describe('View Functions', function () {
    it('Should return max flash loan amount', async function () {
      const balance = await mockToken.balanceOf(await flashLoan.getAddress());
      const expected = (balance * 5000n) / 10000n;
      
      expect(await flashLoan.getMaxFlashLoan(await mockToken.getAddress())).to.equal(expected);
    });
    
    it('Should track statistics', async function () {
      const amount = ethers.parseEther('100');
      const fee = (amount * 9n) / 10000n;
      
      const MockReceiver = await ethers.getContractFactory('MockFlashLoanReceiver');
      const receiver = await MockReceiver.deploy(await flashLoan.getAddress(), await mockToken.getAddress());
      await receiver.waitForDeployment();
      
      await mockToken.mint(await receiver.getAddress(), fee);
      await receiver.executeFlashLoan(amount);
      
      const stats = await flashLoan.tokenStats(await mockToken.getAddress());
      expect(stats.totalLoans).to.equal(1);
      expect(stats.totalVolume).to.equal(amount);
    });
  });
});
