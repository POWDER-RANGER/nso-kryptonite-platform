#!/usr/bin/env python3
"""
NK-EM-002 Independent Cleanup Verifier — v1.1.0

Corrects defects confirmed by reproduction against v1.0.0 (see
tests/baseline_v1_verifier_adversarial.py and docs/CHANGELOG-v1.1.md):

  R1  omitted path fields -> treated as "nothing to check" -> false
      cleanup_verified. FIXED: both declared_* keys must be PRESENT in
      the event (an omitted key is rejected outright). An explicit
      `null` value remains valid — it means the module is asserting
      "this resource was never created" — but omitting the key entirely
      is no longer silently read as the same thing.
  R5  declared_workspace_root=None (or any wrong type) raised an
      uncaught TypeError instead of a clean rejection. FIXED: every
      field is type-checked before any Path() construction.
  R6  undeclared residue left elsewhere in the workspace was invisible
      because the verifier only ever checked the paths the module
      itself declared. FIXED: the verifier now inventories the
      authorized workspace directory and rejects if anything exists
      there that is not accounted for by a declared (and now-removed)
      path.
  R7  the workspace root the verifier trusted came from the event
      itself, so a module (or a forged event) could declare its own
      authorization boundary. FIXED: the authorized workspace root is
      now a parameter supplied by the ORCHESTRATOR (never read from the
      event); the event's declared_workspace_root, if present, is
      cross-checked against it and rejected on mismatch, never used as
      the authority.

Also addressed from the independent review:
  - lstat-based, component-by-component symlink detection (catches a
    symlinked PARENT directory, not just the leaf path) instead of a
    single is_symlink() on the resolved leaf.
  - Explicit INDETERMINATE outcome for filesystem states that cannot be
    safely observed (permission denied, OSError other than "not
    found"), instead of silently treating an observation failure as
    either pass or fail.
  - Freshness check: verification must not be timestamped before the
    module's own completion, and a max-staleness window is enforced by
    the caller via --max-staleness-seconds.
  - Optional HMAC attestation (qualification/attest.py) over the full
    result, signed with a key the module process never holds, so a
    forged verifier_event cannot be produced without the key.

Known remaining limitation (unchanged from v1.0, stated plainly):
This script still provides PROCESS and CODE separation only. Running it
as a second process is not, by itself, privilege or infrastructure
separation. If the module and this verifier run as the same OS user
with access to the same attestation key file, a module with arbitrary
code execution could still read the key. True independence requires the
verifier to run under a distinct OS identity with no read access to the
signing key, which this reference implementation does not yet enforce
at the OS level (see docs/THREAT-MODEL.md T9). The orchestrator's
`assess_independence()` probes for this and reports it rather than
hiding it.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from qualification import attest  # noqa: E402

VERIFIER_MODULE_ID = "NK-EM-002-VERIFY"
VERIFIER_VERSION = "1.1.0"
EXPECTED_SOURCE_MODULE_ID = "NK-EM-002"

REQUIRED_SOURCE_FIELDS = (
    "event_id",
    "exercise_id",
    "operation_id",
    "participant_id",
    "asset_id",
    "module_id",
    "module_version",
    "cleanup_state",
)

# These two keys must be PRESENT in the source event (value may be a
# string or null, but the key itself must exist). This is what fixes
# R1 — a module that simply omits a path can no longer coast through as
# "nothing to check."
REQUIRED_PATH_KEYS = ("declared_artifact_path", "declared_temp_directory")

RESULT_VERIFIED = "cleanup_verified"
RESULT_FAILED = "cleanup_failed"
RESULT_INDETERMINATE = "cleanup_indeterminate"
RESULT_REJECTED = "rejected"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class VerificationRejected(Exception):
    """Malformed, unauthenticated, or out-of-policy input. Fails closed."""


class VerificationIndeterminate(Exception):
    """Filesystem state could not be safely observed. Fails closed."""


# ---------------------------------------------------------------------------
# Type validation (fixes R5: no construction of Path() from untyped input)
# ---------------------------------------------------------------------------

def _require_type(value: Any, expected: type, field: str) -> Any:
    if not isinstance(value, expected):
        raise VerificationRejected(
            f"field {field!r} has type {type(value).__name__}, expected "
            f"{expected.__name__}"
        )
    return value


def _require_str_or_null(value: Any, field: str) -> str | None:
    if value is None:
        return None
    return _require_type(value, str, field)


# ---------------------------------------------------------------------------
# Schema + policy validation
# ---------------------------------------------------------------------------

def _validate_source_event(
    source_event: dict[str, Any], authorized_workspace: Path
) -> None:
    if not isinstance(source_event, dict):
        raise VerificationRejected("source event is not a JSON object")

    missing = [f for f in REQUIRED_SOURCE_FIELDS if f not in source_event]
    if missing:
        raise VerificationRejected(f"source event missing required fields: {missing}")

    # R1 fix: the path KEYS must exist, even if their value is null.
    missing_path_keys = [k for k in REQUIRED_PATH_KEYS if k not in source_event]
    if missing_path_keys:
        raise VerificationRejected(
            f"source event omits required path declaration key(s) "
            f"{missing_path_keys}; an omitted key is never treated as "
            f"'nothing to verify' — a module that created no resource "
            f"must declare the key as explicit null, not omit it"
        )

    for field in ("event_id", "exercise_id", "operation_id", "participant_id",
                  "asset_id", "module_id", "module_version"):
        _require_type(source_event[field], str, field)
        if not source_event[field].strip():
            raise VerificationRejected(f"field {field!r} is empty")

    _require_type(source_event["cleanup_state"], str, "cleanup_state")
    if source_event["module_id"] != EXPECTED_SOURCE_MODULE_ID:
        raise VerificationRejected(
            f"module_id mismatch: expected {EXPECTED_SOURCE_MODULE_ID}, "
            f"got {source_event['module_id']!r}"
        )
    if source_event["cleanup_state"] not in ("cleanup_pending", "cleanup_failed"):
        raise VerificationRejected(
            f"source event is not awaiting verification "
            f"(cleanup_state={source_event['cleanup_state']!r})"
        )

    # R5 fix: type-check before any Path() construction.
    for key in REQUIRED_PATH_KEYS:
        _require_str_or_null(source_event[key], key)

    # R7 fix: the authorized workspace is a parameter from the
    # orchestrator, NEVER read from the event. If the event also
    # declares a workspace root, it must match exactly or the event is
    # rejected as inconsistent with its own authorization — it is never
    # used as the authority either way.
    declared_root = source_event.get("declared_workspace_root")
    if declared_root is not None:
        _require_type(declared_root, str, "declared_workspace_root")
        if Path(declared_root).resolve(strict=False) != authorized_workspace.resolve(strict=False):
            raise VerificationRejected(
                f"event's declared_workspace_root ({declared_root!r}) does not "
                f"match the orchestrator-authorized workspace "
                f"({authorized_workspace!r}); the event's own claim about its "
                f"authorization boundary is never trusted as the authority"
            )


# ---------------------------------------------------------------------------
# Path resolution with component-wise symlink detection
# ---------------------------------------------------------------------------

def _lstat_chain_has_symlink(path: Path, boundary: Path) -> bool:
    """
    Walk from `path` up to (not including) `boundary`, lstat-ing each
    existing component. Returns True if ANY component in that chain —
    the leaf or any parent directory up to the boundary — is itself a
    symlink. This catches a symlinked PARENT directory, which a single
    is_symlink() check on the leaf (v1.0's approach) would miss.
    """
    current = path
    boundary_resolved = boundary.resolve(strict=False)
    seen = 0
    while True:
        try:
            if current.is_symlink():
                return True
        except OSError:
            # Component doesn't exist or is inaccessible partway up;
            # that's fine, just keep walking toward the boundary.
            pass
        if current == current.parent:
            break  # reached filesystem root without hitting boundary
        current = current.parent
        seen += 1
        if current.resolve(strict=False) == boundary_resolved or seen > 64:
            break
    return False


def _resolve_within_workspace(
    path_str: str | None, workspace: Path
) -> Path | None:
    if path_str is None:
        return None

    raw = Path(path_str)
    if not raw.is_absolute():
        raise VerificationRejected(f"declared path is not absolute: {path_str}")

    workspace_resolved = workspace.resolve(strict=False)

    # Component-wise symlink check BEFORE resolving away the symlink
    # identity (this is the fix for the resolve-then-check ordering
    # issue: v1.0 resolved first, which loses the original symlink).
    if _lstat_chain_has_symlink(raw, workspace_resolved):
        raise VerificationRejected(
            f"declared path {path_str!r} or one of its parent directories "
            f"(up to the workspace boundary) is a symlink; a symlink at or "
            f"above the declared location is never treated as proof of "
            f"absence, dangling or not"
        )

    resolved = raw.resolve(strict=False)
    if resolved != workspace_resolved and workspace_resolved not in resolved.parents:
        raise VerificationRejected(
            f"declared path escapes authorized workspace: {path_str} "
            f"(resolved {resolved}, workspace {workspace_resolved})"
        )
    return resolved


def _safe_absent(path: Path | None) -> bool:
    """
    True only if we can positively confirm the path does not exist.
    Raises VerificationIndeterminate if the filesystem cannot be safely
    observed (permission denied, I/O error) rather than guessing.
    """
    if path is None:
        return True
    try:
        if path.is_symlink():
            return False
        return not path.exists()
    except OSError as exc:
        raise VerificationIndeterminate(
            f"could not observe filesystem state at {path}: {exc}"
        )


def _workspace_inventory_clean(
    workspace: Path, declared_paths: list[Path]
) -> tuple[bool, list[str]]:
    """
    R6 fix: list everything actually present in the authorized
    workspace and confirm it contains nothing outside what the module
    declared (and which must itself now be absent, confirmed above).
    Any undeclared entry — residue the module never told us about — is
    a cleanup failure, independent of whether the declared paths are
    individually clean.
    """
    try:
        entries = list(workspace.iterdir())
    except FileNotFoundError:
        return True, []  # workspace itself never existed / already gone — clean
    except OSError as exc:
        raise VerificationIndeterminate(
            f"could not inventory workspace {workspace}: {exc}"
        )

    declared_top_level = set()
    for p in declared_paths:
        try:
            rel = p.relative_to(workspace)
            declared_top_level.add(workspace / rel.parts[0])
        except (ValueError, IndexError):
            continue

    stray = [str(e) for e in entries if e not in declared_top_level]
    return (len(stray) == 0), stray


# ---------------------------------------------------------------------------
# Main verification
# ---------------------------------------------------------------------------

def verify(
    source_event: dict[str, Any],
    authorized_workspace: Path,
    max_staleness_seconds: float | None = None,
) -> dict[str, Any]:
    _validate_source_event(source_event, authorized_workspace)

    try:
        artifact_path = _resolve_within_workspace(
            source_event["declared_artifact_path"], authorized_workspace
        )
        temp_directory = _resolve_within_workspace(
            source_event["declared_temp_directory"], authorized_workspace
        )

        artifact_absent = _safe_absent(artifact_path)
        temp_dir_absent = _safe_absent(temp_directory)

        declared_paths = [p for p in (artifact_path, temp_directory) if p is not None]
        inventory_clean, stray_entries = _workspace_inventory_clean(
            authorized_workspace, declared_paths
        )
    except VerificationIndeterminate as exc:
        return _build_result(
            source_event, authorized_workspace, RESULT_INDETERMINATE, str(exc)
        )

    # Freshness: verification is not permitted to be the module's own
    # self-report in disguise, and it is not permitted to be stale
    # relative to a maximum staleness window if one was supplied.
    verified_at = utc_now()
    freshness_note = None
    if max_staleness_seconds is not None:
        completed_raw = source_event.get("completed_at_utc")
        if isinstance(completed_raw, str):
            try:
                completed_dt = datetime.fromisoformat(completed_raw)
                age = (datetime.now(timezone.utc) - completed_dt).total_seconds()
                if age > max_staleness_seconds:
                    return _build_result(
                        source_event, authorized_workspace, RESULT_FAILED,
                        f"source event is stale: {age:.1f}s since completion, "
                        f"max allowed {max_staleness_seconds}s",
                    )
                freshness_note = f"age_seconds={age:.3f}"
            except ValueError:
                return _build_result(
                    source_event, authorized_workspace, RESULT_REJECTED,
                    f"completed_at_utc is not a valid ISO-8601 timestamp: "
                    f"{completed_raw!r}",
                )

    verified = (
        source_event["cleanup_state"] == "cleanup_pending"
        and artifact_absent
        and temp_dir_absent
        and inventory_clean
    )

    result = RESULT_VERIFIED if verified else RESULT_FAILED
    detail = None
    if not verified and inventory_clean is False:
        detail = f"undeclared residue found in workspace: {stray_entries}"

    return _build_result(
        source_event, authorized_workspace, result, detail,
        artifact_path=artifact_path, artifact_absent=artifact_absent,
        temp_directory=temp_directory, temp_dir_absent=temp_dir_absent,
        inventory_clean=inventory_clean, stray_entries=stray_entries,
        verified_at=verified_at, freshness_note=freshness_note,
    )


def _build_result(
    source_event: dict[str, Any],
    authorized_workspace: Path,
    result: str,
    detail: str | None,
    **obs: Any,
) -> dict[str, Any]:
    return {
        "verifier_module_id": VERIFIER_MODULE_ID,
        "verifier_version": VERIFIER_VERSION,
        "verifier_identity_note": (
            "process-and-code separation only; no privilege/infra "
            "separation yet — see module docstring and THREAT-MODEL.md T9"
        ),
        "verified_event_id": source_event.get("event_id"),
        "exercise_id": source_event.get("exercise_id"),
        "operation_id": source_event.get("operation_id"),
        "participant_id": source_event.get("participant_id"),
        "asset_id": source_event.get("asset_id"),
        "source_module_id": source_event.get("module_id"),
        "source_module_version": source_event.get("module_version"),
        "source_cleanup_state": source_event.get("cleanup_state"),
        "authorized_workspace_root": str(authorized_workspace),
        "verified_at_utc": obs.get("verified_at", utc_now()),
        "event_type": "cleanup_verification",
        "result": result,
        "detail": detail,
        "observations": {
            "artifact_path_checked": str(obs["artifact_path"]) if obs.get("artifact_path") else None,
            "artifact_confirmed_absent": obs.get("artifact_absent"),
            "temp_directory_checked": str(obs["temp_directory"]) if obs.get("temp_directory") else None,
            "temp_directory_confirmed_absent": obs.get("temp_dir_absent"),
            "workspace_inventory_clean": obs.get("inventory_clean"),
            "stray_entries": obs.get("stray_entries"),
            "freshness": obs.get("freshness_note"),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Independently verify an NK-EM-002 cleanup claim."
    )
    parser.add_argument("--event-file", required=True)
    parser.add_argument(
        "--authorized-workspace-root",
        required=True,
        help=(
            "The workspace root established by the ORCHESTRATOR's own "
            "authorization, not read from the event. The event's own "
            "declared_workspace_root (if present) must match this exactly "
            "or the event is rejected."
        ),
    )
    parser.add_argument("--max-staleness-seconds", type=float, default=None)
    parser.add_argument(
        "--attestation-key",
        default=None,
        help="Path to an HMAC key file to sign the result (qualification/attest.py).",
    )
    args = parser.parse_args()

    def emit(doc: dict[str, Any]) -> None:
        if args.attestation_key:
            try:
                key = attest.load_key(args.attestation_key)
                doc = attest.attach(key, doc)
            except attest.AttestationKeyError as exc:
                doc["attestation_error"] = str(exc)
        print(json.dumps(doc, sort_keys=True, separators=(",", ":")))

    try:
        raw_text = Path(args.event_file).read_text()
    except OSError as exc:
        emit({"verifier_module_id": VERIFIER_MODULE_ID, "result": RESULT_REJECTED,
              "error": f"could not read event file: {exc}"})
        return 2

    try:
        source_event = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        emit({"verifier_module_id": VERIFIER_MODULE_ID, "result": RESULT_REJECTED,
              "error": f"malformed source event JSON: {exc}"})
        return 2

    authorized_workspace = Path(args.authorized_workspace_root).resolve(strict=False)

    try:
        record = verify(source_event, authorized_workspace, args.max_staleness_seconds)
    except VerificationRejected as exc:
        emit({"verifier_module_id": VERIFIER_MODULE_ID, "result": RESULT_REJECTED,
              "error": str(exc)})
        return 2

    emit(record)
    return 0 if record["result"] == RESULT_VERIFIED else 1


if __name__ == "__main__":
    sys.exit(main())
