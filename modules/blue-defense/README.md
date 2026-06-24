# Module 5: Blue Team Defense (Pure Shield)

> *Hunt in an already-compromised environment with incomplete telemetry.*

## Overview

**No Red Team Interface.** This module is exclusively for defensive operations training.

## Blue Team (SHIELD)

- Honeypot deployment console (Canary tokens, Cowrie, AD honeypot accounts)
- NDR analytics dashboard (network behavior anomaly detection)
- WIDS/WIPS tuning and rule management
- **Hunt mode**: The platform provides an already-compromised network with degraded telemetry. Blue must hunt, contain, and remediate without knowing the initial access vector.

## Hunt Mode Mechanics

1. Platform seeds a compromised environment (unknown to Blue)
2. Telemetry is degraded: 15-min SIEM lag, 10% host gaps, log corruption
3. Blue Team receives an initial "suspicious activity" hint
4. Must hunt, scope, contain, and remediate
5. No ground truth revealed until debrief

## Training Objective

Hunt in an already-compromised environment with incomplete telemetry and conflicting alerts.
