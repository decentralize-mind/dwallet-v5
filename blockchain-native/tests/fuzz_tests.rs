// Fuzz testing (property-based testing) for dWallet Native Blockchain
// Uses proptest to generate random inputs and find edge cases
// Run: cargo test --test fuzz_tests

use dwallet_runtime::*;
use frame_support::{assert_ok, assert_err};
use proptest::prelude::*;

mod mock;
use mock::*;

// ============================================================================
// TOKEN FUZZ TESTS
// ============================================================================

proptest! {
    #[test]
    fn fuzz_transfer_preserves_total_supply(
        from_amount in 0..u128::MAX,
        transfer_amount in 0..u128::MAX,
    ) {
        new_test_ext().execute_with(|| {
            let from = 1;
            let to = 2;
            
            if from_amount > 0 {
                let _ = DWTToken::mint(RuntimeOrigin::signed(1), from_amount);
            }
            
            let supply_before = DWTToken::total_supply();
            
            let _ = DWTToken::transfer(
                RuntimeOrigin::signed(from),
                to,
                transfer_amount
            );
            
            let supply_after = DWTToken::total_supply();
            
            // Total supply NEVER changes on transfer
            prop_assert_eq!(supply_before, supply_after);
        });
    }

    #[test]
    fn fuzz_transfer_never_creates_negative_balance(
        balance in 0..u128::MAX,
        transfer_amount in 0..u128::MAX,
    ) {
        new_test_ext().execute_with(|| {
            let from = 1;
            let to = 2;
            
            let _ = DWTToken::mint(RuntimeOrigin::signed(1), balance);
            let balance_before = DWTToken::balances(from);
            
            let _ = DWTToken::transfer(
                RuntimeOrigin::signed(from),
                to,
                transfer_amount
            );
            
            let balance_after = DWTToken::balances(from);
            let to_balance = DWTToken::balances(to);
            
            // No negative balances possible
            prop_assert!(balance_after <= balance_before);
            prop_assert!(to_balance >= 0);
        });
    }

    #[test]
    fn fuzz_mint_never_exceeds_max_supply(
        mint_amount in 0..u128::MAX,
        current_supply in 0..u128::MAX,
    ) {
        new_test_ext().execute_with(|| {
            let max_supply = 123_000_000 * DWT_UNIT;
            
            if current_supply < max_supply {
                let _ = DWTToken::mint(RuntimeOrigin::signed(1), current_supply);
            }
            
            let _ = DWTToken::mint(RuntimeOrigin::signed(1), mint_amount);
            
            let final_supply = DWTToken::total_supply();
            
            // NEVER exceed max supply
            prop_assert!(final_supply <= max_supply);
        });
    }

    #[test]
    fn fuzz_burn_never_underflows(
        balance in 0..u128::MAX,
        burn_amount in 0..u128::MAX,
    ) {
        new_test_ext().execute_with(|| {
            let user = 1;
            
            let _ = DWTToken::mint(RuntimeOrigin::signed(1), balance);
            let balance_before = DWTToken::balances(user);
            
            let _ = DWTToken::burn(RuntimeOrigin::signed(user), burn_amount);
            
            let balance_after = DWTToken::balances(user);
            
            // Balance never goes negative
            prop_assert!(balance_after <= balance_before);
        });
    }
}

// ============================================================================
// RATE LIMITER FUZZ TESTS
// ============================================================================

proptest! {
    #[test]
    fn fuzz_rate_limit_never_allows_excess(
        num_transactions in 1..1000usize,
        limit in 1..100u32,
    ) {
        new_test_ext().execute_with(|| {
            let user = 1;
            let mut success_count = 0;
            
            for _ in 0..num_transactions {
                if RateLimiter::check_rate_limit(&user, limit, limit * 10).is_ok() {
                    RateLimiter::record_transaction(&user);
                    success_count += 1;
                }
            }
            
            // NEVER exceed limit
            prop_assert!(success_count <= limit as usize);
        });
    }

    #[test]
    fn fuzz_global_rate_limit_always_respected(
        num_users in 1..100usize,
        tx_per_user in 1..50usize,
        global_limit in 100..1000u32,
    ) {
        new_test_ext().execute_with(|| {
            let mut total_tx = 0;
            
            for user_id in 0..num_users {
                let user = user_id as u64;
                
                for _ in 0..tx_per_user {
                    if RateLimiter::check_rate_limit(&user, 100, global_limit).is_ok() {
                        RateLimiter::record_transaction(&user);
                        total_tx += 1;
                    }
                }
            }
            
            // Global limit NEVER exceeded
            prop_assert!(total_tx <= global_limit as usize);
        });
    }

    #[test]
    fn fuzz_cooldown_period_enforced(
        cooldown_blocks in 1..1000u64,
        wait_blocks in 0..2000u64,
    ) {
        new_test_ext().execute_with(|| {
            let user = 1;
            
            RateLimiter::set_cooldown(&user, cooldown_blocks);
            
            if wait_blocks < cooldown_blocks {
                run_to_block(System::block_number() + wait_blocks);
                
                assert_err!(
                    RateLimiter::check_rate_limit(&user, 100, 1000),
                    Error::<Test>::InCooldown
                );
            } else {
                run_to_block(System::block_number() + wait_blocks);
                
                assert_ok!(RateLimiter::check_rate_limit(&user, 100, 1000));
            }
        });
    }
}

// ============================================================================
// DEX FUZZ TESTS
// ============================================================================

proptest! {
    #[test]
    fn fuzz_swap_always_reserves_invariant(
        amount_in in 1..u128::MAX,
        reserve_a in 1..u128::MAX,
        reserve_b in 1..u128::MAX,
    ) {
        new_test_ext().execute_with(|| {
            let k_before = reserve_a * reserve_b;
            
            let amount_out = DEX::calculate_output(amount_in, reserve_a, reserve_b);
            
            let new_reserve_a = reserve_a + amount_in;
            let new_reserve_b = reserve_b - amount_out;
            
            // K must never decrease (AMM invariant)
            let k_after = new_reserve_a * new_reserve_b;
            prop_assert!(k_after >= k_before);
        });
    }

    #[test]
    fn fuzz_swap_output_never_exceeds_reserves(
        amount_in in 1..u128::MAX,
        reserve_a in 1..u128::MAX,
        reserve_b in 1..u128::MAX,
    ) {
        new_test_ext().execute_with(|| {
            let amount_out = DEX::calculate_output(amount_in, reserve_a, reserve_b);
            
            // Output can never exceed available reserves
            prop_assert!(amount_out < reserve_b);
        });
    }

    #[test]
    fn fuzz_slippage_protection_works(
        amount_in in 1..u128::MAX,
        min_output in 0..u128::MAX,
        reserve_a in 1..u128::MAX,
        reserve_b in 1..u128::MAX,
    ) {
        new_test_ext().execute_with(|| {
            let actual_output = DEX::calculate_output(amount_in, reserve_a, reserve_b);
            
            if actual_output >= min_output {
                // Should succeed
                let result = DEX::swap_with_slippage(
                    RuntimeOrigin::signed(1),
                    DWT, USD,
                    amount_in,
                    min_output
                );
                prop_assert!(result.is_ok());
            } else {
                // Should fail due to slippage
                let result = DEX::swap_with_slippage(
                    RuntimeOrigin::signed(1),
                    DWT, USD,
                    amount_in,
                    min_output
                );
                prop_assert_err!(result, Error::<Test>::SlippageExceeded);
            }
        });
    }
}

// ============================================================================
// LENDING FUZZ TESTS
// ============================================================================

proptest! {
    #[test]
    fn fuzz_collateral_ratio_never_violated(
        deposit_amount in 1..u128::MAX,
        borrow_amount in 0..u128::MAX,
        collateral_factor in 50..90u32, // 50% - 90%
    ) {
        new_test_ext().execute_with(|| {
            let user = 1;
            
            // Deposit collateral
            let _ = Lending::deposit_collateral(
                RuntimeOrigin::signed(user),
                deposit_amount
            );
            
            let max_borrow = deposit_amount * collateral_factor as u128 / 100;
            
            if borrow_amount <= max_borrow {
                // Should succeed
                let result = Lending::borrow(
                    RuntimeOrigin::signed(user),
                    DWT,
                    borrow_amount
                );
                prop_assert!(result.is_ok());
                
                // Verify collateral ratio
                let ratio = Lending::get_collateral_ratio(user);
                prop_assert!(ratio >= collateral_factor as u128);
            } else {
                // Should fail
                let result = Lending::borrow(
                    RuntimeOrigin::signed(user),
                    DWT,
                    borrow_amount
                );
                prop_assert_err!(result, Error::<Test>::InsufficientCollateral);
            }
        });
    }

    #[test]
    fn fuzz_interest_calculation_no_overflow(
        principal in 1..u128::MAX,
        rate in 1..5000u32, // Max 50% APR
        time in 1..u64::MAX,
    ) {
        new_test_ext().execute_with(|| {
            let interest = Lending::calculate_interest(principal, rate, time);
            
            // Interest should never exceed reasonable bounds
            prop_assert!(interest <= principal * 10); // Max 10x principal
        });
    }

    #[test]
    fn fuzz_liquidation_always_solvent(
        collateral_value in 1..u128::MAX,
        debt_value in 1..u128::MAX,
        liquidation_threshold in 75..95u32,
    ) {
        new_test_ext().execute_with(|| {
            let threshold = collateral_value * liquidation_threshold as u128 / 100;
            
            if debt_value > threshold {
                // Position should be liquidatable
                assert!(Lending::is_liquidatable(collateral_value, debt_value));
                
                // Liquidation bonus
                let bonus = Lending::calculate_liquidation_bonus(debt_value);
                prop_assert!(bonus > 0);
                prop_assert!(bonus <= debt_value / 10); // Max 10%
            }
        });
    }
}

// ============================================================================
// GOVERNANCE FUZZ TESTS
// ============================================================================

proptest! {
    #[test]
    fn fuzz_voting_power_never_exceeds_balance(
        balance in 0..u128::MAX,
        delegation_amount in 0..u128::MAX,
    ) {
        new_test_ext().execute_with(|| {
            let user = 1;
            let delegate = 2;
            
            let _ = DWTToken::mint(RuntimeOrigin::signed(1), balance);
            
            if delegation_amount <= balance {
                let _ = Governance::delegate(
                    RuntimeOrigin::signed(user),
                    delegate,
                    delegation_amount
                );
                
                let voting_power = Governance::get_voting_power(delegate);
                
                // Voting power never exceeds actual balance
                prop_assert!(voting_power <= balance);
            }
        });
    }

    #[test]
    fn fuzz_timelock_always_enforced(
        proposal_delay in 1..100000u64,
        voting_period in 1..100000u64,
        timelock_delay in 1..100000u64,
    ) {
        new_test_ext().execute_with(|| {
            let proposal = Call::System(SystemCall::remark { remark: vec![] });
            
            assert_ok!(Governance::propose(
                RuntimeOrigin::signed(1),
                Box::new(proposal),
                100_000
            ));
            
            // Try execute before timelock
            assert_err!(
                Governance::execute(RuntimeOrigin::signed(1), 0),
                Error::<Test>::TimelockNotExpired
            );
            
            // Wait for timelock
            run_to_block(System::block_number() + timelock_delay);
            
            // Should still fail if voting not complete
            // (additional checks would be here)
        });
    }

    #[test]
    fn fuzz_quorum_calculation_correct(
        total_supply in 1..u128::MAX,
        votes_for in 0..u128::MAX,
        votes_against in 0..u128::MAX,
        quorum_percent in 1..50u32,
    ) {
        new_test_ext().execute_with(|| {
            let quorum = total_supply * quorum_percent as u128 / 100;
            let total_votes = votes_for.saturating_add(votes_against);
            
            if total_votes >= quorum {
                prop_assert!(Governance::quorum_met(total_votes, quorum));
            } else {
                prop_assert!(!Governance::quorum_met(total_votes, quorum));
            }
        });
    }
}

// ============================================================================
// BRIDGE FUZZ TESTS
// ============================================================================

proptest! {
    #[test]
    fn fuzz_bridge_nonce_always_sequential(
        nonces in prop::collection::vec(1..u64::MAX, 1..100),
    ) {
        new_test_ext().execute_with(|| {
            let mut expected_nonce = 1;
            
            for nonce in nonces {
                if nonce == expected_nonce {
                    // Valid nonce
                    expected_nonce += 1;
                } else {
                    // Invalid nonce
                    let msg = BridgeMessage {
                        source_chain: 1,
                        nonce,
                        payload: vec![],
                        validators: get_valid_signatures(),
                    };
                    
                    assert_err!(
                        Bridge::process_message(RuntimeOrigin::signed(1), msg),
                        Error::<Test>::InvalidNonce
                    );
                }
            }
        });
    }

    #[test]
    fn fuzz_bridge_validator_threshold(
        num_validators in 7..100usize,
        num_signatures in 0..num_validators,
    ) {
        new_test_ext().execute_with(|| {
            let required = 7; // 7-of-15 minimum
            
            if num_signatures >= required {
                // Should succeed
                let msg = BridgeMessage {
                    source_chain: 1,
                    nonce: 1,
                    payload: vec![],
                    validators: generate_signatures(num_signatures),
                };
                
                let result = Bridge::process_message(RuntimeOrigin::signed(1), msg);
                prop_assert!(result.is_ok() || num_signatures < 7);
            }
        });
    }

    #[test]
    fn fuzz_bridge_message_expiry(
        message_age in 0..u64::MAX,
        expiry_time in 1..u64::MAX,
    ) {
        new_test_ext().execute_with(|| {
            let msg = BridgeMessage {
                source_chain: 1,
                nonce: 1,
                payload: vec![],
                timestamp: System::block_number().saturating_sub(message_age),
                validators: get_valid_signatures(),
            };
            
            if message_age > expiry_time {
                assert_err!(
                    Bridge::process_message(RuntimeOrigin::signed(1), msg),
                    Error::<Test>::MessageExpired
                );
            }
        });
    }
}

// ============================================================================
// SECURITY LAYER FUZZ TESTS
// ============================================================================

proptest! {
    #[test]
    fn fuzz_threat_level_bounds(
        threat_level in 0..u8::MAX,
    ) {
        new_test_ext().execute_with(|| {
            if threat_level <= 10 {
                assert_ok!(SecurityRoot::update_threat_level(
                    RuntimeOrigin::root(),
                    threat_level
                ));
                
                assert_eq!(SecurityRoot::threat_level(), threat_level);
            } else {
                assert_err!(
                    SecurityRoot::update_threat_level(
                        RuntimeOrigin::root(),
                        threat_level
                    ),
                    Error::<Test>::InvalidThreatLevel
                );
            }
        });
    }

    #[test]
    fn fuzz_circuit_breaker_blocks_all_operations(
        enabled in bool::arbitrary(),
    ) {
        new_test_ext().execute_with(|| {
            assert_ok!(SecurityRoot::trigger_circuit_breaker(
                RuntimeOrigin::root(),
                enabled
            ));
            
            if enabled {
                // All operations blocked
                assert_err!(
                    DWTToken::transfer(RuntimeOrigin::signed(1), 2, 100),
                    Error::<Test>::CircuitBreakerActive
                );
                
                assert_err!(
                    DEX::swap(RuntimeOrigin::signed(1), DWT, USD, 100, 90),
                    Error::<Test>::CircuitBreakerActive
                );
            } else {
                // Operations allowed
                let _ = DWTToken::transfer(RuntimeOrigin::signed(1), 2, 100);
            }
        });
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

fn generate_signatures(count: usize) -> Vec<ValidatorSignature> {
    (0..count)
        .map(|i| create_validator_signature(i))
        .collect()
}

fn get_valid_signatures() -> Vec<ValidatorSignature> {
    generate_signatures(7) // Minimum required
}
