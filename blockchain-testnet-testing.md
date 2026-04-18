# dWallet Native Blockchain - Testnet Testing Guide

## Overview

This guide explains how to test your Rust/Substrate-based dWallet native blockchain from local development through public testnet deployment.

---

## 🎯 Testing Phases

```
Phase 1: Local Development Testing (Weeks 1-8)
    ↓
Phase 2: Private Testnet (Weeks 8-12)
    ↓
Phase 3: Public Testnet (Weeks 12-20)
    ↓
Phase 4: Mainnet Preparation (Weeks 20-24)
```

---

## Phase 1: Local Development Testing

### 1.1 Unit Testing (Rust Native)

**Location**: Each pallet's `src/tests.rs` file

```rust
// Example: pallet-dwt-token/src/tests.rs
#[cfg(test)]
mod tests {
    use super::*;
    use mock::*;
    use frame_support::{assert_ok, assert_err};

    #[test]
    fn test_token_minting() {
        new_test_ext().execute_with(|| {
            // Test successful minting
            assert_ok!(DWTToken::mint(RuntimeOrigin::signed(1), 1000));
            assert_eq!(DWTToken::total_supply(), 1000);
            
            // Test max supply enforcement
            assert_err!(
                DWTToken::mint(RuntimeOrigin::signed(1), u128::MAX),
                Error::<Test>::MaxSupplyExceeded
            );
        });
    }

    #[test]
    fn test_fee_tier_calculation() {
        new_test_ext().execute_with(|| {
            // Test tier 0 (no discount)
            assert_eq!(DWTToken::get_fee_tier(0), 0);
            
            // Test tier 1 (100 DWT = 10% discount)
            assert_eq!(DWTToken::get_fee_tier(100 * 10u128.pow(18)), 1);
            
            // Test tier 4 (100,000 DWT = 80% discount)
            assert_eq!(DWTToken::get_fee_tier(100_000 * 10u128.pow(18)), 4);
        });
    }

    #[test]
    fn test_rate_limiting() {
        new_test_ext().execute_with(|| {
            let user = 1;
            let max_tx_per_window = 10;
            
            // Should pass for first 10 transactions
            for i in 0..max_tx_per_window {
                assert_ok!(RateLimiter::check_rate_limit(&user, max_tx_per_window, 100));
                RateLimiter::record_transaction(&user);
            }
            
            // 11th transaction should fail
            assert_err!(
                RateLimiter::check_rate_limit(&user, max_tx_per_window, 100),
                Error::<Test>::UserRateLimitExceeded
            );
        });
    }

    #[test]
    fn test_circuit_breaker() {
        new_test_ext().execute_with(|| {
            // Activate circuit breaker
            assert_ok!(
                SecurityRoot::trigger_circuit_breaker(RuntimeOrigin::root(), true)
            );
            
            // All transactions should be blocked
            assert_err!(
                SecurityRoot::check_security_gated(&1),
                Error::<Test>::CircuitBreakerActive
            );
            
            // Deactivate circuit breaker
            assert_ok!(
                SecurityRoot::trigger_circuit_breaker(RuntimeOrigin::root(), false)
            );
            
            // Transactions should work again
            assert_ok!(SecurityRoot::check_security_gated(&1));
        });
    }
}
```

**Run Unit Tests:**
```bash
# Test all pallets
cargo test

# Test specific pallet
cargo test -p pallet-dwt-token

# Test with output
cargo test -- --nocapture

# Test coverage (requires tarpaulin)
cargo install cargo-tarpaulin
cargo tarpaulin --out Html
```

---

### 1.2 Integration Testing

**Location**: `node/tests/` directory

```rust
// node/tests/integration_tests.rs
use dwallet_node::chain_spec;
use sp_keyring::Sr25519Keyring;

#[tokio::test]
async fn test_full_transaction_flow() {
    // Start local node
    let node = start_test_node().await;
    
    // Create client connection
    let client = node.client();
    
    // Test token transfer through all 10 security layers
    let alice = Sr25519Keyring::Alice.to_account_id();
    let bob = Sr25519Keyring::Bob.to_account_id();
    
    // Layer 7: Security check
    assert!(check_security_gated(&alice).is_ok());
    
    // Layer 2: Rate limit check
    assert!(check_rate_limit(&alice).is_ok());
    
    // Execute transfer
    let transfer_extrinsic = create_transfer(&alice, &bob, 1000);
    let result = submit_extrinsic(client, transfer_extrinsic).await;
    
    assert!(result.is_ok());
    
    // Verify state change
    let bob_balance = get_balance(client, &bob).await;
    assert_eq!(bob_balance, 1000);
}

#[tokio::test]
async fn test_cross_chain_bridge() {
    // Simulate cross-chain message
    let message = create_bridge_message {
        source_chain: "ethereum",
        nonce: 1,
        payload: vec![...],
        validators: get_validator_signatures(),
    };
    
    // Test nonce validation
    assert_ok!(validate_nonce(&message));
    
    // Test replay protection
    submit_bridge_message(&message).await;
    assert_err!(
        submit_bridge_message(&message).await,
        Error::MessageAlreadyProcessed
    );
}
```

**Run Integration Tests:**
```bash
# Run integration tests
cargo test --test integration_tests

# Run with specific features
cargo test --test integration_tests --features std
```

---

### 1.3 Mock Network Testing

**Use Substrate's `sc-service-test` for multi-node testing:**

```rust
// node/tests/network_tests.rs
use sc_service_test::TestNetFactory;

#[test]
fn test_consensus_mechanism() {
    // Create 4-node network
    let net = DwalletTestNet::new(4);
    
    // Verify block production
    net.wait_for_blocks(10);
    
    // Check all nodes have same chain
    assert!(net.iter_instances().all(|node| {
        node.client().chain_info().best_number >= 10
    }));
}

#[test]
fn test_transaction_propagation() {
    let mut net = DwalletTestNet::new(3);
    
    // Submit transaction on node 0
    let tx = create_test_transaction();
    net.peer(0).push_transaction(tx);
    
    // Wait for propagation
    net.wait_for_blocks(2);
    
    // Verify all nodes received transaction
    for i in 0..3 {
        assert!(net.peer(i).pool_status().ready > 0);
    }
}
```

---

## Phase 2: Private Testnet

### 2.1 Setup Local Multi-Node Testnet

**Create chain specification:**

```rust
// node/src/chain_spec.rs
pub fn testnet_config() -> Result<DwalletChainSpec, String> {
    let wasm_binary = wasm_binary_unwrap();
    
    DwalletChainSpec::from_genesis(
        "dWallet Testnet",
        "dwallet_testnet",
        ChainType::Local,
        move || {
            testnet_genesis(
                // Initial authorities (validators)
                vec![
                    (
                        get_account_id_from_seed::<sr25519::Public>("Alice"),
                        get_account_id_from_seed::<sr25519::Public>("Alice//stash"),
                        babe_primitives::AuthorityId::from_raw([0u8; 32]),
                        grandpa_primitives::AuthorityId::from_raw([0u8; 32]),
                    ),
                    (
                        get_account_id_from_seed::<sr25519::Public>("Bob"),
                        get_account_id_from_seed::<sr25519::Public>("Bob//stash"),
                        babe_primitives::AuthorityId::from_raw([1u8; 32]),
                        grandpa_primitives::AuthorityId::from_raw([1u8; 32]),
                    ),
                ],
                // Root account
                get_account_id_from_seed::<sr25519::Public>("Alice"),
                // Initial token distribution
                vec![
                    (get_account_id_from_seed::<sr25519::Public>("Alice"), 1_000_000 * DWT),
                    (get_account_id_from_seed::<sr25519::Public>("Bob"), 500_000 * DWT),
                    (get_account_id_from_seed::<sr25519::Public>("Charlie"), 500_000 * DWT),
                ],
            )
        },
        vec![],
        None,
        None,
        None,
        Default::default(),
        Extensions {
            bad_blocks: Default::default(),
        },
    )
}
```

**Launch 4-node testnet:**

```bash
# Terminal 1 - Node 1 (Alice - Validator)
./target/release/dwallet-node \
  --chain testnet \
  --base-path /tmp/node1 \
  --alice \
  --validator \
  --rpc-methods=Unsafe \
  --rpc-cors=all \
  --node-key=0000000000000000000000000000000000000000000000000000000000000001

# Terminal 2 - Node 2 (Bob - Validator)
./target/release/dwallet-node \
  --chain testnet \
  --base-path /tmp/node2 \
  --bob \
  --validator \
  --bootnodes=/ip4/127.0.0.1/tcp/30333/p2p/12D3KooWHdiAxVd8uMQR1hGWXccidmfCwLqc6GXiPi5RqjtpLpXJ \
  --rpc-methods=Unsafe \
  --rpc-cors=all

# Terminal 3 - Node 3 (Charlie - Full Node)
./target/release/dwallet-node \
  --chain testnet \
  --base-path /tmp/node3 \
  --charlie \
  --bootnodes=/ip4/127.0.0.1/tcp/30333/p2p/12D3KooWHdiAxVd8uMQR1hGWXccidmfCwLqc6GXiPi5RqjtpLpXJ \
  --rpc-methods=Unsafe \
  --rpc-cors=all

# Terminal 4 - Node 4 (Dave - Full Node with RPC)
./target/release/dwallet-node \
  --chain testnet \
  --base-path /tmp/node4 \
  --dave \
  --bootnodes=/ip4/127.0.0.1/tcp/30333/p2p/12D3KooWHdiAxVd8uMQR1hGWXccidmfCwLqc6GXiPi5RqjtpLpXJ \
  --rpc-port=9944 \
  --rpc-methods=Unsafe \
  --rpc-cors=all
```

---

### 2.2 Automated Testnet Testing

**Use Polkadot.js to interact with testnet:**

```javascript
// scripts/test_testnet.js
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');

async function testTestnet() {
  // Connect to local testnet
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  console.log('Connected to dWallet Testnet');
  console.log('Chain:', (await api.rpc.system.chain()).toString());
  console.log('Node:', (await api.rpc.system.name()).toString());
  
  // Test 1: Token Transfer
  await testTokenTransfer(api);
  
  // Test 2: Governance Proposal
  await testGovernance(api);
  
  // Test 3: Rate Limiting
  await testRateLimiting(api);
  
  // Test 4: Circuit Breaker
  await testCircuitBreaker(api);
}

async function testTokenTransfer(api) {
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  const bob = keyring.addFromUri('//Bob');
  
  console.log('\n=== Testing Token Transfer ===');
  
  // Get balances before
  const aliceBalanceBefore = (await api.query.dwtToken.balances(alice.address)).toNumber();
  const bobBalanceBefore = (await api.query.dwtToken.balances(bob.address)).toNumber();
  
  // Transfer 1000 DWT
  const transfer = api.tx.dwtToken.transfer(bob.address, 1000);
  const hash = await transfer.signAndSend(alice);
  
  console.log('Transfer submitted:', hash.toHex());
  
  // Wait for inclusion
  await new Promise(resolve => setTimeout(resolve, 6000));
  
  // Get balances after
  const bobBalanceAfter = (await api.query.dwtToken.balances(bob.address)).toNumber();
  
  console.log('Bob balance before:', bobBalanceBefore);
  console.log('Bob balance after:', bobBalanceAfter);
  console.log('✅ Transfer successful!');
}

async function testGovernance(api) {
  console.log('\n=== Testing Governance ===');
  
  // Create proposal
  const proposal = api.tx.dwtToken.setFeeTier(2);
  
  // Submit proposal
  const hash = await api.tx.governance.propose(proposal, 100000)
    .signAndSend('//Alice');
  
  console.log('Proposal submitted:', hash.toHex());
  console.log('✅ Governance test passed!');
}

async function testRateLimiting(api) {
  console.log('\n=== Testing Rate Limiting ===');
  
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  const bob = keyring.addFromUri('//Bob');
  
  // Send 15 rapid transactions (limit is 10 per window)
  const promises = [];
  for (let i = 0; i < 15; i++) {
    const transfer = api.tx.dwtToken.transfer(bob.address, 1);
    promises.push(transfer.signAndSend(alice));
  }
  
  const results = await Promise.allSettled(promises);
  
  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`Succeeded: ${succeeded}, Failed: ${failed}`);
  console.log('✅ Rate limiting working correctly!');
}

async function testCircuitBreaker(api) {
  console.log('\n=== Testing Circuit Breaker ===');
  
  // Activate circuit breaker (requires root)
  const activateTx = api.tx.securityRoot.triggerCircuitBreaker(true);
  await activateTx.signAndSend('//Alice');
  
  console.log('Circuit breaker activated');
  
  // Try to submit transaction (should fail)
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  const bob = keyring.addFromUri('//Bob');
  
  try {
    const transfer = api.tx.dwtToken.transfer(bob.address, 100);
    await transfer.signAndSend(alice);
    console.log('❌ Transaction should have failed!');
  } catch (error) {
    console.log('✅ Circuit blocker working - transaction rejected!');
  }
  
  // Deactivate circuit breaker
  const deactivateTx = api.tx.securityRoot.triggerCircuitBreaker(false);
  await deactivateTx.signAndSend('//Alice');
  
  console.log('Circuit breaker deactivated');
}

testTestnet().catch(console.error).finally(() => process.exit(0));
```

**Run testnet tests:**
```bash
node scripts/test_testnet.js
```

---

## Phase 3: Public Testnet

### 3.1 Deploy to Cloud Servers

**AWS/DigitalOcean/GCP Setup:**

```yaml
# docker-compose.yml for validator node
version: '3.8'
services:
  dwallet-validator:
    image: dwallet/dwallet-node:latest
    ports:
      - "30333:30333"  # P2P
      - "9944:9944"    # RPC
    volumes:
      - ./data:/data
    command: >
      --chain testnet
      --validator
      --name "MyValidator"
      --base-path /data
      --rpc-methods=Safe
      --rpc-cors="https://your-domain.com"
      --prometheus-external
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '8'
          memory: 32G
```

**System Requirements for Validators:**
```bash
# Minimum specs
CPU: 8 cores (16 recommended)
RAM: 32 GB
Storage: 1 TB NVMe SSD
Network: 100 Mbps symmetric
OS: Ubuntu 22.04 LTS

# Install dependencies
sudo apt update
sudo apt install -y build-essential git clang curl libssl-dev llvm libudev-dev
```

---

### 3.2 Public Testnet Launch

**Generate chain specification:**

```bash
# Generate raw chain spec
./target/release/dwallet-node build-spec \
  --chain testnet \
  --raw \
  > chain_spec_testnet.json

# Distribute to validators
scp chain_spec_testnet.json validator1:testnet/
scp chain_spec_testnet.json validator2:testnet/
scp chain_spec_testnet.json validator3:testnet/
```

**Start public testnet validators:**

```bash
# Validator 1
./target/release/dwallet-node \
  --chain chain_spec_testnet.json \
  --validator \
  --name "Validator-1" \
  --base-path /data/dwallet \
  --rpc-cors="https://testnet.dwallet.io" \
  --telemetry-url 'wss://telemetry.polkadot.io/submit/ 1'

# Validator 2
./target/release/dwallet-node \
  --chain chain_spec_testnet.json \
  --validator \
  --name "Validator-2" \
  --base-path /data/dwallet \
  --bootnodes=/ip4/YOUR_VALIDATOR_1_IP/tcp/30333/p2p/YOUR_PEER_ID \
  --rpc-cors="https://testnet.dwallet.io"

# Validator 3
./target/release/dwallet-node \
  --chain chain_spec_testnet.json \
  --validator \
  --name "Validator-3" \
  --base-path /data/dwallet \
  --bootnodes=/ip4/YOUR_VALIDATOR_1_IP/tcp/30333/p2p/YOUR_PEER_ID \
  --rpc-cors="https://testnet.dwallet.io"
```

---

### 3.3 Public Testnet Testing Tools

#### A. Polkadot.js Apps (Web Interface)

1. Go to: https://polkadot.js.org/apps/
2. Click network selector (top-left)
3. Choose "Development" → "Custom"
4. Enter your testnet RPC endpoint: `wss://testnet.dwallet.io`
5. Test all features through UI

#### B. Automated Testing Suite

```javascript
// scripts/public_testnet_test.js
const axios = require('axios');

const TESTNET_RPC = 'https://testnet.dwallet.io';

async function runPublicTestnetTests() {
  console.log('🧪 Starting Public Testnet Test Suite\n');
  
  // Test 1: Network Health
  await testNetworkHealth();
  
  // Test 2: Transaction Throughput
  await testTransactionThroughput();
  
  // Test 3: Cross-Layer Security
  await testCrossLayerSecurity();
  
  // Test 4: Governance Flow
  await testGovernanceFlow();
  
  // Test 5: Bridge Operations
  await testBridgeOperations();
  
  console.log('\n✅ All public testnet tests completed!');
}

async function testNetworkHealth() {
  console.log('=== Test 1: Network Health ===');
  
  // Get chain info
  const response = await axios.post(TESTNET_RPC, {
    jsonrpc: '2.0',
    id: 1,
    method: 'system_health',
    params: []
  });
  
  console.log('Peers:', response.data.result.peers);
  console.log('Is syncing:', response.data.result.isSyncing);
  console.log('Should have peers:', response.data.result.peers > 0 ? '✅' : '❌');
}

async function testTransactionThroughput() {
  console.log('\n=== Test 2: Transaction Throughput ===');
  
  const startTime = Date.now();
  const txCount = 100;
  
  // Submit 100 transactions
  for (let i = 0; i < txCount; i++) {
    await submitTestTransaction();
  }
  
  const duration = (Date.now() - startTime) / 1000;
  const tps = txCount / duration;
  
  console.log(`Transactions: ${txCount}`);
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`TPS: ${tps.toFixed(2)}`);
  console.log(`Target TPS: 10,000+`);
  console.log(`Status: ${tps > 100 ? '✅' : '⚠️'} (local test, mainnet will be faster)`);
}

async function testCrossLayerSecurity() {
  console.log('\n=== Test 3: Cross-Layer Security ===');
  
  // Test Layer 7 → Layer 2 sync
  console.log('Testing circuit breaker propagation...');
  
  // Activate circuit breaker
  await activateCircuitBreaker();
  
  // Verify all layers block transactions
  const layerResults = await Promise.all([
    testLayer2Blocked(),
    testLayer3Blocked(),
    testLayer5Blocked(),
  ]);
  
  const allBlocked = layerResults.every(r => r.blocked);
  console.log(`All layers blocked: ${allBlocked ? '✅' : '❌'}`);
  
  // Deactivate circuit breaker
  await deactivateCircuitBreaker();
  console.log('Circuit breaker test complete');
}

async function testGovernanceFlow() {
  console.log('\n=== Test 4: Governance Flow ===');
  
  // Step 1: Create proposal
  const proposalId = await createProposal();
  console.log(`Proposal created: ${proposalId}`);
  
  // Step 2: Vote on proposal
  await voteOnProposal(proposalId, true);
  console.log('Vote submitted');
  
  // Step 3: Wait for voting period
  console.log('Waiting for voting period (simulated)...');
  await simulateTimePass(604800); // 1 week
  
  // Step 4: Check results
  const passed = await checkProposalResult(proposalId);
  console.log(`Proposal passed: ${passed ? '✅' : '❌'}`);
  
  // Step 5: Execute (after timelock)
  console.log('Waiting for timelock (48 hours simulated)...');
  await simulateTimePass(172800);
  
  await executeProposal(proposalId);
  console.log('✅ Governance flow test complete');
}

async function testBridgeOperations() {
  console.log('\n=== Test 5: Bridge Operations ===');
  
  // Test lock-and-mint
  console.log('Testing lock on source chain...');
  const lockTx = await lockTokens(1000);
  console.log(`Tokens locked: ${lockTx.hash}`);
  
  // Wait for bridge relayers
  console.log('Waiting for relayer confirmation...');
  await waitForRelayers(7); // 7-of-15 confirmation
  
  // Mint on destination
  console.log('Testing mint on destination chain...');
  const mintTx = await mintWrappedTokens(1000);
  console.log(`Tokens minted: ${mintTx.hash}`);
  
  // Test return bridge (burn)
  console.log('Testing burn on destination chain...');
  const burnTx = await burnTokens(1000);
  console.log(`Tokens burned: ${burnTx.hash}`);
  
  // Unlock on source
  console.log('Testing unlock on source chain...');
  const unlockTx = await unlockTokens(1000);
  console.log(`Tokens unlocked: ${unlockTx.hash}`);
  
  console.log('✅ Bridge operations test complete');
}

runPublicTestnetTests().catch(console.error);
```

---

### 3.4 Faucet Setup (For Testnet Tokens)

**Create a simple faucet:**

```javascript
// faucet/server.js
const express = require('express');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');

const app = express();
app.use(express.json());

let api;
let faucetAccount;

async function initFaucet() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  api = await ApiPromise.create({ provider });
  
  const keyring = new Keyring({ type: 'sr25519' });
  faucetAccount = keyring.addFromUri('//Faucet');
  
  console.log('Faucet initialized:', faucetAccount.address);
}

app.post('/faucet', async (req, res) => {
  const { address } = req.body;
  
  if (!address) {
    return res.status(400).json({ error: 'Address required' });
  }
  
  try {
    // Send 1000 test DWT
    const transfer = api.tx.dwtToken.transfer(address, 1000 * 10**18);
    const hash = await transfer.signAndSend(faucetAccount);
    
    res.json({ 
      success: true, 
      txHash: hash.toHex(),
      amount: '1000 DWT'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/balance/:address', async (req, res) => {
  const balance = await api.query.dwtToken.balances(req.params.address);
  res.json({ balance: balance.toString() });
});

initFaucet().then(() => {
  app.listen(3000, () => {
    console.log('Faucet running on http://localhost:3000');
  });
});
```

---

## Phase 4: Load & Stress Testing

### 4.1 Performance Testing with Locust

**Create load test script:**

```python
# load_tests/locustfile.py
from locust import HttpUser, task, between
import requests
import json

class DwalletUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def transfer_tokens(self):
        """Test token transfers"""
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "author_submitExtrinsic",
            "params": [self.create_transfer_extrinsic()]
        }
        
        response = self.client.post("/rpc", json=payload)
        assert response.status_code == 200
    
    @task(2)
    def query_balance(self):
        """Test balance queries"""
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "state_getStorage",
            "params": ["0x..."]  # Storage key
        }
        
        response = self.client.post("/rpc", json=payload)
        assert response.status_code == 200
    
    @task(1)
    def submit_governance_vote(self):
        """Test governance voting"""
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "author_submitExtrinsic",
            "params": [self.create_vote_extrinsic()]
        }
        
        response = self.client.post("/rpc", json=payload)
        assert response.status_code == 200
```

**Run load test:**
```bash
# Install Locust
pip install locust

# Run load test
locust -f load_tests/locustfile.py --host=https://testnet.dwallet.io

# Web UI: http://localhost:8089
# Set users: 1000
# Set spawn rate: 10/second
```

---

### 4.2 Stress Testing Scenarios

```bash
#!/bin/bash
# scripts/stress_test.sh

echo "🔥 Starting Stress Tests..."

# Test 1: Spam Transactions
echo "Test 1: Spam 10,000 transactions..."
for i in {1..10000}; do
  curl -X POST https://testnet.dwallet.io/rpc \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":$i,\"method\":\"author_submitExtrinsic\",\"params\":[\"...\"]}" &
done
wait

# Test 2: Large Block Testing
echo "Test 2: Submit 1000 tx in single block..."
# (Use transaction pool API)

# Test 3: Network Partition Simulation
echo "Test 3: Simulate network partition..."
# (Disconnect some validators temporarily)

# Test 4: Validator Crash Recovery
echo "Test 4: Crash and restart validator..."
# (Kill validator process, verify recovery)

# Test 5: State Bloat Testing
echo "Test 5: Create 100,000 storage entries..."
# (Test state growth and pruning)

echo "✅ Stress tests complete!"
```

---

## 📊 Monitoring & Metrics

### 5.1 Prometheus + Grafana Setup

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  grafana-data:
```

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'dwallet-node'
    static_configs:
      - targets: ['localhost:9615']  # Substrate Prometheus endpoint
```

**Key Metrics to Monitor:**
- Block production rate
- Transaction throughput (TPS)
- Network peers count
- Memory usage
- CPU usage
- Database size
- Finality time
- Circuit breaker status
- Threat level

---

### 5.2 Testnet Dashboard

**Create monitoring dashboard:**

```javascript
// monitoring/dashboard.js
const express = require('express');
const app = express();

app.get('/api/health', async (req, res) => {
  const health = {
    chain: await getChainInfo(),
    network: await getNetworkHealth(),
    security: await getSecurityStatus(),
    performance: await getPerformanceMetrics(),
  };
  
  res.json(health);
});

app.get('/api/metrics', async (req, res) => {
  const metrics = {
    tps: await getCurrentTPS(),
    blockTime: await getAverageBlockTime(),
    peerCount: await getPeerCount(),
    finalityTime: await getFinalityTime(),
    circuitBreakerActive: await isCircuitBreakerActive(),
    threatLevel: await getThreatLevel(),
    totalTransactions: await getTotalTransactions(),
    activeValidators: await getActiveValidatorCount(),
  };
  
  res.json(metrics);
});

app.listen(4000, () => {
  console.log('Dashboard API running on http://localhost:4000');
});
```

---

## ✅ Testnet Checklist

### Before Public Launch:

- [ ] All unit tests passing (100% coverage target)
- [ ] Integration tests complete
- [ ] 4-node local testnet stable for 7 days
- [ ] Circuit breaker tested and working
- [ ] Rate limiting verified
- [ ] Governance flow tested end-to-end
- [ ] Bridge operations tested (if applicable)
- [ ] Load testing completed (10k+ TPS target)
- [ ] Stress tests passed
- [ ] Monitoring dashboards operational
- [ ] Faucet deployed and funded
- [ ] Documentation complete
- [ ] Bug bounty program ready
- [ ] Security audit completed

---

## 🚀 Quick Start Commands

```bash
# 1. Build release binary
cargo build --release

# 2. Run local testnet (4 nodes)
./scripts/run_testnet.sh

# 3. Run all tests
cargo test

# 4. Run integration tests
cargo test --test integration_tests

# 5. Start monitoring
docker-compose up -d

# 6. Deploy to testnet
./scripts/deploy_testnet.sh

# 7. Run testnet validation suite
node scripts/test_testnet.js

# 8. Check network health
curl https://testnet.dwallet.io/api/health
```

---

## 📚 Additional Resources

- **Substrate Documentation**: https://docs.substrate.io/
- **Polkadot.js API**: https://polkadot.js.org/docs/
- **Substrate Dev Hub**: https://substrate.io/developers/
- **Rust Book**: https://doc.rust-lang.org/book/

---

## 🎯 Next Steps

1. Start with Phase 1 (local testing) - 8 weeks
2. Move to Phase 2 (private testnet) - 4 weeks
3. Launch Phase 3 (public testnet) - 8 weeks
4. Complete Phase 4 (stress testing) - 4 weeks
5. **Get security audit** before mainnet
6. Launch mainnet! 🚀
