# Module 1: Active Directory Fusion

> *Detect Kerberos attacks under normal authentication noise.*

## Overview

The Active Directory Fusion module simulates and detects AD-based attack techniques. It combines BloodHound path visualization, Kerberos attack simulation, and real-time detection engineering.

## Red Team (WEAPON)

- BloodHound ingest and path visualization
- AS-REP roasting simulation
- Kerberoasting simulation
- DCSync simulation
- Trust abuse chain builder with lateral movement scripting

**Constraint**: Every Kerberos attack is simultaneously logged to Blue Team SIEM with 15-second delay. Red cannot disable this.

## Blue Team (SHIELD)

- Windows Event Log real-time stream (Event IDs 4768, 4769, 4771, 4776)
- Zeek `kerberos.log` correlation
- Sigma rule editor with live compilation
- Hardening wizard: MSA deployment, AES-only enforcement, SPN cleanup

## Detection Twin Mapping

| Attack Technique | Event IDs | Sigma Rule | Detection Logic |
|-----------------|-----------|------------|-----------------|
| AS-REP Roasting | 4768 | `asrep-roasting.yml` | Pre-auth disabled + encrypted timestamp |
| Kerberoasting | 4769 | `kerberoasting.yml` | Service ticket request for user account |
| DCSync | 4662 | `dcsync-replication.yml` | DS-Replication-Get-Changes-All |
| Trust Abuse | 4624 | `cross-forest-auth.yml` | Cross-forest auth + suspicious source |

## Training Objective

Distinguish legitimate service ticket requests from roasting attempts. Detect Kerberos anomalies under normal AD authentication noise.

## File Structure

```
modules/ad-fusion/
├── README.md
├── src/
│   ├── red/
│   │   ├── bloodhound.ts       # BloodHound integration
│   │   ├── kerberos-attacks.ts # Roasting simulation logic
│   │   ├── dcsync.ts           # DCSync simulation
│   │   └── lateral-movement.ts # Trust abuse scripting
│   ├── blue/
│   │   ├── event-monitor.ts    # Windows Event Log streaming
│   │   ├── sigma-rules/        # Sigma rule definitions
│   │   └── hardening-wizard.ts # Automated remediation
│   └── shared/
│       ├── attck-mapping.ts    # MITRE ATT&CK technique mapping
│       └── constraints.ts      # Safety constraints (immutable)
├── tests/
│   ├── red.test.ts
│   ├── blue.test.ts
│   └── integration.test.ts
└── docs/
    ├── RED-OPERATOR.md
    ├── BLUE-ANALYST.md
    and SCENARIO-DESIGN.md
```
