#!/usr/bin/env python3
"""
Tests for evidence/ledger.py.

Proves: append-only behavior, hash-chain tamper detection, correlation,
supersede-don't-overwrite corrections, and fail-closed loading of a
corrupted ledger file.

Run: python3 -I tests/test_ledger.py
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from evidence.ledger import (  # noqa: E402
    EvidenceLedger,
    LedgerIntegrityError,
)

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


def _tmp_ledger_path() -> Path:
    d = Path(tempfile.mkdtemp(prefix="nk_ledger_test_"))
    return d / "ledger.jsonl"


def test_append_and_chain_valid():
    led = EvidenceLedger(_tmp_ledger_path())
    led.append("module_event", {"event_id": "E1", "cleanup_state": "cleanup_pending"})
    led.append("verifier_event", {"verified_event_id": "E1", "result": "cleanup_verified"})
    led.append("qualification_decision", {"module_event_id": "E1", "decision": "READY"})
    try:
        led.verify_chain()
        ok = True
    except LedgerIntegrityError:
        ok = False
    check("three appended records form a valid chain", ok and len(led.records()) == 3)


def test_no_update_or_delete_api():
    led = EvidenceLedger(_tmp_ledger_path())
    check(
        "ledger exposes no update() method",
        not hasattr(led, "update"),
    )
    check(
        "ledger exposes no delete() method",
        not hasattr(led, "delete"),
    )


def test_tamper_detection_on_reload():
    path = _tmp_ledger_path()
    led = EvidenceLedger(path)
    led.append("module_event", {"event_id": "E1", "cleanup_state": "cleanup_pending"})
    led.append("verifier_event", {"verified_event_id": "E1", "result": "cleanup_verified"})

    # Tamper: flip the verifier result directly in the file, leaving the
    # stored record_hash intact. Reloading must detect the mismatch.
    lines = path.read_text().splitlines()
    rec = json.loads(lines[1])
    rec["payload"]["result"] = "cleanup_failed"  # forge a different outcome
    lines[1] = json.dumps(rec, sort_keys=True, separators=(",", ":"))
    path.write_text("\n".join(lines) + "\n")

    detected = False
    try:
        EvidenceLedger(path)  # reload triggers verify_chain
    except LedgerIntegrityError:
        detected = True
    check(
        "editing a payload without recomputing hash is detected on reload",
        detected,
    )


def test_broken_link_detected():
    path = _tmp_ledger_path()
    led = EvidenceLedger(path)
    led.append("module_event", {"event_id": "E1"})
    led.append("verifier_event", {"verified_event_id": "E1"})
    led.append("qualification_decision", {"module_event_id": "E1"})

    # Remove the middle record entirely -> chain link from rec[2] back to
    # rec[1] is now broken, and sequence numbers no longer match indices.
    lines = path.read_text().splitlines()
    del lines[1]
    path.write_text("\n".join(lines) + "\n")

    detected = False
    try:
        EvidenceLedger(path)
    except LedgerIntegrityError:
        detected = True
    check("deleting a middle record breaks the chain and is detected", detected)


def test_correction_supersedes_without_overwrite():
    led = EvidenceLedger(_tmp_ledger_path())
    original = led.append(
        "verifier_event",
        {"verified_event_id": "E1", "result": "cleanup_failed"},
    )
    # A re-run later verifies clean; record it as a NEW record that
    # supersedes the original, rather than editing the original.
    correction = led.append(
        "verifier_event",
        {"verified_event_id": "E1", "result": "cleanup_verified"},
        supersedes=original.record_hash,
    )
    recs = led.records()
    check(
        "correction is a new record; original is still present and unmodified",
        len(recs) == 2
        and recs[0].payload["result"] == "cleanup_failed"
        and recs[1].supersedes == original.record_hash
        and recs[1].payload["result"] == "cleanup_verified",
    )


def test_supersedes_unknown_hash_rejected():
    led = EvidenceLedger(_tmp_ledger_path())
    rejected = False
    try:
        led.append("verifier_event", {"verified_event_id": "E1"},
                   supersedes="deadbeef" * 8)
    except ValueError:
        rejected = True
    check("supersedes referencing an unknown record_hash is rejected", rejected)


def test_correlate_gathers_all_three_kinds():
    led = EvidenceLedger(_tmp_ledger_path())
    led.append("module_event", {"event_id": "E1", "cleanup_state": "cleanup_pending"})
    led.append("verifier_event", {"verified_event_id": "E1", "result": "cleanup_verified"})
    led.append("qualification_decision", {"module_event_id": "E1", "decision": "READY"})
    led.append("module_event", {"event_id": "E2"})  # unrelated

    corr = led.correlate("E1")
    check(
        "correlate('E1') returns the module, verifier and decision records for E1 only",
        set(corr.keys()) == {"module_event", "verifier_event", "qualification_decision"}
        and len(corr["module_event"]) == 1,
    )


def test_bad_record_kind_rejected():
    led = EvidenceLedger(_tmp_ledger_path())
    rejected = False
    try:
        led.append("not_a_real_kind", {"x": 1})
    except ValueError:
        rejected = True
    check("unknown record_kind is rejected", rejected)


ALL_TESTS = [
    test_append_and_chain_valid,
    test_no_update_or_delete_api,
    test_tamper_detection_on_reload,
    test_broken_link_detected,
    test_correction_supersedes_without_overwrite,
    test_supersedes_unknown_hash_rejected,
    test_correlate_gathers_all_three_kinds,
    test_bad_record_kind_rejected,
]


def main() -> int:
    print(f"Running {len(ALL_TESTS)} evidence ledger tests...\n")
    for t in ALL_TESTS:
        t()
    print(f"\n{PASS} passed, {FAIL} failed")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
