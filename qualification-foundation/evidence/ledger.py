#!/usr/bin/env python3
"""
NK Evidence Ledger

Append-only, hash-chained evidence store for NSO Kryptonite exercises.

Design requirements enforced here (from PAYLOAD-LIBRARY-SPEC.md section 9
and the Evidence Ledger integrity contract in the project record):

  - Append-only: there is no update or delete operation. Corrections are
    appended as new records that reference the record they supersede;
    the superseded record is never mutated or removed.
  - Hash-chained: each record stores the SHA-256 of the canonical
    serialization of (previous_hash + this record's payload). Any
    post-hoc edit to an earlier record breaks every subsequent link, so
    tampering is detectable by re-walking the chain.
  - Provenance separated: each record carries a `record_kind` so Red
    Cell claims (module_event), independent verification
    (verifier_event), and engine decisions (qualification_decision) are
    distinguishable and never conflated.
  - A module cannot alter or delete its prior evidence records: the
    ledger exposes no API to do so. `append` is the only writer.

Integrity model and its limits:
  This reference ledger provides TAMPER-EVIDENCE, not tamper-PREVENTION.
  A party with write access to the ledger file who recomputes the whole
  chain can produce a self-consistent forged ledger. Detecting that
  requires the periodic checkpoints to be signed by a key the writer
  does not hold (see `checkpoint` and its docstring). Checkpoint signing
  is declared but not implemented here; until a restricted signing
  identity is wired in, treat chain-consistency as evidence of
  no-accidental-corruption and no-naive-tampering only. This limitation
  is listed as a release-gate blocker, same as the verifier's
  privilege-separation gap.

Standard library only. No network access.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator

GENESIS_PREV_HASH = "0" * 64
VALID_RECORD_KINDS = {
    "module_event",
    "verifier_event",
    "qualification_decision",
    "rejection",
    "checkpoint",
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _canonical(obj: Any) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _record_hash(previous_hash: str, payload: dict[str, Any]) -> str:
    h = hashlib.sha256()
    h.update(previous_hash.encode("utf-8"))
    h.update(_canonical(payload))
    return h.hexdigest()


@dataclass
class LedgerRecord:
    sequence: int
    record_kind: str
    recorded_at_utc: str
    previous_hash: str
    payload: dict[str, Any]
    record_hash: str
    supersedes: str | None = None  # record_hash of a record this corrects

    def to_dict(self) -> dict[str, Any]:
        return {
            "sequence": self.sequence,
            "record_kind": self.record_kind,
            "recorded_at_utc": self.recorded_at_utc,
            "previous_hash": self.previous_hash,
            "supersedes": self.supersedes,
            "payload": self.payload,
            "record_hash": self.record_hash,
        }

    @staticmethod
    def from_dict(d: dict[str, Any]) -> "LedgerRecord":
        return LedgerRecord(
            sequence=d["sequence"],
            record_kind=d["record_kind"],
            recorded_at_utc=d["recorded_at_utc"],
            previous_hash=d["previous_hash"],
            payload=d["payload"],
            record_hash=d["record_hash"],
            supersedes=d.get("supersedes"),
        )


class LedgerIntegrityError(Exception):
    pass


class EvidenceLedger:
    """
    A JSON-Lines backed append-only ledger. Each line is one
    LedgerRecord. The only mutating operation is `append`.
    """

    def __init__(self, path: str | Path):
        self.path = Path(path)
        self._records: list[LedgerRecord] = []
        if self.path.exists():
            self._load()

    # -- loading / integrity -------------------------------------------------

    def _load(self) -> None:
        self._records = []
        with self.path.open("r", encoding="utf-8") as fh:
            for line_no, line in enumerate(fh, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = LedgerRecord.from_dict(json.loads(line))
                except (json.JSONDecodeError, KeyError) as exc:
                    raise LedgerIntegrityError(
                        f"line {line_no}: unreadable ledger record: {exc}"
                    )
                self._records.append(rec)
        # Verify the chain on load so a tampered file is caught before use.
        self.verify_chain()

    def verify_chain(self) -> None:
        """
        Re-walk the chain and raise LedgerIntegrityError on the first
        broken link, out-of-order sequence, or payload whose stored hash
        does not match its recomputed hash.
        """
        prev = GENESIS_PREV_HASH
        for idx, rec in enumerate(self._records):
            if rec.sequence != idx:
                raise LedgerIntegrityError(
                    f"sequence out of order at index {idx}: stored "
                    f"sequence={rec.sequence}"
                )
            if rec.previous_hash != prev:
                raise LedgerIntegrityError(
                    f"broken chain at sequence {rec.sequence}: previous_hash "
                    f"{rec.previous_hash[:12]}... != expected {prev[:12]}..."
                )
            recomputed = _record_hash(prev, rec.payload)
            if recomputed != rec.record_hash:
                raise LedgerIntegrityError(
                    f"payload tampering detected at sequence {rec.sequence}: "
                    f"recomputed hash {recomputed[:12]}... != stored "
                    f"{rec.record_hash[:12]}..."
                )
            prev = rec.record_hash

    # -- the only writer -----------------------------------------------------

    def append(
        self,
        record_kind: str,
        payload: dict[str, Any],
        supersedes: str | None = None,
    ) -> LedgerRecord:
        if record_kind not in VALID_RECORD_KINDS:
            raise ValueError(
                f"unknown record_kind {record_kind!r}; expected one of "
                f"{sorted(VALID_RECORD_KINDS)}"
            )
        if not isinstance(payload, dict):
            raise ValueError("payload must be a JSON object")

        previous_hash = (
            self._records[-1].record_hash if self._records else GENESIS_PREV_HASH
        )
        sequence = len(self._records)

        # supersedes must reference an existing record_hash, if given.
        if supersedes is not None and supersedes not in {
            r.record_hash for r in self._records
        }:
            raise ValueError(
                f"supersedes references unknown record_hash {supersedes[:12]}..."
            )

        record_hash = _record_hash(previous_hash, payload)
        rec = LedgerRecord(
            sequence=sequence,
            record_kind=record_kind,
            recorded_at_utc=_utc_now(),
            previous_hash=previous_hash,
            payload=payload,
            record_hash=record_hash,
            supersedes=supersedes,
        )
        # Persist first (append to file), then keep in memory. If the
        # write fails, in-memory state is not advanced.
        with self.path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(rec.to_dict(), sort_keys=True, separators=(",", ":")))
            fh.write("\n")
        self._records.append(rec)
        return rec

    def checkpoint(self, signer_note: str = "") -> LedgerRecord:
        """
        Append a checkpoint record capturing the current head hash.

        In production this record's payload must be signed by a
        restricted signing identity whose key the exercise participants
        and payload modules never hold, so that a party who can rewrite
        the ledger file still cannot forge a valid checkpoint. That
        signing step is NOT implemented here; `signature` is recorded as
        null and `signer_note` is advisory only. Until signing is wired
        in, a checkpoint attests "the chain was consistent at this head
        at this time, per whoever wrote it" -- useful for ordering and
        accidental-corruption detection, not for defeating a motivated
        tamperer.
        """
        head = self._records[-1].record_hash if self._records else GENESIS_PREV_HASH
        payload = {
            "checkpoint_head_hash": head,
            "record_count": len(self._records),
            "signature": None,  # TODO: restricted-signer attestation
            "signer_note": signer_note,
        }
        return self.append("checkpoint", payload)

    # -- read-only accessors -------------------------------------------------

    def records(self) -> list[LedgerRecord]:
        return list(self._records)

    def by_kind(self, record_kind: str) -> Iterator[LedgerRecord]:
        return (r for r in self._records if r.record_kind == record_kind)

    def correlate(self, module_event_id: str) -> dict[str, Any]:
        """
        Gather every record whose payload references a given module
        event_id, so an auditor can see the module event, its verifier
        event, and the engine decision as one correlated set. Returns a
        dict keyed by record_kind -> list of payloads.
        """
        out: dict[str, list[dict[str, Any]]] = {}
        for rec in self._records:
            p = rec.payload
            refers = (
                p.get("event_id") == module_event_id
                or p.get("verified_event_id") == module_event_id
                or p.get("module_event_id") == module_event_id
            )
            if refers:
                out.setdefault(rec.record_kind, []).append(p)
        return out


def build_ledger_from_events(
    ledger_path: str | Path,
    events: Iterable[tuple[str, dict[str, Any]]],
) -> EvidenceLedger:
    """Helper: create a fresh ledger and append (kind, payload) pairs."""
    path = Path(ledger_path)
    if path.exists():
        path.unlink()
    ledger = EvidenceLedger(path)
    for kind, payload in events:
        ledger.append(kind, payload)
    return ledger
