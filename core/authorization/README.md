# Authorization Core

> *The authorization core is not a module. It is the runtime dependency of every function call.*

## Overview

The Authorization Core enforces that **no offensive action can execute without simultaneous defensive logging and remediation pathways**. It is physically impossible to use this software for unauthorized operations.

## Components

### Authorization Token (Ed25519 JWT)

| Field | Description |
|-------|-------------|
| Subject | Device identity (hardware-bound key) |
| Scope | IP ranges, VLANs, technique classes, time window |
| Mode | WEAPON, SHIELD, SANCTUARY, SPECTATOR |
| Exercise ID | Links actions to specific campaign |
| Issuer | Training controller cryptographic signature |
| TTL | 60 seconds, revalidated continuously |

### Scope Enforcement Layers

1. **Network layer** — eBPF filters
2. **Hypervisor layer** — Proxmox firewall rules
3. **Application layer** — Token validation on every API call
4. **Hardware layer** — SDR firmware locks

### Audit Chain (Merkle Tree)

```
[Timestamp] [Device ID] [Operator] [Mode] [Action Hash] [Scope Hash] [Result] [Prev Hash]
```

- Append-only, distributed, blockchain-anchored
- Every mesh node maintains a full copy
