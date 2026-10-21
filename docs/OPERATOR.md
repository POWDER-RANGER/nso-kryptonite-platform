# NSO Kryptonite — Current Operator Guide

Updated: 2026-10-20

> **Current capability boundary:** The executable vertical slice is a local synthetic cyber-range. It does not operate a real red-team payload system, C2 mesh, RF transmitter, EDR/SIEM integration, or real sensor fleet. Architecture diagrams and module names elsewhere in the repository are not proof that those capabilities are implemented.

## 1. Start locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run check
npm test
npm run dev
```

Open `http://localhost:3000`. The frontend proxies API requests to the local API server on port 3001. The first run uses in-memory session storage and requires no database service.

### Optional durable storage

For a local MySQL database, copy `.env.example` to `.env`, set `DATABASE_URL` to the database you control, set `RANGE_STORAGE=mysql`, then run:

```bash
npm run db:push
npm run dev
```

Run schema changes only against the intended development database. The database-backed session path exists in code but has not yet been verified against a live database in this branch.

## 2. Create a training or competition session

1. Open **Training Range** from the command center.
2. Enter an exercise name and select one of the built-in scenarios:
   - **Identity Anomaly** — synthetic Windows-style authentication and endpoint events.
   - **Wireless Baseline Drift** — synthetic inventory mismatch and client observations. It does not use an RF device.
   - **Protocol Anomaly Triage** — synthetic DNS and network observations.
3. Choose **Training** for individual practice or **Operator vs Operator** for the current shared, turn-based Red/Blue scorecard.
4. Select **Start exercise**.

Operator-vs-operator does not yet create separate logins, private team views, or a networked multiplayer room. Both roles currently interact with the same session view.

## 3. Advance and investigate

- **Advance scenario** reveals the next pre-authored event. Each revealed stage awards Red 10 progression points.
- **Investigation** requires a written finding referencing a clue such as an anomaly, baseline, identity, event, timestamp, inventory, or correlation. The current evaluator is a transparent keyword rubric, not an AI analyst or a human-quality assessment.
- **Submit detection rationale** requires a written detection condition, source, threshold, or rule rationale. The rubric awards the detection objective when an anomaly event has been revealed.
- **Record containment** requires a concrete defensive action such as isolation, quarantine, blocking, segmentation, or credential reset. A containment objective can score after a high-severity event has appeared.
- **Recovery validation** can score when the recovery event is present and the submitted finding mentions recovery evidence such as a reset, clean result, or follow-up.

Objectives score at most once per session. Repeated submissions can still add notes, but do not repeatedly award the same objective. The rubric is intentionally simple for this first slice and should not be treated as a certification or production security assessment.

## 4. Finish, abort, and debrief

After all scenario stages have been revealed, choose **Finish exercise and lock scorecard**. The session status becomes completed, and further actions are rejected. Choose **Abort session** to stop an active exercise early.

Open **Debrief Room** to select a saved session and review its Red/Blue score, objectives, event timeline, and notes. Memory-mode sessions disappear after the API process restarts. MySQL mode stores snapshots in the `range_sessions` table.

## 5. Safety and deployment boundaries

- All included scenarios use synthetic events only. No live scan, exploit, credential collection, RF transmission, external target, or real containment action is performed.
- The session REST and tRPC operations intentionally fail closed on production-like hosts until real operator authentication and authorization are implemented.
- Do not expose the prototype as a public multiplayer service.
- Do not treat placeholder architecture, existing module documentation, a green-looking dashboard element, or a source file as proof that a sensor, mesh, kill switch, AI engine, or defensive integration is operational.
- MySQL persistence has not been integration-tested in this branch. Concurrency controls, signed audit integration, reporting export, full role/room authorization, and browser end-to-end tests remain outstanding.

## 6. Verification and troubleshooting

Before accepting changes, run:

```bash
npm run check
npm test
npm run build
```

Then start the app and manually verify session creation, each action, session completion, abort behavior, and debrief refresh. Record actual command output and failures; do not report a test as passed unless it ran successfully.

| Symptom | Check |
| --- | --- |
| Scenario list does not load | Confirm API server is listening on port 3001 and frontend proxy is enabled. |
| Creating a session fails | Inspect the API response. In MySQL mode, confirm `DATABASE_URL` and that `npm run db:push` succeeded. |
| Session disappears after restart | Expected in memory mode; configure and verify MySQL mode for persistence. |
| Session API returns 503 | Expected on production-like environments until authorization is implemented. |
| Telemetry panel is empty | Expected until an exercise is created and its synthetic scenario is advanced. No live telemetry adapter is connected. |
| Detection/containment did not score | Review the objective state and provide an evidence-based rationale that satisfies the current visible rubric. |

*NSO Kryptonite — Authorized defensive training, with implemented capability clearly separated from architectural intent.*
