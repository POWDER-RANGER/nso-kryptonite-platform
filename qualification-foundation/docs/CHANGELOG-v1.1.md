# v1.1 Verification Report — NK-EM-002 Verifier, Engine, Orchestrator

Evidence classes used below: **Observed** (directly produced by a command
I ran in this session), **Verified** (independently confirmed against
an authoritative source — here, re-running the actual code, not trusting
a prior claim), **Inferred** (reasonable interpretation not independently
established), **Unverified** (not yet demonstrated), **Failed** (a
requirement or test did not pass).

## 1. Existing implementation and baseline

Three external validation reports (on `nk_em_002_verify.py` v1.0.0,
`nk_em_002_artifact.py` v1.1.0, and `PAYLOAD-LIBRARY-SPEC.md`) were
received as claims, not accepted as fact. **Observed**: I reproduced
each reported defect against the actual v1.0.0 source before changing
anything (`/tmp/nk_repro` session, inline Python harness).

## 2. Identified weaknesses and bypass paths (baseline, v1.0.0)

| ID | Claimed defect | Reproduction result | Class |
|----|----------------|---------------------|-------|
| R1 | Both path fields omitted → false `cleanup_verified` | **Confirmed** — exit 0, `result=cleanup_verified` | Observed |
| R2 | Symlink detection ineffective (resolve-then-check order) | **Partially confirmed**: a symlink to a directory *inside* the workspace was in fact caught (`cleanup_failed`) by v1.0's path-escape check acting as an accidental side effect; dangling/external symlinks were already rejected. The *parent-directory* symlink case (component-wise), which the review also implied, was genuinely unguarded. | Observed |
| R5 | `declared_workspace_root=None` → uncaught `TypeError` | **Confirmed** — `TypeError: argument should be a str or os.PathLike` | Observed |
| R6 | Undeclared residue invisible to the verifier | **Confirmed** — stray file left in workspace, declared paths absent → `cleanup_verified` | Observed |
| R7 | Event's own `declared_workspace_root` trusted as the authorization boundary | **Confirmed** — event declaring a different, attacker-chosen workspace root still verified clean | Observed |

One external report's specific claim ("the verifier followed \[a
symlink\] and reported that the resulting path was not a symlink," for
a symlink pointing inside the authorized workspace) did **not**
reproduce as stated — v1.0's workspace-boundary check happened to
reject that specific case for an unrelated reason. I'm recording this
discrepancy rather than silently accepting the report's text, per the
accuracy-over-agreement requirement. The underlying architectural
concern (resolve-before-symlink-check ordering) was still real and is
fixed in v1.1 regardless.

## 3. Corrections made (v1.1.0)

All in this session, applied to local files, not yet committed to any
repository at time of writing this report.

1. **`nk_em_002_verify.py` v1.1.0** — rewritten:
   - Required path keys (`declared_artifact_path`, `declared_temp_directory`) must be *present*; omission is rejected. Explicit `null` remains valid (fixes R1).
   - Every field type-checked before any `Path()` construction; filesystem `OSError`s converted to an explicit `cleanup_indeterminate` result rather than crashing or silently guessing (fixes R5).
   - Workspace inventory check: lists the authorized workspace directory and fails if anything exists there outside the declared (and now-confirmed-absent) paths (fixes R6).
   - Authorized workspace root is now a **required CLI parameter** (`--authorized-workspace-root`), supplied by the orchestrator. The event's own `declared_workspace_root`, if present, is cross-checked against it and rejected on mismatch — never used as the authority (fixes R7).
   - Symlink detection is now component-wise via `lstat`-style checks walking from the declared leaf up to the workspace boundary, catching a symlinked *parent* directory, not just the leaf.
   - Added `cleanup_indeterminate` as a distinct, non-passing result for unobservable filesystem state.
   - Added optional `--max-staleness-seconds` and HMAC attestation (`--attestation-key`) support.

2. **`qualification/engine.py`** — extended:
   - `cleanup_indeterminate` and `rejected` added as valid-but-non-passing verifier results, each with its own `RejectReason` (previously these would have failed schema validation as unexpected enum values).
   - Freshness check: a verifier timestamp earlier than the module's own completion timestamp is rejected (`VERIFICATION_PRECEDES_COMPLETION`).

3. **`qualification/orchestrator.py`** — extended:
   - Passes `--authorized-workspace-root` to the verifier explicitly (closes R7 at the integration layer, not just inside the verifier).
   - **Replay detection**: rejects a module event whose `event_id` already appears in the ledger.
   - **Conflicting-verifier-record detection**: rejects if a *different* result has already been recorded for the same `verified_event_id` (closes the "conflicting verifier outputs" category — this was not covered by any prior layer; the engine's API only ever accepts one verifier event per call, so the conflict had to be caught at the ledger/orchestration layer).
   - **Attestation wiring**: if a key is supplied, the verifier signs its result and the orchestrator independently re-verifies the signature before trusting it; a failed check forces `REJECTED` regardless of the verifier's stated result.
   - **Honest independence assessment** (`assess_independence()`): reports the actual OS UID the module and verifier ran under. In this container, both report UID 0 (root) — i.e., **no privilege separation exists in this reference deployment**, and the function says so explicitly rather than claiming otherwise.

4. **`qualification/attest.py`** (new) — HMAC-SHA256 attestation primitive with constant-time comparison, key-file permission checks, and an explicit docstring stating its limits (symmetric key, so the trust boundary is "everyone who can read the key file," not a cryptographic proof of process identity).

## 4. Tests performed and actual results

| Suite | Checks | Result |
|---|---|---|
| `tests/test_engine.py` | 20 | **20 passed, 0 failed** (Observed, this session) |
| `tests/test_ledger.py` | 9 | **9 passed, 0 failed** (Observed, this session) |
| `tests/test_integration.py` | 3 | **3 passed, 0 failed** (Observed, this session) |
| `tests/test_verifier_v1_1_adversarial.py` (new) | 16 | **16 passed, 0 failed** (Observed, this session) |
| **Total** | **48** | **48 passed, 0 failed** |

Adversarial categories covered by the new suite, mapped to the
directive's required list:

- Missing evidence → `test_r1_omitted_keys_rejected`
- Malformed evidence → `test_malformed_json_rejected`, `test_invalid_field_type_rejected`
- Fabricated evidence (forged attestation) → separate inline test, §5 below
- Modified evidence (post-signing tamper) → separate inline test, §5 below
- Replayed evidence → `_check_replay`, exercised inline, §5 below
- Contradictory evidence (conflicting verifier outputs) → `_check_verifier_conflict`, exercised inline, §5 below
- Invalid timestamps → `test_invalid_timestamp_rejected`
- Broken provenance / workspace-authority mismatch → `test_r7_event_declares_different_workspace_rejected`
- Unavailable verification sources → `cleanup_indeterminate` path (unit-level in `engine.py`'s new branch; not yet exercised via a real filesystem-permission-denial integration test — see §6 limitation)
- Partial verification results → `cleanup_indeterminate` handling in the engine
- Unauthorized state transitions → `test_module_claiming_success_directly_blocks_not_ready` (existing suite)
- Bypass attempts → all of the above, plus the original 20-test self-certification suite

Positive (legitimate-acceptance) tests included and passing:
`test_legitimate_cleanup_verifies`, `test_r1b_explicit_null_still_verifies`,
`test_positive_case_reaches_ready`, and the full end-to-end orchestrator
run with attestation enabled (Observed, printed output above).

## 5. Evidence supporting each conclusion

- Attestation forgery resistance: **Observed** directly — a forged event signed with the wrong key, an unsigned forged event, and a payload modified after signing all independently returned `verify() == False` against the real key (three inline test cases, this session).
- Replay detection: **Observed** — `_check_replay` raised `ReplayDetected` when given a real, previously-recorded `event_id`.
- Conflicting-verifier-record detection: **Observed** — `_check_verifier_conflict` raised when a second, contradictory result for the same `verified_event_id` was presented; did not false-positive on an identical repeated result.
- All fixes re-validated against the original 8-case reproduction harness from the v1.0 baseline: 7 of 8 cases now behave correctly; the 8th (R5 retest) is not a remaining bug but a structural non-issue — explained in-line, not asserted without justification.

## 6. Remaining limitations and unresolved risks (stated plainly, not hidden)

- **No privilege or infrastructure separation.** `assess_independence()` reports this honestly: in this container, the module and verifier run as the same OS user (UID 0). This is **Unverified** as a security control and is the single largest open gap. A passing test suite under this condition is evidence of *logical* correctness, not of *independent* verification in the sense the directive requires — the directive's own point (§3.5) that "a separate process alone does not establish independent verification" is architecturally acknowledged but not yet operationally closed.
- **HMAC attestation is symmetric.** Anyone who can read the key file can forge a result. It raises the bar (a module cannot forge without filesystem access to the key) but does not reach asymmetric/hardware-backed attestation.
- **`cleanup_indeterminate` is implemented and accepted by the engine, but I could not produce a live permission-denial reproduction in this session's environment.** I attempted it directly: `chmod 000` on a directory containing a leftover file, then ran the verifier against it. **Observed result**: this container runs as root (confirmed via `id`), and root bypasses Unix permission bits for file access — `os.listdir()` on the chmod-000 directory succeeded anyway, so no `PermissionError`/`OSError` was raised and the verifier correctly fell through to `cleanup_failed` (the leftover file was genuinely still present) rather than reaching the `cleanup_indeterminate` branch. This is an **environment constraint** (no non-root user available to test with), not a skipped test or a defect — the branch remains reachable by code inspection but is **Unverified by live reproduction** in this session. A real test would require running the verifier as a non-root user against a directory owned by a different user.
- **The ledger remains tamper-evident, not tamper-proof** (unchanged from v1.0; signed checkpoints still not implemented).
- **`authorization_id` is still only structurally validated**, not cryptographically authenticated against an operation service.
- NK-EM-001 and NK-EM-003–007 remain undrafted; the engine's explicit module registry continues to reject any module ID not in it.

## 7. Final qualification status and exact reasons

**NK-EM-002 verifier v1.1.0, qualification engine, and orchestrator:
CONDITIONALLY QUALIFIED for continued local testing. NOT QUALIFIED to
independently authorize READY status for a live, adversarial exercise.**

Reasons:
- PASS: all five confirmed v1.0 defects (R1, R5, R6, R7, and the
  component-wise symlink gap) are fixed and proven by direct
  reproduction against the corrected code, not merely asserted.
- PASS: 48/48 automated checks pass, including dedicated adversarial
  coverage for replay, conflicting records, forged/tampered attestation,
  staleness, and malformed/incomplete input.
- BLOCKING: privilege/infrastructure separation remains absent and is
  reported as such by the system itself (`assess_independence()`), not
  asserted as solved. Per the directive's own governing principle, a
  passing unit/integration test suite is not proof of production
  readiness or independent assurance, and I am not representing it as
  such here.

No repository commit, deployment, or production use has occurred as a
result of this work. All of the above is local-session evidence only,
reproducible by running `bash run_all_tests.sh` and
`python3 -I tests/test_verifier_v1_1_adversarial.py` in the delivered
package.
