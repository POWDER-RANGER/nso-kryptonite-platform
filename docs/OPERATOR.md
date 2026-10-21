# NSO Kryptonite — Current Operator Guide

Updated: 2026-10-20

> **Implemented scope:** The executable vertical slice is a local synthetic cyber range. It does not operate real red-team payloads, command-and-control infrastructure, radio transmitters, EDR/SIEM integrations, or a sensor fleet. Architecture diagrams and module folders are not proof those capabilities work.

## 1. Start locally

Requires Node.js 20 or newer.

```bash
npm install
npm run check
npm test
npm run dev
```

Open `http://localhost:3000`. In local development, the range API allows access without a role key. By default, saved exercises live in memory and disappear when the API restarts.

## 2. Controlled deployment access

Production-like deployments require three distinct environment secrets:

- `RANGE_RED_TOKEN`: can advance the Red scenario stage.
- `RANGE_BLUE_TOKEN`: can submit investigation, detection, containment, and Blue turn handoff actions.
- `RANGE_FACILITATOR_TOKEN`: can create exercises, finish them, and abort them.

Each secret must be randomly generated, at least 32 characters long, and different from the other two. Configure values in the host's environment settings; never commit them to the repository. Keep the bearer key only in the tab-scoped access panel, use HTTPS, and rotate any key that may have been exposed.

The panel's role selector is only a convenience label. The actual bearer key determines the server permissions. These environment-bound shared role keys are a controlled-pilot safeguard, **not** individual accounts, MFA, private team views, or a complete identity system.

When using MySQL persistence, copy `.env.example` to `.env`, configure `DATABASE_URL`, set `RANGE_STORAGE=mysql`, and run:

```bash
npm run db:push
```

The MySQL code path is present but still needs live-database verification.

## 3. Create an exercise

1. Open **Training Range** in the command center.
2. Enter an exercise name and choose a built-in scenario:
   - **Identity Anomaly**: synthetic Windows-style authentication and endpoint events.
   - **Wireless Baseline Drift**: synthetic inventory mismatch and client observations; no RF transmission or scanning.
   - **Protocol Anomaly Triage**: synthetic DNS and network observations.
3. Choose **Detection Testing** to validate a simple rule against the complete synthetic fixture set, **Training** for defensive investigation practice, or **Operator vs Operator** for a shared, turn-based Red/Blue scorecard.
4. Apply the facilitator key on a deployed service, then select **Start exercise**.

In Operator-vs-Operator mode, Red starts. Red advances one stage, then control passes to Blue. Blue can submit multiple responses during its turn. **End Blue turn** returns control to Red. The API rejects actions from the wrong role. The app currently has one shared session view; Red/Blue view separation and real multi-user room membership are future work.

## 4. Test a detection rule

Choose **Detection Testing** when creating a new session. This mode presents four synthetic fixture events for the selected scenario and evaluates a rule against the scenario's internal ground-truth labels. Ground-truth labels are not included in the displayed corpus.

The supported starter syntax is a semicolon-separated set of filters:

```text
source=WINDOWS,EDR;severity=MEDIUM,HIGH
```

Supported fields are `source` (WINDOWS, DNS, EDR, NETWORK), `severity` (INFO, LOW, MEDIUM, HIGH), and `contains` (text from the fixture title, description, or source). Multiple comma-separated values within a field are alternatives; fields combine as AND conditions. This is a small purpose-built rule evaluator, **not** a Sigma, YARA, or KQL parser. It does not ingest real security telemetry.

The result reports matched stage numbers, true positives (TP), false positives (FP), false negatives (FN), precision, recall, and pass/fail. To pass, the rule must match all labeled positive stages and no labeled negative stages. One successful test is required before a testing session can be completed. The rule parser and scoring are educational tools, not proof that a production detection works.

## 5. Investigate and score

- **Advance scenario** reveals the next pre-authored synthetic event and awards Red 10 points per stage.
- **Submit investigation** records a written finding. The initial scoring rubric checks for evidence-related keywords; it does not evaluate an analyst with AI or expert judgment.
- **Submit detection rationale** records a described source, match condition, threshold, or rule rationale.
- **Record containment** records a defensive action such as isolation, quarantine, blocking, segmentation, or reset.
- **Recovery validation** can score after the final scenario event when the written finding mentions recovery evidence.

The training/competition scoring rubric is intentionally simple and keyword-based. Detection Testing uses its own filter-based matcher and confusion metrics. Neither is a security certification, an expert grading process, or a measure of production readiness. Repeated submissions do not repeatedly award an already-completed objective.

## 6. Finish and debrief

After all stages are revealed, the facilitator selects **Finish exercise and lock scorecard**. In competition mode, all Blue turns must be handed back to Red before finishing. The final report displays Red/Blue scores and a score-based winner. A facilitator can abort an active session. Open **Debrief Room** to review the selected session's objective states, recorded event timeline, notes, and scores. Use **Export JSON** to download a copy of the selected session report; this browser download has not yet been end-to-end tested.

## 7. Supported diagnostic commands

The command line currently supports `help`, `status`, `healthcheck`, `scenarios`, `sessions`, `scope`, `mesh`, and `clear`. These are read-only diagnostics and local range operations. No command deploys a payload or changes a real network.

## 8. Boundaries and verification

- Every included scenario uses synthetic local events; no real scan, exploit, credential collection, radio transmission, or external target action is performed.
- Production-like session REST routes require role credentials; missing configuration fails closed. tRPC session procedures remain disabled on production-like hosts.
- Sessions are stored in memory by default. MySQL persistence uses full-session snapshots and does not yet provide concurrency-safe multiplayer transactions.
- Authentication is environment-bound role keys, not individual user accounts or MFA.
- Real sensor adapters, private asymmetric team views, audit-chain integration, browser end-to-end testing, and production deployment verification remain outstanding.
- Do not treat architecture diagrams, repository folders, or sample data as proof that a capability is connected or working.

Before accepting changes, run:

```bash
npm install
npm run check
npm test
npm run build
```

Then manually verify create/advance/action/handoff/finish/abort and debrief in a local browser. Report a test as passed only after its command actually ran successfully.
