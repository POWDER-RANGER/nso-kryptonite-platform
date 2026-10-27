#!/usr/bin/env python3
"""
Adversarial test suite for nk_em_002_verify.py v1.1.0 and the
orchestrator's replay/conflict guards.

Each test corresponds to a confirmed defect from reproduction against
v1.0.0, or to a required adversarial category from the evidence-
verification directive. Run: python3 -I tests/test_verifier_v1_1_adversarial.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VERIFIER = REPO_ROOT / "red-cell" / "payloads" / "nk_em_002_verify.py"
sys.path.insert(0, str(REPO_ROOT))

PASS = 0
FAIL = 0


def check(name, cond, extra=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  PASS  {name}")
    else:
        FAIL += 1
        print(f"  FAIL  {name}  {extra}")


def run_verifier(event: dict, workspace: Path, **extra_args) -> tuple[dict, int]:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
        json.dump(event, tf)
        path = tf.name
    cmd = [sys.executable, "-I", str(VERIFIER), "--event-file", path,
           "--authorized-workspace-root", str(workspace)]
    for k, v in extra_args.items():
        cmd += [f"--{k.replace('_', '-')}", str(v)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    out = proc.stdout.strip().splitlines()
    doc = json.loads(out[-1]) if out else {}
    return doc, proc.returncode


def base_event(ws: Path, **overrides) -> dict:
    e = {
        "event_id": "e1", "exercise_id": "X", "operation_id": "O",
        "participant_id": "P1", "asset_id": "A", "module_id": "NK-EM-002",
        "module_version": "1.1.0", "cleanup_state": "cleanup_pending",
        "declared_workspace_root": str(ws),
        "declared_artifact_path": None, "declared_temp_directory": None,
        "completed_at_utc": "2026-01-01T00:00:00+00:00",
    }
    e.update(overrides)
    return e


def fresh_ws() -> Path:
    d = Path(tempfile.mkdtemp(prefix="nk_v11_"))
    return d


# -- R1: omitted path keys --------------------------------------------------

def test_r1_omitted_keys_rejected():
    ws = fresh_ws()
    ev = base_event(ws)
    del ev["declared_artifact_path"]
    del ev["declared_temp_directory"]
    doc, code = run_verifier(ev, ws)
    check("R1: both path keys omitted -> rejected (not a false cleanup_verified)",
          doc.get("result") == "rejected", doc)


def test_r1b_explicit_null_still_verifies():
    ws = fresh_ws()
    ev = base_event(ws)  # both keys present as null
    doc, code = run_verifier(ev, ws)
    check("R1b: both path keys explicitly null -> cleanup_verified (legit no-op run)",
          doc.get("result") == "cleanup_verified", doc)


# -- R6: undeclared residue -------------------------------------------------

def test_r6_undeclared_residue_fails():
    ws = fresh_ws()
    (ws / "stray_leftover.txt").write_text("undeclared")
    ev = base_event(ws)  # declares nothing
    doc, code = run_verifier(ev, ws)
    check("R6: undeclared residue present in workspace -> not cleanup_verified",
          doc.get("result") != "cleanup_verified", doc)


# -- R7: event cannot assert its own authorization boundary -----------------

def test_r7_event_declares_different_workspace_rejected():
    ws = fresh_ws()
    attacker_ws = fresh_ws()
    ev = base_event(ws, declared_workspace_root=str(attacker_ws))
    doc, code = run_verifier(ev, ws)  # orchestrator still says `ws` is authorized
    check("R7: event's declared_workspace_root disagrees with orchestrator -> rejected",
          doc.get("result") == "rejected", doc)


# -- Symlink families ---------------------------------------------------

def test_symlink_leaf_rejected():
    ws = fresh_ws()
    real = ws / "real"; real.mkdir()
    link = ws / "nk_em_002_x"
    os.symlink(real, link)
    ev = base_event(ws, declared_temp_directory=str(link))
    doc, code = run_verifier(ev, ws)
    check("symlink at the declared leaf path -> rejected",
          doc.get("result") == "rejected", doc)


def test_symlink_parent_rejected():
    ws = fresh_ws()
    real = ws / "real"; real.mkdir()
    link = ws / "linkdir"
    os.symlink(real, link)
    leaf = link / "child"
    ev = base_event(ws, declared_temp_directory=str(leaf))
    doc, code = run_verifier(ev, ws)
    check("symlink in a PARENT directory of the declared leaf -> rejected",
          doc.get("result") == "rejected", doc)


def test_dangling_symlink_rejected():
    ws = fresh_ws()
    link = ws / "dangle"
    os.symlink("/does/not/exist", link)
    ev = base_event(ws, declared_temp_directory=str(link))
    doc, code = run_verifier(ev, ws)
    check("dangling symlink at declared path -> rejected",
          doc.get("result") == "rejected", doc)


def test_external_symlink_rejected():
    ws = fresh_ws()
    outside = fresh_ws()
    link = ws / "ext"
    os.symlink(outside, link)
    ev = base_event(ws, declared_temp_directory=str(link))
    doc, code = run_verifier(ev, ws)
    check("symlink pointing outside the workspace -> rejected",
          doc.get("result") == "rejected", doc)


# -- Malformed / invalid types ------------------------------------------

def test_malformed_json_rejected():
    ws = fresh_ws()
    bad_file = ws.parent / "bad.json"
    bad_file.write_text("{not valid json")
    proc = subprocess.run(
        [sys.executable, "-I", str(VERIFIER), "--event-file", str(bad_file),
         "--authorized-workspace-root", str(ws)],
        capture_output=True, text=True,
    )
    out = proc.stdout.strip().splitlines()
    doc = json.loads(out[-1]) if out else {}
    check("malformed JSON event file -> rejected, no crash",
          doc.get("result") == "rejected", doc)


def test_invalid_field_type_rejected():
    ws = fresh_ws()
    ev = base_event(ws, declared_artifact_path=12345)  # int, not str/null
    doc, code = run_verifier(ev, ws)
    check("declared_artifact_path has wrong type (int) -> rejected, no crash",
          doc.get("result") == "rejected", doc)


def test_workspace_root_none_type_in_event_handled():
    ws = fresh_ws()
    ev = base_event(ws, declared_workspace_root=None)  # explicit null, not a string
    doc, code = run_verifier(ev, ws)
    # null workspace_root in the event is harmless (authority comes from
    # the CLI arg); since both paths are also null, this is a legitimate
    # no-op run and should verify cleanly, not crash.
    check("declared_workspace_root=None in event does not crash the verifier",
          doc.get("result") in ("cleanup_verified", "cleanup_failed", "rejected"),
          doc)


def test_incomplete_event_missing_required_field_rejected():
    ws = fresh_ws()
    ev = base_event(ws)
    del ev["participant_id"]
    doc, code = run_verifier(ev, ws)
    check("event missing a required top-level field -> rejected",
          doc.get("result") == "rejected", doc)


# -- Staleness ------------------------------------------------------------

def test_stale_event_rejected_by_max_staleness():
    ws = fresh_ws()
    ev = base_event(ws, completed_at_utc="2000-01-01T00:00:00+00:00")
    doc, code = run_verifier(ev, ws, max_staleness_seconds=60)
    check("event far older than max-staleness-seconds -> not verified",
          doc.get("result") != "cleanup_verified", doc)


def test_invalid_timestamp_rejected():
    ws = fresh_ws()
    ev = base_event(ws, completed_at_utc="not-a-timestamp")
    doc, code = run_verifier(ev, ws, max_staleness_seconds=60)
    check("malformed completed_at_utc with staleness check active -> rejected",
          doc.get("result") == "rejected", doc)


# -- Legitimate acceptance (positive control) ----------------------------

def test_legitimate_cleanup_verifies():
    ws = fresh_ws()
    temp_dir = ws / "nk_em_002_real"
    temp_dir.mkdir()
    artifact = temp_dir / "exercise-artifact.json"
    artifact.write_text("{}")
    artifact.unlink()
    temp_dir.rmdir()
    ev = base_event(
        ws,
        declared_artifact_path=str(artifact),
        declared_temp_directory=str(temp_dir),
        completed_at_utc="2026-01-01T00:00:00+00:00",
    )
    doc, code = run_verifier(ev, ws, max_staleness_seconds=999999999)
    check("legitimate, fully-removed artifact -> cleanup_verified (positive control)",
          doc.get("result") == "cleanup_verified", doc)


def test_leftover_artifact_fails():
    ws = fresh_ws()
    temp_dir = ws / "nk_em_002_real2"
    temp_dir.mkdir()
    artifact = temp_dir / "exercise-artifact.json"
    artifact.write_text("{}")  # NOT removed — simulates incomplete cleanup
    ev = base_event(
        ws, declared_artifact_path=str(artifact), declared_temp_directory=str(temp_dir),
    )
    doc, code = run_verifier(ev, ws)
    check("artifact still present on disk -> cleanup_failed, not verified",
          doc.get("result") == "cleanup_failed", doc)


ALL = [
    test_r1_omitted_keys_rejected,
    test_r1b_explicit_null_still_verifies,
    test_r6_undeclared_residue_fails,
    test_r7_event_declares_different_workspace_rejected,
    test_symlink_leaf_rejected,
    test_symlink_parent_rejected,
    test_dangling_symlink_rejected,
    test_external_symlink_rejected,
    test_malformed_json_rejected,
    test_invalid_field_type_rejected,
    test_workspace_root_none_type_in_event_handled,
    test_incomplete_event_missing_required_field_rejected,
    test_stale_event_rejected_by_max_staleness,
    test_invalid_timestamp_rejected,
    test_legitimate_cleanup_verifies,
    test_leftover_artifact_fails,
]


def main():
    print(f"Running {len(ALL)} v1.1 verifier adversarial tests...\n")
    for t in ALL:
        t()
    print(f"\n{PASS} passed, {FAIL} failed")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
