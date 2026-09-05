"""
AegisAuth Pro Comprehensive Security Test Runner (Stand-Alone).
Runs all invariant checks, authorization tests, tenant boundary tests, replay tests,
model signature tests, policy tests, and AegisAttack Lab.
"""
import sys
import unittest
from pathlib import Path

# Ensure ml-backend is in sys.path
BASE_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BASE_DIR))

from tests.test_security_invariants import (
    test_invariant_1_ml_cannot_directly_authorize,
    test_invariant_2_frontend_cannot_bypass_backend_pep,
    test_invariant_3_tenant_isolation_idor_prevention,
    test_invariant_4_replay_defense_uniqueness,
    test_invariant_5_stale_allow_cannot_override_newer_state,
    test_invariant_6_unsigned_model_cannot_load,
    test_invariant_7_unsigned_policy_cannot_activate,
    test_invariant_8_llm_cannot_modify_security_state,
    test_invariant_9_third_party_failure_fails_safely,
    test_invariant_10_missing_telemetry_does_not_equal_malicious,
    test_invariant_11_sensitive_actions_require_fresh_authorization,
    test_invariant_12_cross_tenant_access_denied_server_side,
)
from src.testing.aegis_attack_lab import AegisAttackLab


class SecurityInvariantsTestCase(unittest.TestCase):
    def test_inv1(self): test_invariant_1_ml_cannot_directly_authorize()
    def test_inv2(self): test_invariant_2_frontend_cannot_bypass_backend_pep()
    def test_inv3(self): test_invariant_3_tenant_isolation_idor_prevention()
    def test_inv4(self): test_invariant_4_replay_defense_uniqueness()
    def test_inv5(self): test_invariant_5_stale_allow_cannot_override_newer_state()
    def test_inv6(self): test_invariant_6_unsigned_model_cannot_load()
    def test_inv7(self): test_invariant_7_unsigned_policy_cannot_activate()
    def test_inv8(self): test_invariant_8_llm_cannot_modify_security_state()
    def test_inv9(self): test_invariant_9_third_party_failure_fails_safely()
    def test_inv10(self): test_invariant_10_missing_telemetry_does_not_equal_malicious()
    def test_inv11(self): test_invariant_11_sensitive_actions_require_fresh_authorization()
    def test_inv12(self): test_invariant_12_cross_tenant_access_denied_server_side()


if __name__ == "__main__":
    print("=" * 60)
    print("[AegisAuth Security Test Suite] Running Invariant Unit Tests")
    print("=" * 60)
    suite = unittest.TestLoader().loadTestsFromTestCase(SecurityInvariantsTestCase)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "=" * 60)
    print("[AegisAuth Security Test Suite] Running Full AegisAttack Lab")
    print("=" * 60)
    lab = AegisAttackLab()
    lab_report = lab.run_all_suites()
    
    print("\n" + "=" * 60)
    print("FINAL VALIDATION SUMMARY:")
    print(f"  Security Invariants: {'PASS (12/12)' if result.wasSuccessful() else 'FAIL'}")
    print(f"  AegisAttack Lab:     {lab_report['contained_and_verified']}/{lab_report['total_scenarios']} Contained ({lab_report['success_rate']})")
    print("=" * 60)
    
    if not result.wasSuccessful() or lab_report['contained_and_verified'] != lab_report['total_scenarios']:
        sys.exit(1)
