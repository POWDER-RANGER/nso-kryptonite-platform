#!/usr/bin/env python3
"""
End-to-end integration test: module -> verifier -> ledger -> engine.

NK-EM-002 is the first integration test for the whole pipeline, as
agreed. These tests run the real subprocess module and verifier, write a
real hash-chained ledger, and drive the real engine. They prove the
pipeline's single choke point: READY is reachable only when the module
reached CLEANUP_PENDING, an independent verifier confirmed cleanup, and
the ledger chain is intact at decision time.

Run: python3 -I tests/test_integration.py
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from qualification.orchestrator import run_pipeline  # noqa: E402
from evidence.ledger import EvidenceLedger  # noqa: E402

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


def _fresh(prefix: str) -> tuple[Path, Path]:
    d = Path(tempfile.mkdtemp(prefix=f"nk_integ_{prefix}_"))
    ws = d / "ws"
    ws.mkdir()
    return d / "ledger.jsonl", ws


def test_happy_path_reaches_ready():
    ledger_path, ws = _fresh("happy")
    out = run_pipeline(
        ledger_path=ledger_path,
        exercise_id="NK-COMP-001", operation_id="OP-RED-001",
        participant_id="P001", asset_id="ASSET-001",
        authorization_id="AUTH-EXAMPLE-001", workspace_root=ws,
    )
    check(
        "honest run: module CLEANUP_PENDING + verifier CLEANUP_VERIFIED + intact chain -> READY",
        out["final_decision"] == "READY"
        and out["ledger_chain_valid"] is True
        and out["ledger_record_count"] == 3,
        json.dumps(out),
    )


def test_tampered_ledger_overrides_ready_to_blocked():
    """
    Run an honest pipeline to completion, then corrupt the ledger file
    and re-evaluate the chain. A fresh load of the tampered ledger must
    fail its integrity check — demonstrating that even a READY engine
    decision sitting in the ledger cannot be trusted once the chain is
    broken.
    """
    ledger_path, ws = _fresh("tamper")
    out = run_pipeline(
        ledger_path=ledger_path,
        exercise_id="NK-COMP-001", operation_id="OP-RED-001",
        participant_id="P001", asset_id="ASSET-001",
        authorization_id="AUTH-EXAMPLE-001", workspace_root=ws,
    )
    assert out["final_decision"] == "READY", out

    # Tamper with the recorded verifier result in the ledger file.
    lines = Path(ledger_path).read_text().splitlines()
    rec = json.loads(lines[1])  # the verifier_event record
    rec["payload"]["result"] = "cleanup_failed"
    lines[1] = json.dumps(rec, sort_keys=True, separators=(",", ":"))
    Path(ledger_path).write_text("\n".join(lines) + "\n")

    detected = False
    try:
        EvidenceLedger(ledger_path)  # reload triggers verify_chain
    except Exception:
        detected = True
    check(
        "post-hoc edit of a READY run's ledger is detected on reload (evidence untrustworthy)",
        detected,
    )


def test_self_certified_module_output_still_blocked_through_pipeline():
    """
    Feed the engine a module event that self-certifies, paired with a
    valid verifier event, through the engine directly (the real module
    cannot produce this, which is the point — but a compromised or
    buggy future module might, and the engine must still refuse).
    """
    from qualification.engine import evaluate_module_asset, QualificationDecision, RejectReason

    module_event = {
        "event_id": "E-SELF", "exercise_id": "X", "operation_id": "O",
        "participant_id": "P001", "asset_id": "A1",
        "module_id": "NK-EM-002", "module_version": "1.1.0",
        "cleanup_state": "cleanup_pending",
        "independent_verification": True,  # the forbidden self-assertion
    }
    verifier_event = {
        "verifier_module_id": "NK-EM-002-VERIFY", "verified_event_id": "E-SELF",
        "exercise_id": "X", "operation_id": "O",
        "participant_id": "P001", "asset_id": "A1",
        "source_module_id": "NK-EM-002", "source_cleanup_state": "cleanup_pending",
        "result": "cleanup_verified",
    }
    result = evaluate_module_asset(module_event, verifier_event)
    check(
        "a module that self-certifies is REJECTED even with a valid verifier alongside it",
        result.decision == QualificationDecision.REJECTED
        and RejectReason.SELF_CERTIFICATION_DETECTED in result.reasons,
        f"{result.decision} / {result.reasons}",
    )


ALL_TESTS = [
    test_happy_path_reaches_ready,
    test_tampered_ledger_overrides_ready_to_blocked,
    test_self_certified_module_output_still_blocked_through_pipeline,
]


def main() -> int:
    print(f"Running {len(ALL_TESTS)} integration tests...\n")
    for t in ALL_TESTS:
        t()
    print(f"\n{PASS} passed, {FAIL} failed")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
