/**
 * 🔐 LAYER 0-10 COMPREHENSIVE BACKEND API
 * 
 * Complete API for reading and controlling all smart contract layers
 * - View layer status
 * - Read contract state
 * - Execute admin functions
 * - Monitor health
 * - Emergency controls
 */

const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Layer contract ABIs and addresses (import from deployment files)
const LAYER_CONTRACTS = {
  layer0: {
    registry: process.env.LAYER0_REGISTRY_ADDRESS,
    networkConfig: process.env.LAYER0_NETWORK_CONFIG_ADDRESS
  },
  layer1: {
    dwtToken: process.env.LAYER1_DWT_TOKEN_ADDRESS || '0x3400b0167dA5b2dba0b88b9604eE7df4BFc1f1fa',
    governor: process.env.LAYER1_GOVERNOR_ADDRESS || '0xD1779aD62De0bEeD47Fe60d481593BF5EA0f1c21',
    timelock: process.env.LAYER1_TIMELOCK_ADDRESS || '0x1A8AEe3E1B69959DCfF9E4A0bd0757e8451a49c4',
    treasury: process.env.LAYER1_TREASURY_ADDRESS
  },
  layer2: {
    dexFactory: process.env.LAYER2_DEX_FACTORY,
    swapRouter: process.env.LAYER2_SWAP_ROUTER,
    liquidityPool: process.env.LAYER2_LIQUIDITY_POOL
  },
  layer3: {
    oracle: process.env.LAYER3_ORACLE,
    bridge: process.env.LAYER3_BRIDGE,
    emergencyPause: process.env.LAYER3_EMERGENCY_PAUSE
  },
  layer4: {
    staking: process.env.LAYER4_STAKING,
    rewardDistributor: process.env.LAYER4_REWARD_DISTRIBUTOR
  },
  layer5: {
    crossChain: process.env.LAYER5_CROSS_CHAIN,
    flashLoan: process.env.LAYER5_FLASH_LOAN,
    insurance: process.env.LAYER5_INSURANCE
  },
  layer6: {
    treasury: process.env.LAYER6_TREASURY,
    feeSplitter: process.env.LAYER6_FEE_SPLITTER,
    vesting: process.env.LAYER6_VESTING
  },
  layer7: {
    security: process.env.LAYER7_SECURITY || '0x813b537A21bF5AC6967E870db47Ec2770651B11F',
    lockEngine: process.env.LAYER7_LOCK_ENGINE || '0x059327A069Ba66A74ecF21fde8c1c0D2915e0DB3',
    accessController: process.env.LAYER7_ACCESS_CONTROLLER || '0xD2211242548115134607638E19ADb3271B31506b'
  },
  layer8: {
    bridge: process.env.LAYER8_BRIDGE,
    relayerManager: process.env.LAYER8_RELAYER_MANAGER
  },
  layer9: {
    lending: process.env.LAYER9_LENDING || '0xcbBc5E87BDdbD6A1346FD635efDB23C0cB944794',
    nftMembership: process.env.LAYER9_NFT_MEMBERSHIP || '0x74297Fa47E6103148D3A4119d7B00C6a94B927D7',
    swapRouter: process.env.LAYER9_SWAP_ROUTER || '0x2a4b239C15f54218a30116c630a32d9305859a43',
    feeRouter: process.env.LAYER9_FEE_ROUTER || '0x6552d7c4628e9e71c2E3cBEaB9f17CF67Bee1D89',
    stablecoin: process.env.LAYER9_STABLECOIN || '0x83852A1C0A6C13fa8aCD950e51A2A594A7D7Ec29'
  },
  layer10: {
    options: process.env.LAYER10_OPTIONS,
    perpetuals: process.env.LAYER10_PERPETUALS,
    predictionMarket: process.env.LAYER10_PREDICTION_MARKET
  }
};

// Minimal ABIs for reading layer status
const MINIMAL_ABIS = {
  // Common functions across contracts
  owner: ["function owner() view returns (address)"],
  pausable: ["function paused() view returns (bool)", "function pause()", "function unpause()"],
  token: [
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ],
  staking: [
    "function totalStaked() view returns (uint256)",
    "function getStake(address) view returns (uint256 amount, uint256 timestamp)",
    "function rewardRate() view returns (uint256)"
  ],
  lending: [
    "function totalDeposits() view returns (uint256)",
    "function totalBorrowed() view returns (uint256)",
    "function getPosition(address) view returns (uint256 collateral, uint256 debt, uint256 healthFactor)"
  ],
  governance: [
    "function proposalCount() view returns (uint256)",
    "function state(uint256) view returns (uint8)",
    "function quorumVotes() view returns (uint256)"
  ]
};

// Provider setup
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://sepolia.base.org');

// Only initialize wallet if private key is valid
let adminWallet = null;
try {
  if (process.env.ADMIN_PRIVATE_KEY && process.env.ADMIN_PRIVATE_KEY.length === 66) {
    adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
  } else {
    console.warn('⚠️  ADMIN_PRIVATE_KEY not set or invalid. Layer write operations disabled.');
  }
} catch (error) {
  console.warn('⚠️  Failed to initialize admin wallet:', error.message);
}

/**
 * Get layer status overview
 */
async function getLayerStatus(layerId) {
  try {
    const layerContracts = LAYER_CONTRACTS[`layer${layerId}`];
    if (!layerContracts) {
      return { error: 'Layer not found', layerId };
    }

    const status = {
      layer: layerId,
      contracts: {},
      overallStatus: 'unknown'
    };

    // Check each contract in the layer
    for (const [contractName, address] of Object.entries(layerContracts)) {
      if (!address) {
        status.contracts[contractName] = { deployed: false };
        continue;
      }

      try {
        // Check if contract exists
        const code = await provider.getCode(address);
        const isDeployed = code !== '0x';

        status.contracts[contractName] = {
          deployed: isDeployed,
          address,
          hasCode: code.length > 2
        };

        // Try to read common state
        if (isDeployed) {
          try {
            const contract = new ethers.Contract(address, MINIMAL_ABIS.owner, provider);
            const owner = await contract.owner();
            status.contracts[contractName].owner = owner;
          } catch (e) {
            // Contract doesn't have owner function
          }
        }
      } catch (error) {
        status.contracts[contractName] = {
          deployed: false,
          error: error.message
        };
      }
    }

    // Determine overall status
    const deployedCount = Object.values(status.contracts).filter(c => c.deployed).length;
    const totalCount = Object.keys(status.contracts).length;

    if (deployedCount === 0) {
      status.overallStatus = 'not_deployed';
    } else if (deployedCount < totalCount) {
      status.overallStatus = 'partial';
    } else {
      status.overallStatus = 'fully_deployed';
    }

    status.deployedCount = deployedCount;
    status.totalCount = totalCount;

    return status;
  } catch (error) {
    return { error: error.message, layerId };
  }
}

/**
 * Get all layers status
 */
async function getAllLayersStatus() {
  const layers = [];
  
  for (let i = 0; i <= 10; i++) {
    const status = await getLayerStatus(i);
    layers.push(status);
  }

  return {
    layers,
    summary: {
      total: 11,
      fullyDeployed: layers.filter(l => l.overallStatus === 'fully_deployed').length,
      partial: layers.filter(l => l.overallStatus === 'partial').length,
      notDeployed: layers.filter(l => l.overallStatus === 'not_deployed').length
    }
  };
}

/**
 * Read contract state (generic)
 */
async function readContractState(layerId, contractName, functionName, params = []) {
  try {
    const address = LAYER_CONTRACTS[`layer${layerId}`]?.[contractName];
    if (!address) {
      return { error: 'Contract not found' };
    }

    // Determine ABI based on function
    let abi = [];
    if (MINIMAL_ABIS.token.find(sig => sig.includes(functionName))) {
      abi = MINIMAL_ABIS.token;
    } else if (MINIMAL_ABIS.staking.find(sig => sig.includes(functionName))) {
      abi = MINIMAL_ABIS.staking;
    } else if (MINIMAL_ABIS.lending.find(sig => sig.includes(functionName))) {
      abi = MINIMAL_ABIS.lending;
    } else if (MINIMAL_ABIS.governance.find(sig => sig.includes(functionName))) {
      abi = MINIMAL_ABIS.governance;
    } else {
      return { error: 'Function not in minimal ABI. Add it to MINIMAL_ABIS.' };
    }

    const contract = new ethers.Contract(address, abi, provider);
    const result = await contract[functionName](...params);

    return {
      success: true,
      layer: layerId,
      contract: contractName,
      function: functionName,
      result: result.toString()
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Execute admin function (requires signature)
 */
async function executeAdminFunction(layerId, contractName, functionName, params = [], reason = '') {
  try {
    if (!adminWallet) {
      return { error: 'Admin wallet not configured. Set ADMIN_PRIVATE_KEY in .env' };
    }
    
    const address = LAYER_CONTRACTS[`layer${layerId}`]?.[contractName];
    if (!address) {
      return { error: 'Contract not found' };
    }

    // Use pausable ABI for pause/unpause
    let abi = MINIMAL_ABIS.pausable;
    
    const contract = new ethers.Contract(address, abi, adminWallet);
    const tx = await contract[functionName](...params);
    const receipt = await tx.wait();

    return {
      success: true,
      layer: layerId,
      contract: contractName,
      function: functionName,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Emergency pause layer
 */
async function emergencyPauseLayer(layerId, reason) {
  const layerContracts = LAYER_CONTRACTS[`layer${layerId}`];
  if (!layerContracts) {
    return { error: 'Layer not found' };
  }

  const results = [];
  
  for (const [contractName, address] of Object.entries(layerContracts)) {
    if (!address) continue;

    try {
      const result = await executeAdminFunction(layerId, contractName, 'pause', [], reason);
      results.push({ contract: contractName, ...result });
    } catch (error) {
      results.push({ contract: contractName, error: error.message });
    }
  }

  return {
    layer: layerId,
    action: 'emergency_pause',
    reason,
    results,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getLayerStatus,
  getAllLayersStatus,
  readContractState,
  executeAdminFunction,
  emergencyPauseLayer,
  LAYER_CONTRACTS
};
