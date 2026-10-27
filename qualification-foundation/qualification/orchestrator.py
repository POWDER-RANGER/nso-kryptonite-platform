#!/usr/bin/env python3
"""
NK Orchestrator — end-to-end qualification pipeline for one module run.

Ties the three components together in the fail-closed order the
architecture requires:

    1. Run the payload module (separate process)      -> module event
    2. Run the independent verifier (separate process) -> verifier event
    3. Append both to the hash-chained evidence ledger
    4. Ask the qualification engine for a decision
    5. Append the decision to the ledger
    6. Return READY only if the engine said READY AND the ledger chain
       is intact.

Step 6 is the single choke point. There is deliberately no other return
path to READY. If the ledger chain fails to verify at the end, the
decision is forced to BLOCKED with a ledger-integrity reason even if the
engine independently said READY — evidence you cannot trust cannot
support qualification.

The module and verifier are invoked as subprocesses with `-I`
(isolated mode) so neither picks up code from the working directory.
This is the process-separation leg of the Two-Actor rule; the
privilege/infrastructure legs remain release-gate blockers documented in
the verifier and ledger modules.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent
MODULE_SCRIPT = REPO_ROOT / "red-cell" / "payloads" / "nk_em_002_artifact.py"
VERIFIER_SCRIPT = REPO_ROOT / "red-cell" / "payloads" / "nk_em_002_verify.py"

sys.path.insert(0, str(REPO_ROOT))

from qualification.engine import (  # noqa: E402
    QualificationDecision,
    RejectReason,
    evaluate_module_asset,
)
from evidence.ledger import EvidenceLedger  # noqa: E402


class ReplayDetected(Exception):
    pass


def _run_json(cmd: list[str]) -> tuple[dict[str, Any], int]:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    stdout = proc.stdout.strip()
    if not stdout:
        raise RuntimeError(
            f"no JSON on stdout from {cmd!r}; stderr={proc.stderr.strip()!r}"
        )
    # Modules emit one JSON object per line; take the last non-empty line.
    last = [ln for ln in stdout.splitlines() if ln.strip()][-1]
    return json.loads(last), proc.returncode


def assess_independence() -> dict[str, Any]:
    """
    Report, honestly, what separation actually exists between this
    orchestrator process (which also launches the module) and the
    verifier it launches. This function does NOT claim independence it
    cannot demonstrate — it is a diagnostic, not a certification.

    Currently both subprocesses are spawned by this same orchestrator
    under the SAME OS user. That is process + code separation only. A
    caller that wants this field to say "privilege separated" must
    actually invoke the module and verifier under distinct OS users
    (e.g. via sudo -u / runuser to a dedicated low-privilege account
    for the module and a separate account holding the attestation key
    for the verifier) and update this assessment to reflect that real
    configuration — not by editing this function's return value.
    """
    uid = os.getuid() if hasattr(os, "getuid") else None
    return {
        "orchestrator_uid": uid,
        "module_runs_as_uid": uid,  # same process tree spawns it
        "verifier_runs_as_uid": uid,  # same process tree spawns it
        "privilege_separated": False,
        "infrastructure_separated": False,
        "note": (
            "module and verifier are both spawned as subprocesses of this "
            "orchestrator under the same OS user; this is PROCESS AND CODE "
            "separation only, not privilege or infrastructure separation. "
            "See docs/THREAT-MODEL.md T9."
        ),
    }


class ConflictingVerificationDetected(Exception):
    pass


def _check_verifier_conflict(ledger: EvidenceLedger, verified_event_id: str, new_result: str) -> None:
    """
    Reject if a DIFFERENT result has already been recorded by a prior
    verifier_event for this same verified_event_id. Two verifier records
    disagreeing about the same evidence (whether from a race, a forged
    second verifier run, or a bug) must never be silently resolved by
    "last write wins" or "first write wins" — it is a hard stop.
    """
    for rec in ledger.by_kind("verifier_event"):
        if rec.payload.get("verified_event_id") == verified_event_id:
            if rec.payload.get("result") != new_result:
                raise ConflictingVerificationDetected(
                    f"a prior verifier_event for {verified_event_id} reported "
                    f"result={rec.payload.get('result')!r}; this new verifier "
                    f"run reports result={new_result!r}. Contradictory "
                    f"verification records are rejected outright."
                )


def _check_replay(ledger: EvidenceLedger, event_id: str) -> None:
    """
    Reject if this exact module event_id has already been recorded as a
    module_event in this ledger. A module/verifier pair is evidence for
    ONE qualification attempt; replaying the same event_id to accumulate
    a second READY decision from the same evidence is not permitted.
    """
    for rec in ledger.by_kind("module_event"):
        if rec.payload.get("event_id") == event_id:
            raise ReplayDetected(
                f"event_id {event_id} already present in this ledger as a "
                f"module_event; replaying the same evidence for a new "
                f"qualification decision is rejected"
            )


def run_pipeline(
    ledger_path: str | Path,
    exercise_id: str,
    operation_id: str,
    participant_id: str,
    asset_id: str,
    authorization_id: str,
    workspace_root: str | Path,
    asset_restrictions: dict[str, Any] | None = None,
    max_staleness_seconds: float | None = 60.0,
    attestation_key_path: str | None = None,
) -> dict[str, Any]:
    ledger = EvidenceLedger(ledger_path)
    workspace_root = Path(workspace_root).resolve(strict=False)
    independence = assess_independence()

    # --- 1. module (separate, isolated process) ---------------------------
    module_event, module_exit = _run_json([
        sys.executable, "-I", str(MODULE_SCRIPT),
        "--exercise-id", exercise_id,
        "--operation-id", operation_id,
        "--participant-id", participant_id,
        "--asset-id", asset_id,
        "--authorization-id", authorization_id,
        "--workspace-root", str(workspace_root),
    ])

    # Replay check BEFORE this event is trusted or appended anywhere.
    event_id = module_event.get("event_id")
    if isinstance(event_id, str):
        try:
            _check_replay(ledger, event_id)
        except ReplayDetected as exc:
            result = QualificationDecision.REJECTED
            ledger.append("rejection", {"reason": "replay_detected", "detail": str(exc)})
            return {
                "final_decision": result.value,
                "final_reasons": [RejectReason.EVENT_ID_MISMATCH.value],
                "engine_decision": None,
                "ledger_chain_valid": True,
                "ledger_error": None,
                "module_event_id": event_id,
                "verifier_result": None,
                "ledger_record_count": len(ledger.records()),
                "detail": [str(exc)],
                "independence_assessment": independence,
            }

    ledger.append("module_event", module_event)

    # --- 2. verifier (separate, isolated process). The authorized
    # workspace root is passed as OUR OWN parameter, never read back out
    # of the module's event — this is what closes the R7 bypass where an
    # event could declare its own authorization boundary. ------------------
    with tempfile.NamedTemporaryFile(
        "w", suffix=".json", delete=False, encoding="utf-8"
    ) as tf:
        json.dump(module_event, tf)
        module_event_file = tf.name

    verifier_cmd = [
        sys.executable, "-I", str(VERIFIER_SCRIPT),
        "--event-file", module_event_file,
        "--authorized-workspace-root", str(workspace_root),
    ]
    if max_staleness_seconds is not None:
        verifier_cmd += ["--max-staleness-seconds", str(max_staleness_seconds)]
    if attestation_key_path:
        verifier_cmd += ["--attestation-key", attestation_key_path]

    verifier_event, verifier_exit = _run_json(verifier_cmd)

    verified_event_id = verifier_event.get("verified_event_id")
    if isinstance(verified_event_id, str):
        try:
            _check_verifier_conflict(
                ledger, verified_event_id, verifier_event.get("result")
            )
        except ConflictingVerificationDetected as exc:
            ledger.append("rejection", {
                "reason": "conflicting_verification_records", "detail": str(exc),
            })
            return {
                "final_decision": QualificationDecision.REJECTED.value,
                "final_reasons": [RejectReason.CONFLICTING_VERIFICATION_RECORDS.value],
                "engine_decision": None,
                "ledger_chain_valid": True,
                "ledger_error": None,
                "module_event_id": module_event.get("event_id"),
                "verifier_result": verifier_event.get("result"),
                "ledger_record_count": len(ledger.records()),
                "detail": [str(exc)],
                "independence_assessment": independence,
            }

    ledger.append("verifier_event", verifier_event)

    # --- 2a. attestation check, if a key was supplied ----------------------
    attestation_ok = None
    if attestation_key_path:
        try:
            from qualification import attest
            key = attest.load_key(attestation_key_path)
            attestation_ok = attest.verify(key, verifier_event)
        except Exception as exc:  # AttestationKeyError or verification failure
            attestation_ok = False
            ledger.append("rejection", {
                "reason": "attestation_check_error", "detail": str(exc),
            })

    # --- 3-4. engine decision --------------------------------------------
    result = evaluate_module_asset(module_event, verifier_event, asset_restrictions)

    if attestation_ok is False:
        result.decision = QualificationDecision.REJECTED
        result.reasons = [RejectReason.ATTESTATION_INVALID]
        result.detail = [
            "verifier_event failed attestation check; its authenticity "
            "cannot be confirmed and it is therefore not trusted as "
            "independent evidence regardless of its stated result"
        ]

    # --- 5. record the decision ------------------------------------------
    ledger.append("qualification_decision", result.to_dict())

    # --- 6. the single choke point ---------------------------------------
    # Re-verify the whole chain. If evidence integrity fails now, override
    # any READY to BLOCKED. Trustworthy decision requires trustworthy
    # evidence underneath it.
    ledger_ok = True
    ledger_error = None
    try:
        ledger.verify_chain()
    except Exception as exc:  # LedgerIntegrityError
        ledger_ok = False
        ledger_error = str(exc)

    final_decision = result.decision
    final_reasons = [r.value for r in result.reasons]
    if not ledger_ok:
        final_decision = QualificationDecision.BLOCKED
        final_reasons = [RejectReason.LEDGER_INTEGRITY_FAILURE.value]

    return {
        "final_decision": final_decision.value,
        "final_reasons": final_reasons,
        "engine_decision": result.decision.value,
        "ledger_chain_valid": ledger_ok,
        "ledger_error": ledger_error,
        "module_event_id": module_event.get("event_id"),
        "verifier_result": verifier_event.get("result"),
        "attestation_checked": attestation_key_path is not None,
        "attestation_ok": attestation_ok,
        "ledger_record_count": len(ledger.records()),
        "detail": result.detail,
        "independence_assessment": independence,
    }


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description="Run the full NK-EM-002 qualification pipeline."
    )
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--workspace-root", required=True)
    parser.add_argument("--exercise-id", default="NK-COMP-001")
    parser.add_argument("--operation-id", default="OP-RED-001")
    parser.add_argument("--participant-id", default="P001")
    parser.add_argument("--asset-id", default="ASSET-001")
    parser.add_argument("--authorization-id", default="AUTH-EXAMPLE-001")
    parser.add_argument("--daily-driver", action="store_true")
    parser.add_argument("--max-staleness-seconds", type=float, default=60.0)
    parser.add_argument("--attestation-key", default=None)
    args = parser.parse_args()

    restrictions = {"classification": "DAILY_DRIVER"} if args.daily_driver else None
    out = run_pipeline(
        ledger_path=args.ledger,
        exercise_id=args.exercise_id,
        operation_id=args.operation_id,
        participant_id=args.participant_id,
        asset_id=args.asset_id,
        authorization_id=args.authorization_id,
        workspace_root=args.workspace_root,
        asset_restrictions=restrictions,
        max_staleness_seconds=args.max_staleness_seconds,
        attestation_key_path=args.attestation_key,
    )
    print(json.dumps(out, indent=2, sort_keys=True))
    return 0 if out["final_decision"] == "READY" else 1


if __name__ == "__main__":
    raise SystemExit(main())
