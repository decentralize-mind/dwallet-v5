require("@nomicfoundation/hardhat-toolbox");

/**
 * @title Hardhat Config for Security Core Contracts Only
 * @notice This config excludes problematic old contracts for standalone testing
 */

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: {
        count: 10,
        accountsBalance: "1000000000000000000000000" // 1M ETH each
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  paths: {
    sources: "./contracts-security",
    tests: "./test/attacks",
    cache: "./cache-security",
    artifacts: "./artifacts-security"
  }
};
