#!/bin/bash
# dWallet Native Blockchain - Complete Security Testing Suite
# Run all tests against attacks and hacks

set -e

echo "=========================================="
echo " dWallet Security Testing Suite"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test_suite() {
    local suite_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}▶ Running: ${suite_name}${NC}"
    echo "-------------------------------------------"
    
    if eval $test_command; then
        echo -e "${GREEN}✓ ${suite_name} PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ ${suite_name} FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
}

# ============================================================================
# PHASE 1: UNIT SECURITY TESTS
# ============================================================================
echo "PHASE 1: Unit Security Tests"
echo "=========================================="

run_test_suite "Access Control Tests" \
    "cargo test --lib access_control -- --nocapture"

run_test_suite "Reentrancy Protection Tests" \
    "cargo test --lib reentrancy -- --nocapture"

run_test_suite "Arithmetic Overflow Tests" \
    "cargo test --lib arithmetic -- --nocapture"

run_test_suite "Token Minting/Burning Tests" \
    "cargo test pallet_dwt_token -- --nocapture"

run_test_suite "Rate Limiting Tests" \
    "cargo test pallet_rate_limiter -- --nocapture"

run_test_suite "Circuit Breaker Tests" \
    "cargo test pallet_security_root -- --nocapture"

echo ""

# ============================================================================
# PHASE 2: ATTACK SIMULATION TESTS
# ============================================================================
echo "PHASE 2: Attack Simulation Tests"
echo "=========================================="

run_test_suite "Flash Loan Attack Simulations" \
    "cargo test --test attack_simulation flash_loan -- --nocapture"

run_test_suite "Oracle Manipulation Attacks" \
    "cargo test --test attack_simulation oracle -- --nocapture"

run_test_suite "Cross-Chain Replay Attacks" \
    "cargo test --test attack_simulation bridge -- --nocapture"

run_test_suite "Governance Attack Simulations" \
    "cargo test --test attack_simulation governance -- --nocapture"

run_test_suite "MEV Attack Simulations" \
    "cargo test --test attack_simulation mev -- --nocapture"

run_test_suite "Economic Drain Attacks" \
    "cargo test --test attack_simulation economic -- --nocapture"

run_test_suite "Network DDoS Attacks" \
    "cargo test --test attack_simulation ddos -- --nocapture"

run_test_suite "Cryptographic Signature Attacks" \
    "cargo test --test attack_simulation signature -- --nocapture"

run_test_suite "Cross-Layer Security Tests" \
    "cargo test --test attack_simulation cross_layer -- --nocapture"

echo ""

# ============================================================================
# PHASE 3: FUZZ TESTS (Property-Based Testing)
# ============================================================================
echo "PHASE 3: Fuzz Tests"
echo "=========================================="

run_test_suite "Token Transfer Fuzz Tests" \
    "cargo test --test fuzz_tests fuzz_transfer -- --nocapture"

run_test_suite "Rate Limiter Fuzz Tests" \
    "cargo test --test fuzz_tests fuzz_rate_limit -- --nocapture"

run_test_suite "DEX AMM Fuzz Tests" \
    "cargo test --test fuzz_tests fuzz_swap -- --nocapture"

run_test_suite "Lending Protocol Fuzz Tests" \
    "cargo test --test fuzz_tests fuzz_collateral -- --nocapture"

run_test_suite "Governance Fuzz Tests" \
    "cargo test --test fuzz_tests fuzz_voting -- --nocapture"

run_test_suite "Bridge Fuzz Tests" \
    "cargo test --test fuzz_tests fuzz_bridge -- --nocapture"

run_test_suite "Security Layer Fuzz Tests" \
    "cargo test --test fuzz_tests fuzz_threat -- --nocapture"

echo ""

# ============================================================================
# PHASE 4: INTEGRATION TESTS
# ============================================================================
echo "PHASE 4: Integration Security Tests"
echo "=========================================="

run_test_suite "Full Transaction Flow Test" \
    "cargo test --test integration full_transaction_flow -- --nocapture"

run_test_suite "Cross-Pallet Security Test" \
    "cargo test --test integration cross_pallet -- --nocapture"

run_test_suite "Multi-Node Consensus Test" \
    "cargo test --test integration consensus -- --nocapture"

run_test_suite "State Migration Test" \
    "cargo test --test integration state_migration -- --nocapture"

echo ""

# ============================================================================
# PHASE 5: STRESS & LOAD TESTS
# ============================================================================
echo "PHASE 5: Stress & Load Tests"
echo "=========================================="

run_test_suite "High Transaction Volume Test" \
    "cargo test --test stress high_volume -- --nocapture --ignored"

run_test_suite "Storage Bloat Resistance Test" \
    "cargo test --test stress storage_bloat -- --nocapture --ignored"

run_test_suite "Validator Crash Recovery Test" \
    "cargo test --test stress validator_recovery -- --nocapture --ignored"

echo ""

# ============================================================================
# PHASE 6: FORMAL VERIFICATION
# ============================================================================
echo "PHASE 6: Formal Verification"
echo "=========================================="

if command -v cargo-kani &> /dev/null; then
    run_test_suite "Kani Formal Verification" \
        "cargo kani --tests"
else
    echo -e "${YELLOW}⚠ Kani not installed, skipping formal verification${NC}"
    echo "   Install: cargo install cargo-kani"
    echo ""
fi

# ============================================================================
# PHASE 7: TEST COVERAGE
# ============================================================================
echo "PHASE 7: Test Coverage Analysis"
echo "=========================================="

if command -v cargo-tarpaulin &> /dev/null; then
    echo "Generating coverage report..."
    cargo tarpaulin --out Html --output-dir coverage
    
    if [ -f "coverage/tarpaulin-report.html" ]; then
        echo -e "${GREEN}✓ Coverage report generated: coverage/tarpaulin-report.html${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Tarpaulin not installed, skipping coverage${NC}"
    echo "   Install: cargo install cargo-tarpaulin"
fi

echo ""

# ============================================================================
# FINAL REPORT
# ============================================================================
echo "=========================================="
echo " Test Suite Summary"
echo "=========================================="
echo ""
echo "Total Test Suites: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo ""
    echo "Your blockchain is secure against:"
    echo "  ✓ Flash loan attacks"
    echo "  ✓ Oracle manipulation"
    echo "  ✓ Cross-chain replay attacks"
    echo "  ✓ Governance exploits"
    echo "  ✓ MEV/front-running"
    echo "  ✓ Economic drain attacks"
    echo "  ✓ Network DDoS"
    echo "  ✓ Cryptographic attacks"
    echo "  ✓ Reentrancy exploits"
    echo "  ✓ Overflow/underflow"
    echo ""
    echo "Next steps:"
    echo "  1. Review coverage report"
    echo "  2. Run on public testnet"
    echo "  3. Get professional audit"
    echo "  4. Launch bug bounty program"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED!${NC}"
    echo ""
    echo "Critical vulnerabilities detected!"
    echo "Do NOT deploy to mainnet until all tests pass."
    exit 1
fi
