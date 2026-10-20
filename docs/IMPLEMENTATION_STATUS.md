# Implementation Status

Updated: 2026-10-20

## Working in the current code path

The first implementation milestone is a local, synthetic cyber-range for defensive practice and turn-based operator-versus-operator scoring.

- Three built-in scenarios: Identity Anomaly, Wireless Baseline Drift, and Protocol Anomaly Triage.
- Create a named training or operator-versus-operator session.
- Advance through pre-authored telemetry events.
- Record Blue-team investigation findings, detection rationale, and containment decisions.
- Award objective points and show a Red/Blue scorecard.
- Finish the exercise explicitly after all stages have been revealed; abort an active session.
- API surfaces: `GET /api/v1/range/scenarios`, `GET /api/v1/range/sessions`, `POST /api/v1/range/sessions`, `GET /api/v1/range/sessions/:id`, `POST /api/v1/range/sessions/:id/actions`, and `POST /api/v1/range/sessions/:id/abort`.

All scenario records are synthetic and local to the application. No scenario action scans or contacts a real network, exploits a service, captures credentials, or transmits wireless traffic.

## Current limitations

- Session state is held in a process-local in-memory map. Restarting the API loses sessions; multiple API instances will not share state.
- Operator-versus-operator is currently a turn-based scorecard in one session, not an authenticated multi-user or networked competition.
- The built-in event sequences are educational fixtures, not evidence from real sensors.
- Authentication/authorization enforcement for the new range API, persistent storage, concurrency controls, audit-chain integration, exportable debrief reports, and end-to-end browser tests are not yet verified.
- The other modules and infrastructure described in the architecture/README are not assumed to be operational merely because their documentation or folders exist.
- This implementation has not yet been run through the repository's TypeScript check, unit tests, browser tests, or a deployed environment from this change branch.

## Next milestones

1. Run TypeScript, unit, API integration, and browser tests; repair any failures.
2. Add durable storage with schema-backed sessions and safe migrations.
3. Add explicit operator identities, role-based authorization, room membership, and facilitator-controlled match lifecycle.
4. Build objective authoring, hint reveal, replay/debrief, export, and reproducible score calculation.
5. Add defensive data adapters only after validation, scope enforcement, and audit requirements are tested.
6. Keep offensive-side activity abstract and confined to the synthetic range unless a separately reviewed, isolated lab integration is designed and validated.

## Suggested local verification

```bash
npm ci
npm run check
npm test
npm run build
npm run dev
```

A successful command must be observed before its result is reported. No CI or deployment status is implied by this document.
