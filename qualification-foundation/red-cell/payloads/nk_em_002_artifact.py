#!/usr/bin/env python3
"""
NK-EM-002: Temporary Artifact Lifecycle (executing module)

Creates a synthetic exercise artifact inside a newly created temporary
directory, hashes it, and attempts cleanup. This module does NOT certify
its own cleanup. It ends at CLEANUP_PENDING or CLEANUP_FAILED and declares
the paths it touched so a separate verifier (nk_em_002_verify.py) can
independently confirm their absence.

Standard library only.
No network access.
No elevated privileges.
No system configuration changes.

Two-Actor Evidence Rule: this module reports what it attempted. It does
not and cannot decide whether its own evidence is trustworthy.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
import uuid

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

MODULE_ID = "NK-EM-002"
MODULE_VERSION = "1.1.0"
MAX_ARTIFACT_BYTES = 4096


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def emit(record: dict[str, Any]) -> None:
    print(json.dumps(record, sort_keys=True, separators=(",", ":")))


def validate_identifier(value: str, field: str) -> str:
    cleaned = value.strip()
    if not cleaned or len(cleaned) > 128:
        raise ValueError(f"Invalid {field}")
    return cleaned


def run(
    exercise_id: str,
    operation_id: str,
    participant_id: str,
    asset_id: str,
    authorization_id: str,
    workspace_root: str,
) -> dict[str, Any]:
    event_id = str(uuid.uuid4())
    started_at = utc_now()

    identifiers = {
        "exercise_id": validate_identifier(exercise_id, "exercise_id"),
        "operation_id": validate_identifier(operation_id, "operation_id"),
        "participant_id": validate_identifier(participant_id, "participant_id"),
        "asset_id": validate_identifier(asset_id, "asset_id"),
        "authorization_id": validate_identifier(
            authorization_id, "authorization_id"
        ),
    }

    workspace = Path(workspace_root).resolve()
    if not workspace.exists() or not workspace.is_dir():
        raise ValueError(
            f"workspace_root does not exist or is not a directory: {workspace}"
        )

    artifact = {
        "exercise_id": identifiers["exercise_id"],
        "operation_id": identifiers["operation_id"],
        "module_id": MODULE_ID,
        "event_id": event_id,
        "purpose": "synthetic_artifact_lifecycle_test",
    }

    content = json.dumps(
        artifact,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")

    if len(content) > MAX_ARTIFACT_BYTES:
        raise ValueError("Artifact exceeds module size limit")

    artifact_hash = sha256_bytes(content)

    temp_directory: Path | None = None
    artifact_path: Path | None = None
    created = False
    module_unlinked_file = False
    error: str | None = None

    try:
        with tempfile.TemporaryDirectory(
            prefix="nk_em_002_",
            dir=str(workspace),
        ) as temporary_directory:
            temp_directory = Path(temporary_directory).resolve()

            # Reject any path that escapes the declared workspace boundary
            # (defensive; TemporaryDirectory with dir= should not do this,
            # but the module must never trust its own path construction
            # silently — see verifier for the authoritative check).
            if workspace not in temp_directory.parents and temp_directory != workspace:
                raise RuntimeError("Temporary directory escaped workspace root")

            artifact_path = temp_directory / "exercise-artifact.json"

            # Exclusive creation: do not overwrite an existing file.
            with artifact_path.open("xb") as handle:
                handle.write(content)
                handle.flush()
                os.fsync(handle.fileno())

            created = True

            observed_hash = sha256_bytes(artifact_path.read_bytes())
            if observed_hash != artifact_hash:
                raise RuntimeError("Artifact hash verification failed before cleanup")

            artifact_path.unlink()
            module_unlinked_file = True

        # Module-performed cleanup ends here. This process does NOT
        # certify its own cleanup. It only declares what it attempted
        # and the paths an independent verifier must re-check itself.

    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"

    completed_at = utc_now()

    if error:
        result = "failed"
        cleanup_state = "cleanup_failed"
    else:
        result = "completed"
        cleanup_state = "cleanup_pending"

    return {
        "event_id": event_id,
        **identifiers,
        "module_id": MODULE_ID,
        "module_version": MODULE_VERSION,
        "event_type": "artifact_lifecycle",
        "started_at_utc": started_at,
        "completed_at_utc": completed_at,
        "result": result,
        "cleanup_state": cleanup_state,
        "declared_workspace_root": str(workspace),
        "declared_artifact_path": str(artifact_path) if artifact_path else None,
        "declared_temp_directory": str(temp_directory) if temp_directory else None,
        "observations": {
            "artifact_created": created,
            "artifact_unlink_attempted": module_unlinked_file,
            "artifact_sha256": artifact_hash,
            "network_access": False,
            "system_configuration_changed": False,
        },
        "error": error,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run the NK-EM-002 temporary artifact lifecycle test."
    )
    parser.add_argument("--exercise-id", required=True)
    parser.add_argument("--operation-id", required=True)
    parser.add_argument("--participant-id", required=True)
    parser.add_argument("--asset-id", required=True)
    parser.add_argument("--authorization-id", required=True)
    parser.add_argument(
        "--workspace-root",
        required=True,
        help=(
            "Directory the authorized exercise scope designates for this "
            "module's temporary state. Must already exist. The verifier "
            "rejects any declared path outside this root."
        ),
    )
    args = parser.parse_args()

    try:
        record = run(
            exercise_id=args.exercise_id,
            operation_id=args.operation_id,
            participant_id=args.participant_id,
            asset_id=args.asset_id,
            authorization_id=args.authorization_id,
            workspace_root=args.workspace_root,
        )
    except ValueError as exc:
        emit({
            "module_id": MODULE_ID,
            "result": "rejected",
            "error": str(exc),
        })
        return 2

    emit(record)
    return 0 if record["cleanup_state"] != "cleanup_failed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
