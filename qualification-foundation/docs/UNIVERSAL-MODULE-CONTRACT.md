# Universal Module Contract (NK-PAYLOAD-V1)

Every Red Cell payload module — NK-EM-001 through NK-EM-007, implemented
or not — must conform to this contract. It is the single rulebook the
qualification engine assumes. A module that violates it is rejected, not
accommodated.

## C1. The module declares; it never certifies.

A module reports what it attempted and the state it reached. It ends at
exactly one of:

- `cleanup_state: "cleanup_pending"` (module believes it cleaned up; a
  verifier must confirm)
- `cleanup_state: "cleanup_failed"` (module knows it did not clean up)

A module MUST NOT:

- emit `cleanup_state: "cleanup_verified"` (reserved to the verifier)
- include any field asserting its own verification outcome
  (`independent_verification`, `independent_cleanup_verification`,
  `cleanup_verified`, `verified`) at the top level or nested under
  `observations`
- return exit code 0 to mean "verified clean" — exit 0 means "reached
  CLEANUP_PENDING without error", nothing more

The engine rejects any module event that breaks C1, even when a valid
verifier event accompanies it. Proven by
`tests/test_engine.py::test_self_certification_*`.

## C2. The module declares the paths it touched, and its workspace root.

A state-changing module must emit `declared_workspace_root`,
`declared_artifact_path`, and `declared_temp_directory` (or the
module-type equivalents). The verifier re-checks these itself. The
verifier treats the workspace root as the authority boundary and rejects
any declared path that resolves outside it, and rejects symlinks left at
a declared path (a dangling or redirected symlink is never "absent").

## C3. An independent verifier, not the module, emits CLEANUP_VERIFIED.

The verifier:

- reads none of the module's self-reported success booleans
- re-derives absence/cleanliness from the system itself
- confirms identity fields match the module event
- confirms `verified_event_id == module.event_id`
- emits `result: "cleanup_verified"` or `"cleanup_failed"`

Independence is currently process + code only; privilege/infra/
attestation separation are open release-gate blockers (see
PAYLOAD-LIBRARY-SPEC.md §4.1, §10).

## C4. Fail closed, everywhere.

Missing module event, missing verifier event, verifier failure, schema
violation, unknown module id, identity mismatch, event-id mismatch,
conflicting records, or ledger-integrity failure each force BLOCKED or
REJECTED. There is no default-permissive branch and no path from module
execution directly to READY. Proven by the engine and integration
suites.

## C5. Every record is logged to the append-only, hash-chained ledger.

Module event, verifier event, and engine decision are each appended
under their own `record_kind`. Corrections are new superseding records,
never edits. A broken chain at decision time overrides any READY to
BLOCKED.

## C6. Daily-driver restriction is machine-enforced.

A `DAILY_DRIVER`-classified asset qualifies only for modules marked
`daily_driver_eligible: true`. Enforced in the engine regardless of
cleanup outcome. Proven by
`tests/test_engine.py::test_daily_driver_restriction_*`.

## C7. Documentation in three layers (required per module).

- **Layer 1 — Plain-English field guide**: what the security concept is,
  what adversary behavior is represented, why a defender cares, what the
  exercise simulates, what it actually does to the computer, what it
  deliberately does NOT do, what a normal user/admin would observe, and
  what counts as a successful exercise.
- **Layer 2 — Technical implementation specification**: architecture,
  lifecycle, I/O schemas, permissions, filesystem boundaries, cleanup,
  independent verification, failure handling, test requirements, and
  security assumptions/limitations.
- **Layer 3 — Qualification and evidence package**: manifest,
  machine-readable config, event examples, expected telemetry,
  verification records, acceptance criteria, negative test cases, audit
  trail, and reversibility classification.

A module is not release-gated until all three layers exist for it.
NK-EM-002's Layer 1 is `docs/NK-EM-002-FIELD-GUIDE.md`; Layers 2 and 3
are the module/verifier docstrings plus the contracts in `contracts/`
and the tests in `tests/`.
