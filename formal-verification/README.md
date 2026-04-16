# 🧬 Formal Verification + Fuzzing System

This directory contains formal verification and fuzzing tests for the dWallet v5 protocol.

## Tools Used

- **Foundry**: Fuzz testing and invariant testing
- **Echidna**: Property-based fuzzing (optional)
- **Hardhat**: Integration with existing test suite

## Directory Structure

```
formal-verification/
├── invariants/           # Invariant properties that must always hold
│   ├── CoreInvariants.t.sol
│   ├── SecurityInvariants.t.sol
│   └── EconomicInvariants.t.sol
├── fuzzing/             # Fuzz test suites
│   ├── LayerFuzz.t.sol
│   ├── OracleFuzz.t.sol
│   └── AttackFuzz.t.sol
├── proofs/              # Formal verification properties
│   ├── SafetyProperties.sol
│   └── LivenessProperties.sol
└── README.md            # This file
```

## Running Tests

### Foundry Fuzz Tests
```bash
cd formal-verification
forge test -vvv
```

### Specific Fuzz Test
```bash
forge test --match-test testFuzz_.* -vvv
```

### Invariant Tests
```bash
forge test --match-contract InvariantTest -vvv
```

## Key Properties Verified

### Safety Properties (Must NEVER happen)
1. User can never withdraw more than deposited
2. Total supply never exceeds max cap
3. Oracle price never deviates beyond threshold without flagging
4. Admin cannot bypass security layers without timelock

### Liveness Properties (Must ALWAYS happen eventually)
1. Valid withdrawals are eventually processed
2. Emergency pause can always be triggered by authorized addresses
3. Governance proposals are eventually executed or rejected

## Fuzzing Parameters

Default Foundry settings:
- `runs`: 256 (number of fuzz iterations)
- `max_test_rejects`: 65536 (max discards)
- `seed`: Random per run

Override in `foundry.toml` if needed.
