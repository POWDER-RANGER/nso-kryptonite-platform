# NSO Kryptonite — Red Cell Payload Library

Version: 1.1
Profile: NK-PAYLOAD-V1
Status: Draft specification (NK-EM-002 implemented and tested; others not yet drafted)

## 1. Purpose

Provide controlled, platform-specific emulation modules that create
observable, reversible activity for authorized NSO Kryptonite exercises.

A payload is an exercise module, not an implant.

Modules must produce measurable events without establishing covert access,
evading endpoint controls, or maintaining unauthorized execution.

## 2. Mandatory execution envelope

Every module must receive:

- exercise_id
- operation_id
- participant_id
- asset_id
- module_id
- approved_scope_id
- authorization_id
- expiry_utc
- requested_parameters
- workspace_root (the directory the authorized scope designates for the
  module's temporary state; the verifier rejects any declared path
  outside this root)

Execution is rejected if:

- authorization is absent, expired, or revoked
- the asset is not in the approved exercise scope
- the participant is not assigned to the operation
- the module is not approved for the asset's qualification profile
- Purple Overwatch has suspended the exercise
- required prerequisites have not been verified

## 3. Required module manifest

Every module must publish:

- module_id and version
- supported operating systems and versions
- required hardware capabilities
- required permissions
- daily-driver eligibility
- resources it may create
- resources it may read
- network destinations, if any
- expected telemetry
- cleanup procedure
- independent cleanup-verification procedure
- timeout and resource limits
- failure and rollback behavior

## 4. The Two-Actor Evidence Rule (governing requirement)

No exercise module may certify its own cleanup, successful containment,
or independent verification.

- The executing module reports its actions and declares the resulting
  state. It ends at CLEANUP_PENDING or CLEANUP_FAILED. It is never
  permitted to emit CLEANUP_VERIFIED, and it must not carry any field
  asserting its own verification outcome.
- An independent verification component re-examines the relevant
  evidence (re-deriving it from the filesystem / system state itself,
  not from the module's self-report) and is the only component allowed
  to emit CLEANUP_VERIFIED.
- The qualification engine validates both records and their correlation.
- The ledger preserves the resulting evidence and its provenance.

Missing independent evidence means qualification remains blocked.

This rule applies to NK-EM-001 through NK-EM-007, including modules not
yet implemented.

### 4.1 Independence is layered, and only one layer is implemented

Running the verifier as a second process is **process + code
separation**. That is necessary but not sufficient. Full independence
also requires at least one of:

- **Privilege separation** — the verifier runs under a distinct OS
  identity/credential the module does not control.
- **Infrastructure separation** — the verifier runs on a host,
  container, or worker pool the module cannot write to.
- **Attestation separation** — the verifier signs its result with a key
  the module never holds, so a compromised module cannot forge a
  CLEANUP_VERIFIED record even with local code execution.

The reference implementation provides process + code separation only.
The other legs are **release-gate blockers** (section 10) and must be
closed before any module graduates from local testing to a live
exercise. The engine treats `verifier_identity` as advisory until then.

## 5. Approved initial module families

(Unchanged from v1.0: NK-EM-001 Process Observation; NK-EM-002 Temporary
Artifact Lifecycle; NK-EM-003 Authorized Network Event; NK-EM-004
Identity and Configuration Observation; NK-EM-005 Mobile Application
Test; NK-EM-006 Wireless and RF Lab Observation; NK-EM-007 Persistence
Behavior Demonstration — see v1.0 for each family's Allowed / Not
allowed / Cleanup definitions. Only NK-EM-002 is implemented in this
package.)

## 6. Required execution states

    DECLARED
      -> AUTHORIZED
      -> RUNNING
      -> COMPLETED
      -> CLEANUP_PENDING        (module stops here on success)
      -> CLEANUP_VERIFIED       (ONLY the independent verifier emits this)

Failure paths:

    RUNNING          -> FAILED
    RUNNING          -> CANCELLED
    CLEANUP_PENDING  -> CLEANUP_FAILED   (verifier could not confirm)
    Any state        -> SUSPENDED

CLEANUP_FAILED must prevent the asset from returning to READY.
A module that emits only CLEANUP_PENDING with no matching verifier
record also blocks READY — identical treatment to CLEANUP_FAILED.

## 7. Evidence requirements

Each module emits: operation and module identity, authorization
reference, asset and participant identity, start and end timestamps,
declared actions, observed actions, artifact hashes, declared cleanup
paths, errors and timeouts.

Each verifier emits: its own identity, the verified_event_id it checked,
the identity fields it re-confirmed, what it independently observed, and
its result.

A module's own success response is not independent cleanup evidence.

## 8. Daily-driver policy

A daily-driver asset may run only modules explicitly marked
`daily_driver_eligible: true`. Root, jailbreak, trust-store
modification, security-profile modification, and other security-boundary
tests require a dedicated lab asset. This is machine-enforced in the
qualification engine, not a UI warning. P005's primary phone is not
automatically eligible for those tests.

## 9. Integrity and audit requirements

Module packages must be versioned and hashed. The operation ledger
(`evidence/ledger.py`) is append-only and hash-chained: each record
stores SHA-256(previous_hash + payload); any post-hoc edit breaks every
subsequent link and is detected on reload. Corrections are appended as
new records that `supersede` the record they correct; nothing is ever
overwritten or deleted. Red Cell claims, independent verification, and
engine decisions are stored under distinct `record_kind` values and
never conflated.

The ledger provides tamper-EVIDENCE, not tamper-PREVENTION. Defeating a
writer who recomputes the whole chain requires signed checkpoints
(section 10 blocker).

## 10. Release gate

A module is not approved for exercise use until:

- its manifest is complete
- scope enforcement is tested
- resource limits are tested
- timeout behavior is tested
- cleanup is independently verified
- failure behavior is documented
- evidence output is schema-valid
- **privilege or infrastructure or attestation separation for its
  verifier is implemented** (currently open for all modules)
- **signed ledger checkpoints are implemented** (currently open)
- Purple Overwatch has approved its safety profile

NK-EM-002 currently satisfies the first seven items in local testing.
The last three are open blockers and apply library-wide.
