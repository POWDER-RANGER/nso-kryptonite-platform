# NSO Kryptonite — Qualification Foundation

Red Cell qualification foundation for the bounded adversary-emulation
exercise "Operation Kryptonite Breakout." Simulated adversary objectives
producing real-but-inert telemetry; reproducible, contained, auditable.
Not intrusion tooling.

## Layout

```
contracts/
  module-event.schema.json            # module output contract (forbids self-certification)
  verifier-event.schema.json          # verifier output contract (sole source of cleanup_verified)
  qualification-decision.schema.json  # engine output contract (READY => no reasons)
red-cell/payloads/
  PAYLOAD-LIBRARY-SPEC.md             # library safety/reversibility contract (NK-PAYLOAD-V1)
  nk_em_002_artifact.py              # NK-EM-002 executing module (stops at CLEANUP_PENDING)
  nk_em_002_verify.py                # NK-EM-002 independent verifier (sole emitter of CLEANUP_VERIFIED)
qualification/
  engine.py                          # fail-closed qualification decision authority
  orchestrator.py                    # end-to-end pipeline + single READY choke point
evidence/
  ledger.py                          # append-only, hash-chained evidence ledger
docs/
  ARCHITECTURE.md                    # components, decision flow, mandatory rules, limitations
  THREAT-MODEL.md                    # threats, trust boundaries, controls, open blockers
  UNIVERSAL-MODULE-CONTRACT.md       # the rulebook every module (001-007) must follow
  NK-EM-002-FIELD-GUIDE.md           # Layer-1 plain-English guide for NK-EM-002
tests/
  test_engine.py                     # 20 checks incl. the self-certification guarantee
  test_ledger.py                     # 9 checks incl. tamper detection
  test_integration.py                # 3 end-to-end checks (module->verifier->ledger->engine)
run_all_tests.sh                     # runs all three suites
```

## Run the tests

```bash
bash run_all_tests.sh
```

All suites use `python3 -I` (isolated) and the standard library only
(`jsonschema` is optional, used only for the contract-validation check).

## Run one module through the full pipeline

```bash
mkdir -p /tmp/nk_ws
python3 -I qualification/orchestrator.py \
  --ledger /tmp/nk_ledger.jsonl \
  --workspace-root /tmp/nk_ws
```

A legitimate run prints `"final_decision": "READY"` with a 3-record
intact ledger. No module can reach READY by self-report.

## The governing rule

A module may report what it attempted. It cannot decide whether its own
evidence is trustworthy. See `docs/UNIVERSAL-MODULE-CONTRACT.md`.

## Implementation status (honest)

**Implemented and locally tested:** NK-EM-002 module + independent
verifier, qualification engine, append-only hash-chained ledger,
end-to-end orchestrator, three JSON contracts, three doc layers for
NK-EM-002, 32 passing test checks.

**Not done / open release-gate blockers:**

- Verifier independence is process + code only (no privilege /
  infrastructure / signed-attestation separation). See THREAT-MODEL T9.
- Ledger is tamper-evident, not tamper-proof (signed checkpoints not
  implemented). See THREAT-MODEL T10.
- `authorization_id` is structurally validated, not cryptographically
  authenticated. See THREAT-MODEL T11.
- NK-EM-001 and NK-EM-003 through NK-EM-007 are not drafted. The engine
  deliberately rejects any module_id not in its explicit registry.
- Participant / hardware / mTLS / Purple Overwatch gates from the
  exercise spec are out of this package's scope.

Nothing here has been committed to a repository or run anywhere but this
local session.
