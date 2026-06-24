# Scenario Engine

> *Campaign orchestration through deterministic state machines.*

## Overview

Every exercise is a state machine that progresses through kill chain phases with defined triggers.

## Kill Chain State Machine

```
[RECON] → [INITIAL_ACCESS] → [PERSISTENCE] → [LATERAL_MOVEMENT] → [EXFILTRATION] → [IMPACT]
   ↑            ↑                  ↑                  ↑                ↑            ↑
   └────────────┴──────────────────┴──────────────────┴────────────────┴────────────┘
                    (Blue Team detection triggers phase transitions)
```

## Phase Transitions

| Trigger Type | Description |
|-------------|-------------|
| **Time-based** | Minimum dwell time per phase (e.g., 6-hour silence after initial access) |
| **Detection-based** | Blue detection may accelerate or decelerate state machine |
| **Error-based** | Red exceeding error budget triggers unannounced failures |

## Deception Layering Protocol

Every scenario contains four layers of deception:

1. **Primary Decoy** — Obvious artifact to trigger immediate Blue response
2. **Secondary Decoy** — Plausible but false narrative
3. **Real C2** — Hidden in operationally boring surface
4. **Tertiary Dead Drop** — Recovery mechanism if primary C2 burned

## Organizational Psychology Injects

| Inject | Training Target |
|--------|----------------|
| Managerial Anchoring | Resistance to authority-based dismissal |
| Analyst Conflict | Evidence-based resolution under friction |
| Shift Turnover | Documentation discipline and continuity |
| Bad Intel | Source skepticism and validation |
| Executive Pressure | Confidence calibration under time pressure |
| Fatigue Simulation | Sustained analytical rigor |
| Ticket Pressure | Triage discipline and signal discrimination |
| False Quiet | Persistence and delayed-pattern recognition |
