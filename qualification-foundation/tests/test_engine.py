#!/usr/bin/env python3
"""
Tests for qualification/engine.py.

These tests exist to prove one thing above all else: the engine cannot
be driven to READY by a module's own say-so. Every negative test here
corresponds directly to a row in the "Mandatory engine rules" table from
the project record. If any of these fail, the Two-Actor Evidence Rule is
not actually enforced and the engine must not be used.

Run with: python3 -I -m pytest tests/test_engine.py -v
(or, with no pytest available: python3 -I tests/test_engine.py)
"""

from __future__ import annotations

import copy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from qualification.engine import (  # noqa: E402
    QualificationDecision,
    RejectReason,
    evaluate_module_asset,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def make_module_event(**overrides) -> dict:
    base = {
        "event_id": "11111111-1111-1111-1111-111111111111",
        "exercise_id": "NK-COMP-001",
        "operation_id": "OP-RED-001",
        "participant_id": "P001",
        "asset_id": "ASSET-001",
        "module_id": "NK-EM-002",
        "module_version": "1.1.0",
        "cleanup_state": "cleanup_pending",
        "observations": {
            "artifact_created": True,
            "artifact_unlink_attempted": True,
        },
    }
    base.update(overrides)
    return base


def make_verifier_event(**overrides) -> dict:
    base = {
        "verifier_module_id": "NK-EM-002-VERIFY",
        "verified_event_id": "11111111-1111-1111-1111-111111111111",
        "exercise_id": "NK-COMP-001",
        "operation_id": "OP-RED-001",
        "participant_id": "P001",
        "asset_id": "ASSET-001",
        "source_module_id": "NK-EM-002",
        "source_cleanup_state": "cleanup_pending",
        "result": "cleanup_verified",
    }
    base.update(overrides)
    return base


PASS = 0
FAIL = 0


def check(name: str, condition: bool, extra: str = "") -> None:
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  PASS  {name}")
    else:
        FAIL += 1
        print(f"  FAIL  {name}  {extra}")


# ---------------------------------------------------------------------------
# 1. Positive case — this is the ONLY shape that should ever reach READY
# ---------------------------------------------------------------------------

def test_positive_case_reaches_ready():
    result = evaluate_module_asset(make_module_event(), make_verifier_event())
    check(
        "clean, correlated, verified pair -> READY",
        result.decision == QualificationDecision.READY,
        f"got {result.decision} / {result.reasons}",
    )


# ---------------------------------------------------------------------------
# 2. Missing evidence (mandatory rules table, rows 1-2)
# ---------------------------------------------------------------------------

def test_missing_verifier_event_blocks():
    result = evaluate_module_asset(make_module_event(), None)
    check(
        "no verifier event at all -> BLOCKED (never READY)",
        result.decision == QualificationDecision.BLOCKED
        and RejectReason.MISSING_VERIFIER_EVENT in result.reasons,
        f"got {result.decision} / {result.reasons}",
    )


def test_missing_module_event_blocks():
    result = evaluate_module_asset(None, make_verifier_event())
    check(
        "no module event at all -> BLOCKED",
        result.decision == QualificationDecision.BLOCKED
        and RejectReason.MISSING_MODULE_EVENT in result.reasons,
        f"got {result.decision} / {result.reasons}",
    )


def test_module_still_cleanup_pending_only_blocks():
    # Module event is fine, but no verifier ran at all yet (None case above
    # covers that); this covers the case where the module event itself
    # somehow reports something other than cleanup_pending while a
    # verifier event does exist (malformed sequencing).
    result = evaluate_module_asset(
        make_module_event(cleanup_state="cleanup_failed"),
        make_verifier_event(),
    )
    check(
        "module reported cleanup_failed -> BLOCKED even if a verifier event exists",
        result.decision == QualificationDecision.BLOCKED,
        f"got {result.decision} / {result.reasons}",
    )


# ---------------------------------------------------------------------------
# 3. Verifier reports failure (mandatory rules table, row 3)
# ---------------------------------------------------------------------------

def test_verifier_reports_failure_blocks():
    result = evaluate_module_asset(
        make_module_event(), make_verifier_event(result="cleanup_failed")
    )
    check(
        "verifier result=cleanup_failed -> BLOCKED",
        result.decision == QualificationDecision.BLOCKED
        and RejectReason.MISSING_VERIFIER_EVENT in result.reasons,
        f"got {result.decision} / {result.reasons}",
    )


# ---------------------------------------------------------------------------
# 4. Event ID mismatch (mandatory rules table, row 4)
# ---------------------------------------------------------------------------

def test_event_id_mismatch_rejected():
    result = evaluate_module_asset(
        make_module_event(),
        make_verifier_event(verified_event_id="99999999-9999-9999-9999-999999999999"),
    )
    check(
        "verifier's verified_event_id does not match module's event_id -> REJECTED",
        result.decision == QualificationDecision.REJECTED
        and RejectReason.EVENT_ID_MISMATCH in result.reasons,
        f"got {result.decision} / {result.reasons}",
    )


# ---------------------------------------------------------------------------
# 5. Unknown module ID (mandatory rules table, row 5)
# ---------------------------------------------------------------------------

def test_unknown_module_id_rejected():
    result = evaluate_module_asset(
        make_module_event(module_id="NK-EM-999"),
        make_verifier_event(source_module_id="NK-EM-999",
                             verifier_module_id="NK-EM-999-VERIFY"),
    )
    check(
        "module_id not in known-module registry -> REJECTED",
        result.decision == QualificationDecision.REJECTED
        and RejectReason.UNKNOWN_MODULE_ID in result.reasons,
        f"got {result.decision} / {result.reasons}",
    )


# ---------------------------------------------------------------------------
# 6. Invalid schema (mandatory rules table, row 6)
# ---------------------------------------------------------------------------

def test_invalid_module_schema_rejected():
    bad_event = make_module_event()
    del bad_event["asset_id"]
    result = evaluate_module_asset(bad_event, make_verifier_event())
    check(
        "module event missing required field -> REJECTED",
        result.decision == QualificationDecision.REJECTED
        and RejectReason.INVALID_MODULE_SCHEMA in result.reasons,
        f"got {result.decision} / {result.reasons}",
    )


def test_invalid_verifier_schema_rejected():
    bad_event = make_verifier_event()
    del bad_event["result"]
    result = evaluate_module_asset(make_module_event(), bad_event)
    check(
        "verifier event missing required field -> REJECTED",
        result.decision == QualificationDecision.REJECTED
        and RejectReason.INVALID_VERIFIER_SCHEMA in result.reasons,
        f"got {result.decision} / {result.reasons}",
    )


def test_garbage_input_types_rejected():
    result = evaluate_module_asset("not a dict", 12345)
    check(
        "non-dict inputs -> REJECTED, not a crash",
        result.decision == QualificationDecision.REJECTED,
        f"got {result.decision} / {result.reasons}",
    )


# ---------------------------------------------------------------------------
# 7. Conflicting verification records (mandatory rules table, row 7)
# ---------------------------------------------------------------------------

def test_conflicting_identity_fields_rejected():
    result = evaluate_module_asset(
        make_module_event(participant_id="P001"),
        make_verifier_event(participant_id="P002"),  # different participant
    )
    check(
        "module/verifier disagree on participant_id -> REJECTED",
        result.decision == QualificationDecision.REJECTED
        and RejectReason.IDENTITY_MISMATCH in result.reasons,
        f"got {result.decision} / {result.reasons}",
    )


def test_wrong_verifier_for_module_rejected():
    # A verifier event that claims to verify NK-EM-002 but under a
    # verifier_module_id that isn't NK-EM-002's registered verifier.
    result = evaluate_module_asset(
        make_module_event(),
        make_verifier_event(verifier_module_id="SOME-OTHER-VERIFIER"),
    )
    check(
        "verifier_module_id is not the module's registered verifier -> REJECTED",
        result.decision == QualificationDecision.REJECTED
        and RejectReason.IDENTITY_MISMATCH in result.reasons,
        f"got {result.decision} / {result.reasons}",
    )


# ---------------------------------------------------------------------------
# 8. THE central guarantee: self-certification is impossible.
#    This is the test block that matters most. It proves that no matter
#    how a module event is shaped, if it asserts its own verification
#    outcome, the engine refuses to honor that assertion -- even when
#    every other field is otherwise perfectly valid and even when a
#    genuinely passing verifier event accompanies it.
# ---------------------------------------------------------------------------

def test_self_certification_field_rejected_even_with_valid_verifier():
    for forbidden_field in (
        "independent_verification",
        "independent_cleanup_verification",
        "cleanup_verified",
        "verified",
    ):
        tampered = make_module_event()
        tampered[forbidden_field] = True
        result = evaluate_module_asset(tampered, make_verifier_event())
        check(
            f"module event self-asserting {forbidden_field}=True -> REJECTED "
            f"(even with a genuinely valid verifier event present)",
            result.decision == QualificationDecision.REJECTED
            and RejectReason.SELF_CERTIFICATION_DETECTED in result.reasons,
            f"got {result.decision} / {result.reasons}",
        )


def test_self_certification_in_observations_block_rejected():
    tampered = make_module_event()
    tampered["observations"]["independent_cleanup_verification"] = True
    result = evaluate_module_asset(tampered, make_verifier_event())
    check(
        "self-certification field nested under observations{} is still caught",
        result.decision == QualificationDecision.REJECTED
        and RejectReason.SELF_CERTIFICATION_DETECTED in result.reasons,
        f"got {result.decision} / {result.reasons}",
    )


def test_module_claiming_success_directly_blocks_not_ready():
    # Even without a forbidden field name, a module that reports
    # cleanup_state outside {cleanup_pending, cleanup_failed} (e.g. an
    # attempt to invent "cleanup_verified" at the module level) must be
    # rejected as an invalid state, never accepted as proof.
    tampered = make_module_event(cleanup_state="cleanup_verified")
    result = evaluate_module_asset(tampered, make_verifier_event())
    check(
        "module event claiming cleanup_state=cleanup_verified directly -> REJECTED "
        "(that state may only be emitted by the verifier, never the module)",
        result.decision == QualificationDecision.REJECTED,
        f"got {result.decision} / {result.reasons}",
    )


# ---------------------------------------------------------------------------
# 9. Daily-driver restriction
# ---------------------------------------------------------------------------

def test_daily_driver_restriction_blocks_ineligible_module():
    import qualification.engine as engine_module

    # Temporarily register a module that is NOT daily-driver eligible to
    # prove the restriction path independent of NK-EM-002's own (True)
    # eligibility flag.
    original = copy.deepcopy(engine_module.KNOWN_MODULES)
    engine_module.KNOWN_MODULES["NK-EM-TEST-RESTRICTED"] = {
        "expected_verifier_module_id": "NK-EM-TEST-RESTRICTED-VERIFY",
        "daily_driver_eligible": False,
        "reversibility_level": "R2",
    }
    try:
        mod_event = make_module_event(module_id="NK-EM-TEST-RESTRICTED")
        ver_event = make_verifier_event(
            source_module_id="NK-EM-TEST-RESTRICTED",
            verifier_module_id="NK-EM-TEST-RESTRICTED-VERIFY",
        )
        result = evaluate_module_asset(
            mod_event, ver_event, asset_restrictions={"classification": "DAILY_DRIVER"}
        )
        check(
            "daily-driver asset + non-eligible module -> BLOCKED even with valid cleanup",
            result.decision == QualificationDecision.BLOCKED
            and RejectReason.DAILY_DRIVER_RESTRICTION_VIOLATED in result.reasons,
            f"got {result.decision} / {result.reasons}",
        )
    finally:
        engine_module.KNOWN_MODULES.clear()
        engine_module.KNOWN_MODULES.update(original)


def test_daily_driver_restriction_allows_eligible_module():
    result = evaluate_module_asset(
        make_module_event(),  # NK-EM-002, which IS daily_driver_eligible
        make_verifier_event(),
        asset_restrictions={"classification": "DAILY_DRIVER"},
    )
    check(
        "daily-driver asset + eligible module (NK-EM-002) -> READY",
        result.decision == QualificationDecision.READY,
        f"got {result.decision} / {result.reasons}",
    )


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

ALL_TESTS = [
    test_positive_case_reaches_ready,
    test_missing_verifier_event_blocks,
    test_missing_module_event_blocks,
    test_module_still_cleanup_pending_only_blocks,
    test_verifier_reports_failure_blocks,
    test_event_id_mismatch_rejected,
    test_unknown_module_id_rejected,
    test_invalid_module_schema_rejected,
    test_invalid_verifier_schema_rejected,
    test_garbage_input_types_rejected,
    test_conflicting_identity_fields_rejected,
    test_wrong_verifier_for_module_rejected,
    test_self_certification_field_rejected_even_with_valid_verifier,
    test_self_certification_in_observations_block_rejected,
    test_module_claiming_success_directly_blocks_not_ready,
    test_daily_driver_restriction_blocks_ineligible_module,
    test_daily_driver_restriction_allows_eligible_module,
]


def main() -> int:
    print(f"Running {len(ALL_TESTS)} qualification engine tests...\n")
    for t in ALL_TESTS:
        t()
    print(f"\n{PASS} passed, {FAIL} failed")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
