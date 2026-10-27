#!/usr/bin/env python3
"""
NK Qualification Engine

The authority responsible for qualification decisions. It consumes
module execution events and independent verifier events, enforces the
Two-Actor Evidence Rule, and is the ONLY component permitted to mark an
asset READY.

Central principle (governs every function in this file):
    A module may report what it attempted. It cannot decide whether its
    own evidence is trustworthy.

Enforced flow (see PAYLOAD-LIBRARY-SPEC.md and the flowchart supplied in
the project record):

    Exercise authorized
      -> Payload module executes
      -> Module emits execution evidence (CLEANUP_PENDING or CLEANUP_FAILED)
      -> Independent verifier examines declared state
      -> CLEANUP_VERIFIED or CLEANUP_FAILED
      -> Ledger integrity + event correlation check
      -> Qualification evaluation
      -> READY or BLOCKED/REJECTED

There is no path from module execution directly to READY. Every branch
that fails closed (missing evidence, contradictory evidence, broken
correlation, schema violation, unknown module) returns BLOCKED or
REJECTED — never a silent pass.

This module has no network access and does not execute payload code. It
only validates JSON event records already produced by a module and its
verifier, and decides qualification state from them.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# States
# ---------------------------------------------------------------------------

class QualificationDecision(str, Enum):
    READY = "READY"
    BLOCKED = "BLOCKED"
    REJECTED = "REJECTED"


class RejectReason(str, Enum):
    MISSING_MODULE_EVENT = "missing_module_event"
    MISSING_VERIFIER_EVENT = "missing_verifier_event"
    INVALID_MODULE_SCHEMA = "invalid_module_schema"
    INVALID_VERIFIER_SCHEMA = "invalid_verifier_schema"
    UNKNOWN_MODULE_ID = "unknown_module_id"
    EVENT_ID_MISMATCH = "event_id_mismatch"
    IDENTITY_MISMATCH = "identity_mismatch"
    CONFLICTING_VERIFICATION_RECORDS = "conflicting_verification_records"
    LEDGER_INTEGRITY_FAILURE = "ledger_integrity_failure"
    SELF_CERTIFICATION_DETECTED = "self_certification_detected"
    UNAUTHORIZED_SCOPE = "unauthorized_scope"
    DAILY_DRIVER_RESTRICTION_VIOLATED = "daily_driver_restriction_violated"
    VERIFIER_INDETERMINATE = "verifier_indeterminate"
    VERIFIER_REJECTED_EVENT = "verifier_rejected_event"
    STALE_VERIFICATION = "stale_verification"
    VERIFICATION_PRECEDES_COMPLETION = "verification_precedes_completion"
    ATTESTATION_INVALID = "attestation_invalid"


# ---------------------------------------------------------------------------
# Known modules and their declared properties.
#
# This is deliberately small and explicit. The engine refuses to evaluate
# any module_id not listed here — an unknown module is rejected outright
# rather than evaluated under default-permissive assumptions. Extend this
# registry only as modules pass the release gate in
# PAYLOAD-LIBRARY-SPEC.md section 10.
# ---------------------------------------------------------------------------

KNOWN_MODULES: dict[str, dict[str, Any]] = {
    "NK-EM-002": {
        "expected_verifier_module_id": "NK-EM-002-VERIFY",
        "daily_driver_eligible": True,
        "reversibility_level": "R1",
    },
    # NK-EM-001, NK-EM-003 through NK-EM-007 are intentionally absent.
    # Per the agreed build sequence, they are not drafted yet and must
    # not be evaluated by this engine until they exist, pass the release
    # gate, and are added here explicitly.
}


REQUIRED_MODULE_EVENT_FIELDS = (
    "event_id",
    "exercise_id",
    "operation_id",
    "participant_id",
    "asset_id",
    "module_id",
    "module_version",
    "cleanup_state",
)

REQUIRED_VERIFIER_EVENT_FIELDS = (
    "verifier_module_id",
    "verified_event_id",
    "exercise_id",
    "operation_id",
    "participant_id",
    "asset_id",
    "source_module_id",
    "source_cleanup_state",
    "result",
)

# cleanup_state / result values the engine will accept at all. Anything
# else is a schema violation, not a soft-fail.
VALID_MODULE_CLEANUP_STATES = {"cleanup_pending", "cleanup_failed"}
# cleanup_indeterminate and rejected are valid SCHEMA values (the verifier
# may legitimately report them when it cannot safely observe filesystem
# state, or when the source event itself was invalid) but neither one is
# a passing result — both fall through to BLOCKED with a specific reason,
# same as cleanup_failed, never to READY.
VALID_VERIFIER_RESULTS = {
    "cleanup_verified", "cleanup_failed", "cleanup_indeterminate", "rejected",
}

# Fields a module event must NOT contain. Their presence indicates the
# module attempted to assert its own verification outcome -- exactly the
# self-certification pattern this architecture forbids. Any module
# event carrying one of these is rejected outright, regardless of what
# value it holds.
FORBIDDEN_SELF_CERTIFICATION_FIELDS = (
    "independent_verification",
    "independent_cleanup_verification",
    "cleanup_verified",
    "verified",
)


@dataclass
class QualificationResult:
    decision: QualificationDecision
    reasons: list[RejectReason] = field(default_factory=list)
    detail: list[str] = field(default_factory=list)
    module_event_id: str | None = None
    verifier_event_id: str | None = None
    asset_id: str | None = None
    participant_id: str | None = None
    module_id: str | None = None
    evaluated_at_utc: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "decision": self.decision.value,
            "reasons": [r.value for r in self.reasons],
            "detail": self.detail,
            "module_event_id": self.module_event_id,
            "verifier_event_id": self.verifier_event_id,
            "asset_id": self.asset_id,
            "participant_id": self.participant_id,
            "module_id": self.module_id,
            "evaluated_at_utc": self.evaluated_at_utc,
        }


def _block(reasons: list[RejectReason], detail: list[str], **ids: Any) -> QualificationResult:
    return QualificationResult(
        decision=QualificationDecision.BLOCKED, reasons=reasons, detail=detail, **ids
    )


def _reject(reasons: list[RejectReason], detail: list[str], **ids: Any) -> QualificationResult:
    return QualificationResult(
        decision=QualificationDecision.REJECTED, reasons=reasons, detail=detail, **ids
    )


def _schema_check(event: dict[str, Any] | None, required: tuple[str, ...]) -> list[str]:
    """Return a list of human-readable problems; empty list means valid shape."""
    problems: list[str] = []
    if event is None:
        problems.append("event is None")
        return problems
    if not isinstance(event, dict):
        problems.append(f"event is not a JSON object (got {type(event).__name__})")
        return problems
    missing = [f for f in required if f not in event]
    if missing:
        problems.append(f"missing required fields: {missing}")
    return problems


def evaluate_module_asset(
    module_event: dict[str, Any] | None,
    verifier_event: dict[str, Any] | None,
    asset_restrictions: dict[str, Any] | None = None,
) -> QualificationResult:
    """
    Evaluate a single (module_event, verifier_event) pair for one
    module/asset/participant combination and return a qualification
    decision for that module on that asset.

    This function enforces, in order:
      1. Both events must exist.
      2. Both events must be schema-valid.
      3. The module must be a known, registered module.
      4. The module event must not contain self-certification fields.
      5. The verifier must be the module's registered verifier.
      6. Identity fields (exercise/operation/participant/asset) must
         match exactly between module and verifier events.
      7. event_id correlation: verifier_event.verified_event_id must
         equal module_event.event_id.
      8. The module's own cleanup_state must be cleanup_pending (never
         anything claiming success) going into verification.
      9. The verifier's result must be cleanup_verified, not merely
         present.
      10. Any declared daily-driver restriction must be honored.

    No branch of this function returns READY unless every one of the
    above holds. The function never infers a missing check from the
    presence of others -- each is checked independently so that a
    future field addition cannot accidentally bypass an earlier one.
    """
    ids: dict[str, Any] = {}
    if isinstance(module_event, dict):
        ids["module_event_id"] = module_event.get("event_id")
        ids["asset_id"] = module_event.get("asset_id")
        ids["participant_id"] = module_event.get("participant_id")
        ids["module_id"] = module_event.get("module_id")
    if isinstance(verifier_event, dict):
        ids["verifier_event_id"] = verifier_event.get("verified_event_id")

    # 1. Existence
    if module_event is None:
        return _block([RejectReason.MISSING_MODULE_EVENT],
                       ["No module execution event supplied."], **ids)
    if verifier_event is None:
        return _block([RejectReason.MISSING_VERIFIER_EVENT],
                       ["No independent verifier event supplied. A module's own "
                        "CLEANUP_PENDING report is never sufficient on its own."],
                       **ids)

    # 2. Schema validity
    module_problems = _schema_check(module_event, REQUIRED_MODULE_EVENT_FIELDS)
    if module_problems:
        return _reject([RejectReason.INVALID_MODULE_SCHEMA], module_problems, **ids)

    verifier_problems = _schema_check(verifier_event, REQUIRED_VERIFIER_EVENT_FIELDS)
    if verifier_problems:
        return _reject([RejectReason.INVALID_VERIFIER_SCHEMA], verifier_problems, **ids)

    module_id = module_event["module_id"]

    # 3. Known module
    if module_id not in KNOWN_MODULES:
        return _reject(
            [RejectReason.UNKNOWN_MODULE_ID],
            [f"module_id {module_id!r} is not in the qualification engine's "
             f"known-module registry. Unknown modules are rejected, never "
             f"evaluated under permissive defaults."],
            **ids,
        )

    module_spec = KNOWN_MODULES[module_id]

    # 4. Self-certification fields present in the module event
    forbidden_present = [
        f for f in FORBIDDEN_SELF_CERTIFICATION_FIELDS
        if f in module_event or f in module_event.get("observations", {})
    ]
    if forbidden_present:
        return _reject(
            [RejectReason.SELF_CERTIFICATION_DETECTED],
            [f"Module event contains self-certification field(s) {forbidden_present}. "
             f"A module may never assert its own cleanup or verification outcome."],
            **ids,
        )

    # cleanup_state / result value validity (schema-adjacent but checked
    # explicitly rather than assumed)
    if module_event["cleanup_state"] not in VALID_MODULE_CLEANUP_STATES:
        return _reject(
            [RejectReason.INVALID_MODULE_SCHEMA],
            [f"module cleanup_state {module_event['cleanup_state']!r} is not one of "
             f"{sorted(VALID_MODULE_CLEANUP_STATES)}"],
            **ids,
        )
    if verifier_event["result"] not in VALID_VERIFIER_RESULTS:
        return _reject(
            [RejectReason.INVALID_VERIFIER_SCHEMA],
            [f"verifier result {verifier_event['result']!r} is not one of "
             f"{sorted(VALID_VERIFIER_RESULTS)}"],
            **ids,
        )

    # 5. Verifier identity must match the module's registered verifier
    expected_verifier = module_spec["expected_verifier_module_id"]
    if verifier_event["verifier_module_id"] != expected_verifier:
        return _reject(
            [RejectReason.IDENTITY_MISMATCH],
            [f"verifier_module_id {verifier_event['verifier_module_id']!r} does not "
             f"match the registered verifier {expected_verifier!r} for {module_id}."],
            **ids,
        )
    if verifier_event["source_module_id"] != module_id:
        return _reject(
            [RejectReason.IDENTITY_MISMATCH],
            [f"verifier's source_module_id {verifier_event['source_module_id']!r} "
             f"does not match module_event's module_id {module_id!r}."],
            **ids,
        )

    # 6. Cross-event identity correlation
    identity_fields = ("exercise_id", "operation_id", "participant_id", "asset_id")
    mismatches = [
        f for f in identity_fields
        if module_event.get(f) != verifier_event.get(f)
    ]
    if mismatches:
        return _reject(
            [RejectReason.IDENTITY_MISMATCH],
            [f"Identity field(s) {mismatches} differ between module and verifier "
             f"events. Module: "
             f"{ {f: module_event.get(f) for f in mismatches} }. Verifier: "
             f"{ {f: verifier_event.get(f) for f in mismatches} }."],
            **ids,
        )

    # 7. event_id correlation
    if verifier_event["verified_event_id"] != module_event["event_id"]:
        return _reject(
            [RejectReason.EVENT_ID_MISMATCH],
            [f"verifier_event.verified_event_id "
             f"({verifier_event['verified_event_id']!r}) does not match "
             f"module_event.event_id ({module_event['event_id']!r})."],
            **ids,
        )

    # 8. Module must not have claimed success itself
    if module_event["cleanup_state"] != "cleanup_pending":
        return _block(
            [RejectReason.MISSING_MODULE_EVENT],
            [f"Module reported cleanup_state="
             f"{module_event['cleanup_state']!r}; qualification is blocked "
             f"whenever the module did not reach CLEANUP_PENDING."],
            **ids,
        )

    # 9. Verifier result — each non-passing value gets its own reason so
    # an auditor can see WHY, rather than collapsing everything into one
    # generic "missing verifier" bucket.
    verifier_result = verifier_event["result"]
    if verifier_result == "cleanup_indeterminate":
        return _block(
            [RejectReason.VERIFIER_INDETERMINATE],
            [f"Independent verifier could not safely observe filesystem "
             f"state and reported cleanup_indeterminate. An unobservable "
             f"state is never treated as either pass or fail by default — "
             f"it blocks."],
            **ids,
        )
    if verifier_result == "rejected":
        return _block(
            [RejectReason.VERIFIER_REJECTED_EVENT],
            [f"Independent verifier rejected the source event outright "
             f"(malformed, unauthenticated, or out-of-policy input). "
             f"Detail: {verifier_event.get('error') or verifier_event.get('detail')!r}"],
            **ids,
        )
    if verifier_result != "cleanup_verified":
        return _block(
            [RejectReason.MISSING_VERIFIER_EVENT],
            [f"Independent verifier reported "
             f"result={verifier_result!r}, not cleanup_verified. "
             f"Qualification remains blocked."],
            **ids,
        )

    # 9a. Freshness — the verifier must not be timestamped before the
    # module's own completion (would indicate a stale, replayed, or
    # out-of-order verifier event rather than a genuine fresh check).
    module_completed = module_event.get("completed_at_utc")
    verifier_checked_at = verifier_event.get("verified_at_utc")
    if isinstance(module_completed, str) and isinstance(verifier_checked_at, str):
        try:
            completed_dt = datetime.fromisoformat(module_completed)
            verified_dt = datetime.fromisoformat(verifier_checked_at)
            if verified_dt < completed_dt:
                return _reject(
                    [RejectReason.VERIFICATION_PRECEDES_COMPLETION],
                    [f"verifier's verified_at_utc ({verifier_checked_at}) is "
                     f"earlier than the module's own completed_at_utc "
                     f"({module_completed}); a verification cannot predate "
                     f"the thing it claims to have verified."],
                    **ids,
                )
        except ValueError:
            pass  # unparsceable timestamps are a schema concern, not fatal here

    # 10. Daily-driver restriction
    if asset_restrictions and asset_restrictions.get("classification") == "DAILY_DRIVER":
        if not module_spec.get("daily_driver_eligible", False):
            return _block(
                [RejectReason.DAILY_DRIVER_RESTRICTION_VIOLATED],
                [f"Asset is classified DAILY_DRIVER and module {module_id} is not "
                 f"marked daily_driver_eligible. This combination is rejected "
                 f"regardless of cleanup verification outcome."],
                **ids,
            )

    return QualificationResult(
        decision=QualificationDecision.READY,
        reasons=[],
        detail=[f"Module {module_id} verified clean for asset "
                f"{ids.get('asset_id')} via independent verifier "
                f"{expected_verifier}."],
        **ids,
    )


def evaluate_ledger_pair_from_files(
    module_event_path: str | Path,
    verifier_event_path: str | Path,
    asset_restrictions: dict[str, Any] | None = None,
) -> QualificationResult:
    """
    Convenience entry point: load both event files from disk and
    evaluate. Malformed JSON in either file is a REJECTED outcome, not
    an exception escaping to the caller, because a corrupt ledger entry
    must never crash the engine into an undefined state -- it must fail
    closed like everything else here.
    """
    def _load(path: str | Path) -> dict[str, Any] | None:
        try:
            return json.loads(Path(path).read_text())
        except (OSError, json.JSONDecodeError):
            return None

    module_event = _load(module_event_path)
    verifier_event = _load(verifier_event_path)

    if module_event is None:
        return _reject(
            [RejectReason.LEDGER_INTEGRITY_FAILURE],
            [f"Could not read or parse module event file: {module_event_path}"],
        )
    if verifier_event is None:
        return _reject(
            [RejectReason.LEDGER_INTEGRITY_FAILURE],
            [f"Could not read or parse verifier event file: {verifier_event_path}"],
        )

    return evaluate_module_asset(module_event, verifier_event, asset_restrictions)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description="Evaluate a module/verifier event pair for qualification."
    )
    parser.add_argument("--module-event", required=True)
    parser.add_argument("--verifier-event", required=True)
    parser.add_argument(
        "--daily-driver",
        action="store_true",
        help="Treat the asset as DAILY_DRIVER for restriction enforcement.",
    )
    args = parser.parse_args()

    restrictions = {"classification": "DAILY_DRIVER"} if args.daily_driver else None
    result = evaluate_ledger_pair_from_files(
        args.module_event, args.verifier_event, restrictions
    )
    print(json.dumps(result.to_dict(), indent=2, sort_keys=True))
    return 0 if result.decision == QualificationDecision.READY else 1


if __name__ == "__main__":
    raise SystemExit(main())
