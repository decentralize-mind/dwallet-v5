require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun"
    }
  },
  networks: {
    baseSepolia: {
      url: 'https://sepolia.base.org',
      accounts: [process.env.DEPLOYER_PRIVATE_KEY || `0x[REMOVED_USE_ENV_VARIABLE]`],
      chainId: 84532,
    }
  }
};
