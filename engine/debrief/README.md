# Debrief & Co-Evolution Engine

> *Forensic reconstruction ceremony with strict protocol.*

## Divergence Analysis Protocol

1. **Blue Team Presents (60 min)** — Their reconstruction, hypotheses, confidence levels, dead ends
2. **Divergence Analysis (30 min)** — Map Blue's model vs ground truth without revealing truth
3. **Red Team Reveals (30 min)** — Ground truth with full artifact chain (only after Blue commits)
4. **Detection Engineering Workshop (60 min)** — Blue writes rules, Red critiques evasion

## Detection Half-Life Tracker

**Definition**: Hours into Tier N+1 before Blue's Tier N detection rules fire.

**Target**: 2-6 hours.

| Reading | Interpretation | Action |
|---------|---------------|--------|
| < 2 hours | Blue overfitting to specific artifacts | Red must innovate |
| 2-6 hours | Optimal learning zone | Continue current pace |
| > 6 hours | Blue failing to generalize | Training needs adjustment |

## Co-Evolution Cycle

```
Tier N Execution
    ↓
Blue writes detection rules (via platform)
    ↓
Red analyzes detection logic during debrief (Blue explains FIRST)
    ↓
Red adapts Tier N+1 TTPs via Scenario Engine (AI-assisted)
    ↓
Blue hunts with modified/new telemetry sources
    ↓
Detection Half-Life measured and logged
```
