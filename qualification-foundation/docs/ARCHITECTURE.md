# NSO Kryptonite — Qualification Foundation Architecture

This package implements the Red Cell qualification foundation for the
"Operation Kryptonite Breakout" bounded adversary-emulation exercise. It
is a reproducible, auditable range control for a *simulated* adversary
producing *real but inert* telemetry — not intrusion tooling.

## Components and trust relationships

```
  payload module (NK-EM-002)         separate process, isolated (-I)
        | emits module_event (cleanup_state = pending | failed)
        v
  independent verifier               separate process, isolated (-I)
        | re-derives state from disk, emits verifier_event
        | (only producer of cleanup_verified)
        v
  evidence ledger                    append-only, hash-chained
        | stores module_event, verifier_event, decision as
        | distinct record_kinds; corrections supersede, never overwrite
        v
  qualification engine               fail-closed decision authority
        | validates schema, correlation, two-actor rule,
        | daily-driver policy
        v
  orchestrator choke point           READY only if engine=READY AND
                                     ledger chain intact at decision time
```

## The one invariant everything serves

**A module may report what it attempted. It cannot decide whether its
own evidence is trustworthy.**

Concretely, there is no code path — in the module, the engine, or the
orchestrator — that turns a module's self-report into READY. READY
requires a *different* actor (the verifier) to confirm cleanup from the
system itself, the engine to accept the correlated pair, and the ledger
chain to be intact.

## Decision flow (authoritative)

```
Exercise authorized
  -> module executes -> module_event (CLEANUP_PENDING | CLEANUP_FAILED)
  -> independent verifier -> {CLEANUP_VERIFIED | CLEANUP_FAILED}
       CLEANUP_FAILED / no verifier event ---------------------> BLOCKED
  -> ledger integrity + event correlation
       broken chain / mismatch / bad schema / unknown module --> REJECTED
  -> qualification evaluation
       all requirements satisfied ----------------------------> READY
       otherwise ---------------------------------------------> BLOCKED
```

No alternate edge reaches READY.

## Mandatory engine rules (implemented in `qualification/engine.py`)

| Condition                        | Engine behavior                 |
| -------------------------------- | ------------------------------- |
| Module reports CLEANUP_PENDING, no verifier | BLOCKED             |
| No verifier event                | BLOCKED                         |
| Verifier reports failure         | BLOCKED                         |
| Event IDs do not match           | REJECTED                        |
| Unknown module ID                | REJECTED                        |
| Invalid event schema             | REJECTED                        |
| Conflicting identity records     | REJECTED                        |
| Module self-certifies            | REJECTED                        |
| Ledger integrity failure         | BLOCKED (orchestrator override) |
| Daily-driver + ineligible module | BLOCKED                         |
| All requirements satisfied       | READY                           |

## Known limitations (honest status)

These are real and tracked as release-gate blockers, not hidden:

1. **Verifier independence is process + code only.** No privilege,
   infrastructure, or signed-attestation separation yet. A module with
   arbitrary local code execution and write access to the same
   environment is not yet provably unable to influence its verifier. See
   `nk_em_002_verify.py` docstring and PAYLOAD-LIBRARY-SPEC.md §4.1.
2. **Ledger is tamper-evident, not tamper-proof.** A writer who
   recomputes the entire chain can forge a self-consistent ledger.
   Closing this requires signed checkpoints (declared, not implemented).
3. **Authorization is structurally validated, not authenticated.** The
   module checks that an `authorization_id` is present and well-formed;
   it does not yet verify a signed authorization object from an
   operation service.
4. **Scope covers the cleanup/verification gate only.** Participant,
   hardware, mTLS, and Purple Overwatch authorization gates from the
   exercise spec are separate and not part of this package.

## What is proven (by the test suites in `tests/`)

- Honest run reaches READY with a 3-record intact chain.
- A module cannot self-certify to READY (4 forbidden fields + nested +
  direct state forgery).
- Missing/failed verification blocks READY.
- Schema, correlation, unknown-module, and identity violations are
  rejected.
- Ledger tampering (payload edit, record deletion) is detected on
  reload.
- Corrections supersede without overwriting.
- Daily-driver policy enforced both ways.
- Path-escape and symlink tricks in declared paths are rejected by the
  verifier.
