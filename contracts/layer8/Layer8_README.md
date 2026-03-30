# Layer 8 — Multichain Smart Contracts

## Contract Overview

| File                                | Contracts             | Chain Role               |
| ----------------------------------- | --------------------- | ------------------------ |
| `Layer8Bridge.sol`                  | `Layer8Bridge`        | Source (lock) chain      |
| `BridgedToken.sol`                  | `BridgedToken`        | Destination (mint) chain |
| `CrossChainStaking.sol`             | `StakingHub`          | Home (token) chain       |
| `CrossChainStaking.sol`             | `StakingSatellite`    | Each remote chain        |
| `CrossChainGovernance.sol`          | `GovernanceHub`       | Home (governance) chain  |
| `CrossChainGovernance.sol`          | `GovernanceSatellite` | Each remote chain        |
| `interfaces/ILayerZeroEndpoint.sol` | Interface             | —                        |
| `interfaces/IAxelarInterfaces.sol`  | Interfaces            | —                        |

---

## 1. Bridge — Lock-and-Mint (#18)

### Architecture

```
SOURCE CHAIN                         DESTINATION CHAIN
─────────────────────────────────    ──────────────────────────────────
User ──► Layer8Bridge                BridgedToken ◄── LZ/Axelar relayer
         lockAndSendViaLZ()               lzReceive() → _mintFromPayload()
         lockAndSendViaAxelar()           execute()   → _mintFromPayload()
         ─────────────────────            ──────────────────────────────
         lzReceive()  ◄──────            burnAndSendViaLZ()
         execute()    ◄──────            burnAndSendViaAxelar()
         _release() → transfer
```

### Deployment Steps

1. Deploy `Layer8Bridge` on source chain with LZ endpoint + Axelar gateway addresses.
2. Deploy `BridgedToken` on destination chain.
3. Call `Layer8Bridge.setTrustedRemote(dstChainId, path)` — path = abi.encodePacked(BridgedToken, Layer8Bridge).
4. Call `BridgedToken.setTrustedRemote(srcChainId, path)` — inverse path.
5. Call `Layer8Bridge.addSupportedToken(tokenAddr)`.
6. Call `Layer8Bridge.setTokenMapping(tokenAddr, dstChainId, bytes32(uint256(uint160(bridgedTokenAddr))))`.

### Message Payload: Lock → Mint

```
abi.encode(
  bytes32 remoteToken,   // address of BridgedToken (padded)
  bytes   recipient,     // abi.encode(recipientAddress)
  uint256 amount,
  uint64  nonce
)
```

### Message Payload: Burn → Release

```
abi.encode(
  address token,         // local ERC-20 on source chain
  address recipient,
  uint256 amount,
  bytes32 messageId      // replay protection
)
```

---

## 2. Cross-Chain Staking — Remote Stake Relay

### Architecture

```
REMOTE CHAIN                              HOME CHAIN
──────────────────────────────────────    ──────────────────────────
User ──► StakingSatellite                 StakingHub
          stake(amount)                     lzReceive() → _receiveStake()
          ──[LZ msgType=1]──────────────►   credits balance, accrues rewards
          requestUnstake(amount)            _receiveUnstakeRequest()
          ──[LZ msgType=2]──────────────►   deducts stake, queues withdrawal
                                        ◄── lzSend(withdrawal) ──────────
          lzReceive() → transfer user
```

### Reward Model

- `accRewardPerToken` accumulates globally each second proportional to `rewardRatePerSecond`.
- Each `StakeInfo` stores a `rewardDebt` snapshot; pending = `(amount × (acc − debt)) / 1e18`.
- Rewards are harvested automatically on stake/unstake.

### Deployment Steps

1. Deploy `StakingHub` on home chain.
2. Deploy `StakingSatellite` on each remote chain with `hubChainId`.
3. Call `StakingHub.setTrustedSatellite(chainId, path)` for each satellite.
4. Call `StakingSatellite.setTrustedHub(path)` pointing back to hub.
5. Fund `StakingHub` with reward tokens.

---

## 3. Cross-Chain Governance — Remote Proposals

### Architecture

```
HOME CHAIN                              REMOTE CHAINS
──────────────────────────────────      ──────────────────────────────────────
GovernanceHub                           GovernanceSatellite (×N)
  propose()                               lzReceive(msgType=1) → stores proposal
  broadcastProposal() ──[LZ]──────────►   castVote() — local token-weighted vote
  castVote()                              commitVotes() ──[LZ msgType=2]──────────►
  lzReceive(msgType=2) ← aggregates       (after voting window closes)
  state() / execute()
  relayResult() ──[LZ msgType=3]──────►   lzReceive(msgType=3) → stores result
```

### Message Types

| Type | Direction       | Purpose                      |
| ---- | --------------- | ---------------------------- |
| `1`  | Hub → Satellite | Broadcast new proposal       |
| `2`  | Satellite → Hub | Commit aggregated vote tally |
| `3`  | Hub → Satellite | Relay execution result       |

### Deployment Steps

1. Deploy `GovernanceHub` on home chain with ERC20Votes token address.
2. Deploy `GovernanceSatellite` on each remote chain.
3. Call `GovernanceHub.addSatellite(chainId, path)` for each satellite.
4. Call `GovernanceSatellite.setTrustedHub(path)` pointing back to hub.

### Proposal Lifecycle

```
propose()
  └─► broadcastProposal()          [hub → all satellites via LZ]
        └─► voting window opens
              ├─ castVote() on hub
              └─ castVote() on satellites
        └─► voting window closes
              └─► commitVotes()    [each satellite → hub]
                    └─► finalize: state() returns Succeeded or Defeated
                          └─► execute()
                                └─► relayResult() [hub → all satellites]
```

---

## Dependencies

```json
{
  "@openzeppelin/contracts": "^5.x",
  "@layerzerolabs/lz-evm-sdk-v1": "^1.x"
}
```

## LZ Chain IDs (common)

| Chain     | LZ Chain ID |
| --------- | ----------- |
| Ethereum  | 101         |
| BNB Chain | 102         |
| Avalanche | 106         |
| Polygon   | 109         |
| Arbitrum  | 110         |
| Optimism  | 111         |
| Base      | 184         |

## Security Notes

- All inbound LZ messages verify `msg.sender == lzEndpoint` AND `srcAddress == trustedRemote`.
- All Axelar messages call `gateway.validateContractCall()` before processing.
- Replay protection via `processedMessages[messageId]` mapping on every handler.
- Circuit-break / pause available on all contracts via `Pausable`.
- Multisig ownership recommended for all `onlyOwner` admin functions in production.
