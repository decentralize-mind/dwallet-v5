# dWallet Native Blockchain - Security Testing Quick Reference

## 🚀 Run All Tests

```bash
./run-security-tests.sh
```

---

## 📋 Attack Test Commands

### Flash Loan Attacks
```bash
cargo test --test attack_simulation flash_loan_price_manipulation_attack
cargo test --test attack_simulation flash_loan_governance_attack
cargo test --test attack_simulation rapid_repeated_flash_loans
```

### Oracle Attacks
```bash
cargo test --test attack_simulation single_oracle_manipulation_attack
cargo test --test attack_simulation stale_oracle_data_attack
cargo test --test attack_simulation multi_oracle_byzantine_fault_tolerance
```

### Bridge Attacks
```bash
cargo test --test attack_simulation bridge_message_replay_attack
cargo test --test attack_simulation bridge_nonce_reordering_attack
cargo test --test attack_simulation bridge_validator_signature_forgery
```

### Governance Attacks
```bash
cargo test --test attack_simulation governance_flash_loan_voting_attack
cargo test --test attack_simulation governance_timelock_bypass_attempt
cargo test --test attack_simulation governance_quorum_manipulation
```

### MEV Attacks
```bash
cargo test --test attack_simulation mev_front_running_protection
cargo test --test attack_simulation mev_sandwich_attack_prevention
```

### Economic Attacks
```bash
cargo test --test attack_simulation treasury_drain_via_multiple_withdrawals
cargo test --test attack_simulation staking_reward_manipulation_attack
cargo test --test attack_simulation insurance_fund_solvency_stress_test
```

### Network Attacks
```bash
cargo test --test attack_simulation transaction_spam_ddos_attack
cargo test --test attack_simulation storage_bloat_attack
```

### Cryptographic Attacks
```bash
cargo test --test attack_simulation signature_replay_attack
cargo test --test attack_simulation signature_forgery_detection
cargo test --test attack_simulation domain_separation_cross_chain_replay
```

### Cross-Layer Security
```bash
cargo test --test attack_simulation layer7_triggers_all_layer_lockdown
cargo test --test attack_simulation rate_limit_propagation_across_layers
```

---

## 🎲 Fuzz Test Commands

### Token Fuzz
```bash
cargo test --test fuzz_tests fuzz_transfer_preserves_total_supply
cargo test --test fuzz_tests fuzz_transfer_never_creates_negative_balance
cargo test --test fuzz_tests fuzz_mint_never_exceeds_max_supply
cargo test --test fuzz_tests fuzz_burn_never_underflows
```

### Rate Limiter Fuzz
```bash
cargo test --test fuzz_tests fuzz_rate_limit_never_allows_excess
cargo test --test fuzz_tests fuzz_global_rate_limit_always_respected
cargo test --test fuzz_tests fuzz_cooldown_period_enforced
```

### DEX Fuzz
```bash
cargo test --test fuzz_tests fuzz_swap_always_reserves_invariant
cargo test --test fuzz_tests fuzz_swap_output_never_exceeds_reserves
cargo test --test fuzz_tests fuzz_slippage_protection_works
```

### Lending Fuzz
```bash
cargo test --test fuzz_tests fuzz_collateral_ratio_never_violated
cargo test --test fuzz_tests fuzz_interest_calculation_no_overflow
cargo test --test fuzz_tests fuzz_liquidation_always_solvent
```

### Governance Fuzz
```bash
cargo test --test fuzz_tests fuzz_voting_power_never_exceeds_balance
cargo test --test fuzz_tests fuzz_timelock_always_enforced
cargo test --test fuzz_tests fuzz_quorum_calculation_correct
```

### Bridge Fuzz
```bash
cargo test --test fuzz_tests fuzz_bridge_nonce_always_sequential
cargo test --test fuzz_tests fuzz_bridge_validator_threshold
cargo test --test fuzz_tests fuzz_bridge_message_expiry
```

### Security Layer Fuzz
```bash
cargo test --test fuzz_tests fuzz_threat_level_bounds
cargo test --test fuzz_tests fuzz_circuit_breaker_blocks_all_operations
```

---

## 📊 Coverage & Reports

```bash
# Generate coverage report
cargo tarpaulin --out Html

# View report
open coverage/tarpaulin-report.html

# Run with gas benchmarking
cargo test --release -- --ignored
```

---

## 🔍 Debug Failing Tests

```bash
# Verbose output
cargo test <test_name> -- --nocapture

# Single thread
cargo test <test_name> -- --test-threads=1

# Show all output
cargo test <test_name> -- --show-output
```

---

## ⚡ Quick Validation Before Commit

```bash
# Fast check (no tests)
cargo check

# Fast test (unit only)
cargo test --lib

# Full test suite
./run-security-tests.sh
```

---

## 🎯 Critical Pre-Mainnet Tests

Run these BEFORE deploying to mainnet:

```bash
# Flash loan resistance
cargo test --test attack_simulation flash_loan

# Oracle manipulation resistance
cargo test --test attack_simulation oracle

# Bridge security
cargo test --test attack_simulation bridge

# Governance security
cargo test --test attack_simulation governance

# Circuit breaker
cargo test --test attack_simulation layer7_triggers_all_layer_lockdown
```

All must pass: ✅

---

## 📚 Documentation

- **Full Testing Guide**: `security-testing-complete.md`
- **README**: `SECURITY-TESTING-README.md`
- **Test Code**: `tests/attack_simulation.rs`, `tests/fuzz_tests.rs`

---

**Last Updated**: 2026-04-18
**Total Tests**: 50+
**Coverage Target**: 95%+
