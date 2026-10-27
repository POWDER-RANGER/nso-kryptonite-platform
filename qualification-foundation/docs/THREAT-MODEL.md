# Threat Model — NK Qualification Foundation

Scope: the cleanup-verification and qualification-decision path. Not the
full exercise (participant/hardware/mTLS/Overwatch gates are separate).

## Assets to protect

- **Integrity of the READY decision.** A device must reach READY only
  when it genuinely did what it claimed and cleaned up.
- **Integrity of the evidence ledger.** The audit record must reflect
  what actually happened.
- **The test host's baseline.** Modules must not persist or escape their
  authorized workspace.

## Trust boundaries

1. Module process  <-->  Verifier process (must be independent)
2. Module/verifier events  <-->  Qualification engine (events are
   untrusted input; the engine validates, never assumes)
3. Ledger file on disk  <-->  Anyone with filesystem write access

## Threats and controls

| # | Threat | Control | Status |
|---|--------|---------|--------|
| T1 | A buggy/compromised module claims cleanup it did not perform | Module cannot emit CLEANUP_VERIFIED; separate verifier re-derives state; engine rejects self-certification fields | Implemented, tested |
| T2 | Module declares a path outside its workspace to make the verifier check the wrong place | Verifier rejects any declared path resolving outside `declared_workspace_root` | Implemented, tested |
| T3 | Module leaves a symlink and relies on `.exists()` semantics to look clean | Verifier treats any symlink at a declared path as "not absent" | Implemented, tested |
| T4 | Forged/mismatched verifier event paired with a module event | Engine checks verifier identity, source_module_id, event_id correlation, and all identity fields | Implemented, tested |
| T5 | Unknown/unregistered module smuggled through | Engine rejects any module_id not in its explicit registry | Implemented, tested |
| T6 | Post-hoc edit of ledger evidence | Hash chain; edit breaks subsequent links; detected on reload; orchestrator overrides READY->BLOCKED on broken chain | Implemented, tested |
| T7 | Malformed/garbage events crash the engine into undefined state | All loaders fail closed to REJECTED; non-dict inputs handled | Implemented, tested |
| T8 | Daily-driver device used for a restricted module | Engine enforces daily_driver_eligible regardless of cleanup result | Implemented, tested |
| T9 | Verifier is not truly independent of the module (shared privilege/host) | Needs privilege/infra/attestation separation | **OPEN — release-gate blocker** |
| T10 | Writer recomputes the whole chain to forge a consistent ledger | Needs signed checkpoints by a restricted key | **OPEN — release-gate blocker** |
| T11 | Fake authorization_id string accepted | Needs signed authorization object from operation service | **OPEN — out of this package's scope** |

## Residual risk statement

As implemented, this foundation defends against an *honest-but-buggy*
module and against *naive tampering* of events and the ledger. It does
**not** yet defend against a module that achieves arbitrary code
execution in the same security context as its verifier (T9), a motivated
ledger forger (T10), or a forged authorization (T11). Those three are
the gating work before any live exercise.
