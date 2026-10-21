# Implementation Status

Updated: 2026-10-20

## Working in the current code path

The first implementation milestone is a local, synthetic cyber-range for defensive practice and turn-based operator-versus-operator scoring.

- Three built-in scenarios: Identity Anomaly, Wireless Baseline Drift, and Protocol Anomaly Triage.
- Create a named training or operator-versus-operator session.
- Advance through pre-authored telemetry events.
- Record Blue-team investigation findings, detection rationale, and containment decisions.
- Award objective points and show a Red/Blue scorecard using a transparent keyword-based evidence/action rubric (not AI judgment).
- Finish the exercise explicitly after all stages have been revealed; abort an active session.
- API surfaces: `GET /api/v1/range/scenarios`, `GET /api/v1/range/sessions`, `POST /api/v1/range/sessions`, `GET /api/v1/range/sessions/:id`, `POST /api/v1/range/sessions/:id/actions`, and `POST /api/v1/range/sessions/:id/abort`.

All scenario records are synthetic and local to the application. No scenario action scans or contacts a real network, exploits a service, captures credentials, or transmits wireless traffic.

## Current limitations

- Memory mode is the default and loses sessions when the API restarts. Optional MySQL persistence now uses the `range_sessions` table when `RANGE_STORAGE=mysql` is set and `npm run db:push` has been run; this database path has not yet been runtime-verified.
- Session updates are full-snapshot writes, not concurrency-safe multiplayer transactions.
- Operator-versus-operator now enforces Red advance → Blue response → Blue handoff and computes a winner from the final score. Environment-bound role keys distinguish Red, Blue, and facilitator actions, but there are no individual user accounts, MFA, private team views, or networked rooms.
- The built-in event sequences are educational fixtures, not evidence from real sensors. The current scoring rubric is transparent keyword matching and is not a security certification or expert assessment.
- Production REST session routes now use separate role-specific bearer credentials. Configure `RANGE_RED_TOKEN`, `RANGE_BLUE_TOKEN`, and `RANGE_FACILITATOR_TOKEN` as three different randomly generated secrets, each at least 32 characters long. Missing or weak configuration returns 503, missing/invalid credentials return 401, and an unauthorized role returns 403. tRPC session procedures remain disabled on production-like hosts.
- MySQL persistence is implemented in code but unverified against a running database. Concurrency controls, audit-chain integration, exportable debrief reports, and end-to-end browser tests are not yet verified.
- The other modules and infrastructure described in the architecture/README are not assumed to be operational merely because their documentation or folders exist.
- This implementation has not yet been run through the repository's TypeScript check, unit tests, browser tests, or a deployed environment from this change branch.

## Next milestones

1. Run TypeScript, unit, API integration, and browser tests; repair any failures.
2. Verify MySQL persistence against a real database, including migration, restart survival, and error handling.
3. Harden the role-key pilot into individual operator accounts, secure session management, room membership, and private Red/Blue information boundaries.
3. Add explicit operator identities, role-based authorization, room membership, and facilitator-controlled match lifecycle.
4. Build objective authoring, hint reveal, replay/debrief, export, and reproducible score calculation.
5. Add defensive data adapters only after validation, scope enforcement, and audit requirements are tested.
6. Keep offensive-side activity abstract and confined to the synthetic range unless a separately reviewed, isolated lab integration is designed and validated.

## Suggested local verification

```bash
npm install
npm run check
npm test
npm run build
npm run dev
```

A successful command must be observed before its result is reported. No CI or deployment status is implied by this document.
