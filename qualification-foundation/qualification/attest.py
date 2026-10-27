#!/usr/bin/env python3
"""
NK attestation primitive: HMAC-SHA256 over canonical JSON.

Purpose: give verifier events and engine decisions proof of origin that
a module (which never holds the key) cannot produce.

Properties:
  - Covers every field of the document except `attestation` itself, so
    any post-signing modification invalidates the MAC.
  - Constant-time comparison.
  - Key files must not be group/other accessible.

Limits (stated, not hidden):
  - HMAC is symmetric. Any holder of the key can forge. The trust
    boundary therefore includes every process that can read the key:
    the signer and the engine/orchestrator. The module must be outside
    it (enforced by uid separation + file mode, and probed by the
    orchestrator; see independence assessment in engine.py).
  - It does not prove WHERE the signer ran, only that a key holder
    signed.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import stat
from typing import Any

ALG = "HMAC-SHA256"
MIN_KEY_BYTES = 32


class AttestationKeyError(Exception):
    pass


def canonical(obj: Any) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")


def key_id(key: bytes) -> str:
    return hashlib.sha256(key).hexdigest()[:16]


def load_key(path: str) -> bytes:
    """Load a key file. Refuses keys that are short or group/other accessible."""
    try:
        st = os.stat(path)
    except OSError as exc:
        raise AttestationKeyError(f"cannot stat key file: {exc}") from exc
    if stat.S_IMODE(st.st_mode) & 0o077:
        raise AttestationKeyError(
            f"key file mode {oct(stat.S_IMODE(st.st_mode))} grants group/other access"
        )
    with open(path, "rb") as fh:
        key = fh.read().strip()
    if len(key) < MIN_KEY_BYTES:
        raise AttestationKeyError(f"key shorter than {MIN_KEY_BYTES} bytes")
    return key


def _body(doc: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in doc.items() if k != "attestation"}


def sign(key: bytes, doc: dict[str, Any]) -> dict[str, str]:
    mac = hmac.new(key, canonical(_body(doc)), hashlib.sha256).hexdigest()
    return {"alg": ALG, "key_id": key_id(key), "mac": mac}


def attach(key: bytes, doc: dict[str, Any]) -> dict[str, Any]:
    out = _body(doc)
    out["attestation"] = sign(key, out)
    return out


def verify(key: bytes, doc: Any) -> bool:
    if not isinstance(doc, dict):
        return False
    att = doc.get("attestation")
    if not isinstance(att, dict):
        return False
    if att.get("alg") != ALG or att.get("key_id") != key_id(key):
        return False
    mac = att.get("mac")
    if not isinstance(mac, str):
        return False
    expected = hmac.new(key, canonical(_body(doc)), hashlib.sha256).hexdigest()
    return hmac.compare_digest(mac, expected)
