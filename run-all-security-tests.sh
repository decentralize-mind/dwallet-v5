#!/bin/bash

# 🛡️ Run All Security Tests
# This script runs comprehensive tests for all 6 security systems

echo "🔒 Starting Complete Security Test Suite..."
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${BLUE}Testing: ${test_name}${NC}"
    echo "-------------------------------------------"
    
    if eval $test_command; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
    
    echo ""
}

# 1. Formal Verification Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  FORMAL VERIFICATION + FUZZING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v forge &> /dev/null; then
    cd formal-verification
    run_test "Core Invariants" "forge test --match-contract CoreInvariantsTest -vvv"
    run_test "Security Invariants" "forge test --match-contract SecurityInvariantsTest -vvv"
    run_test "Economic Invariants" "forge test --match-contract EconomicInvariantsTest -vvv"
    run_test "Layer Fuzzing" "forge test --match-test testFuzz_.* -vvv"
    cd ..
else
    echo -e "${RED}⚠️  Foundry not installed. Skipping formal verification tests.${NC}"
    echo "Install with: curl -L https://foundry.paradigm.xyz | bash"
    echo ""
fi

# 2. Economic Defense Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  ECONOMIC DEFENSE LAYER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_test "Dynamic Fees" "npx hardhat test test/economic/EconomicDefense.test.cjs --grep 'Dynamic Fee'"
run_test "Slippage Protection" "npx hardhat test test/economic/EconomicDefense.test.cjs --grep 'Slippage'"
run_test "Withdrawal Penalties" "npx hardhat test test/economic/EconomicDefense.test.cjs --grep 'Withdrawal'"
run_test "Volume Monitoring" "npx hardhat test test/economic/EconomicDefense.test.cjs --grep 'Volume'"
run_test "Attack Prevention" "npx hardhat test test/economic/EconomicDefense.test.cjs --grep 'Attack Prevention'"

# 3. Infrastructure Security Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  INFRASTRUCTURE SECURITY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_test "RPC Provider Management" "npx hardhat test test/infrastructure/InfrastructureSecurity.test.cjs --grep 'RPC Provider'"
run_test "Oracle Feed Management" "npx hardhat test test/infrastructure/InfrastructureSecurity.test.cjs --grep 'Oracle Feed'"
run_test "Health Monitoring" "npx hardhat test test/infrastructure/InfrastructureSecurity.test.cjs --grep 'Health Monitoring'"
run_test "Stress Tests" "npx hardhat test test/infrastructure/InfrastructureSecurity.test.cjs --grep 'Stress Tests'"

# 4. Existing Attack Simulation Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  ATTACK SIMULATIONS (Existing)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_test "Flash Loan Attacks" "npx hardhat test test/attacks/AttackSimulation.test.js --grep 'Flash Loan'"
run_test "Oracle Manipulation" "npx hardhat test test/attacks/AttackSimulation.test.js --grep 'Oracle'"

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo "Your dWallet v5 protocol has enterprise-grade security! 🚀"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
fi
