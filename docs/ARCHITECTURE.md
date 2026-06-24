# NSO Kryptonite Platform — Architecture

> *Every NSO technique taught is inseparable from its detection, mitigation, and accountability mechanism.*

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Deployment Topology: The Sanctuary Mesh](#deployment-topology)
3. [Data Flow](#data-flow)
4. [Security Model](#security-model)
5. [Component Architecture](#component-architecture)
6. [Database Schema Overview](#database-schema-overview)
7. [Network Architecture](#network-architecture)
8. [AI/OBLISK Engine](#aiobelisk-engine)

---

## System Overview

The NSO Kryptonite Platform is a **federated sanctuary mesh** — a distributed system where any authorized device can join as a command node, sensor, or target. It operates in four runtime modes (WEAPON, SHIELD, SANCTUARY, SPECTATOR) with cryptographic mode-switching ceremonies.

### Key Architectural Decisions

- **Progressive Web App (PWA) for mobile**: Offline capability, encrypted local storage, WebRTC mesh signaling. No App Store gatekeeping.
- **WebAssembly (WASM) client**: Heavy computation (log analysis, Sigma compilation, network graph rendering) runs client-side to minimize server dependency and maximize air-gapped capability.
- **WireGuard + mTLS mesh**: Zero-trust overlay. No device trusts any other by default. Authorization tokens revalidated every 60 seconds.
- **Local-First, Cloud-Optional**: Entirely local mesh operation. Cloud used only for backup, never for runtime dependency.
- **Authorization Core as Runtime Dependency**: No function executes without a valid cryptographic token. The authorization core is not a module — it is the foundation.

---

## Deployment Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                    SANCTUARY MESH                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  COMMAND     │  │   COMMAND    │  │   COMMAND    │            │
│  │  NODE (Web)  │  │  NODE (iOS)  │  │ NODE (Linux) │            │
│  │  Laptop      │  │  Cell Phone  │  │  SBC/Server  │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                 │                 │                     │
│         └─────────────────┼─────────────────┘                     │
│                           │                                       │
│              ┌──────────────┴──────────────┐                       │
│              │      MESH GATEWAY           │                       │
│              │  (WireGuard + mTLS)         │                       │
│              │  Zero-trust overlay         │                       │
│              └──────────────┬──────────────┘                       │
│                           │                                       │
│         ┌─────────────────┼─────────────────┐                    │
│         │                 │                 │                     │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐           │
│  │   TARGET     │  │   SENSOR     │  │   REDIRECTOR │           │
│  │   RANGE      │  │   ARRAY      │  │   MESH       │           │
│  │  (Proxmox)   │  │  (Zeek/EDR)  │  │  (C2 Front)  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │         AUTHORIZATION & AUDIT CORE (Blockchain)      │       │
│  │    Immutable | Append-only | Cryptographically Scoped  │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Models

| Model | Scale | Hardware | Use Case |
|-------|-------|----------|----------|
| **Home Lab** | Single device | Raspberry Pi 5, NUC, Linux laptop | Individual training, certification prep |
| **Training Range** | 3-5 servers | Bare metal + SDR | Corporate training, bootcamps |
| **Sanctuary Mesh** | Distributed | Multi-site WireGuard | National exercises, military training |
| **Mobile Command Post** | 1 rugged device | Portable, air-gapped | Field incident response |

---

## Data Flow

### Exercise Lifecycle

```
[SCENARIO DESIGN] → [AUTHORIZATION] → [DEPLOYMENT] → [EXECUTION] → [DEBRIEF]
       │                    │                │              │            │
       ▼                    ▼                ▼              ▼            ▼
   OBLISK AI          Token Minting    Target Range    Real-time    Divergence
   generates          Scope Enforced   Provisioning    Telemetry    Analysis
   scenario           60s TTL          VM snapshots    to Shield    Detection
   with ATT&CK        Blockchain       C2 mesh         + Audit      Half-life
   mapping            anchored         standing        Chain      Measurement
```

### Telemetry Pipeline

```
Zeek ──┐
EDR ───┤
DNS ───┼──> [WASM PARSER] ──> [SIGMA ENGINE] ──> [ALERT CORRELATOR] ──> [WAR ROOM]
NetFlow─┤        (client)         (live compile)      (temporal/proximity)   (WebGL)
WinLog─┘                                                                       │
                                                                               ▼
                                                                        [AUDIT CHAIN]
                                                                   (Merkle tree, blockchain)
```

### Authorization Flow

```
[Operator] ──auth request──> [Mesh Gateway] ──scope validation──> [Token Authority]
     │                              │                                  │
     │                              ▼                                  ▼
     │                    [WireGuard peer]                    [Ed25519 signed JWT]
     │                    [mTLS handshake]                    [60-second TTL]
     │                              │                                  │
     ◄─────token + peer config────┘◄──── blockchain anchor ─────────┘
     │
     └──every action──> [eBPF filter]──scope check──> [execution]──log──> [audit chain]
```

---

## Security Model

### Authorization Token (Ed25519 JWT)

Every action requires a token containing:
- **Subject**: Device identity (hardware-bound key)
- **Scope**: IP ranges, VLANs, technique classes, time window
- **Mode**: WEAPON | SHIELD | SANCTUARY | SPECTATOR
- **Exercise ID**: Links actions to specific campaign
- **Issuer**: Cryptographic signature from training controller
- **TTL**: 60 seconds, continuously revalidated

### Token Violation Behavior

| Violation | Enforcement | Response |
|-----------|-------------|----------|
| Target IP outside scope | **eBPF filter** blocks packet | Log critical, notify operator |
| Technique outside authorization | **Hypervisor** blocks execution | Log, suspend session |
| Token expires mid-session | Graceful degradation | Offensive actions pause, monitoring continues |

### Audit Chain (Merkle Tree)

```
[Timestamp] [Device ID] [Operator Identity] [Mode] [Action Hash] [Scope Hash] [Result] [Previous Hash]
```

- **Append-only**: No modification or deletion possible
- **Distributed**: Every mesh node maintains a copy
- **Blockchain-anchored**: Periodic hashes anchored to public blockchain
- **Queryable**: Full-chain filtering by temporal range, operator, action type

### Scope Enforcement Layers

1. **Network layer**: eBPF filters drop out-of-scope packets
2. **Hypervisor layer**: Proxmox firewall rules block unauthorized techniques
3. **Application layer**: Token validation on every API call
4. **Hardware layer**: SDR firmware locks prevent transmission outside authorized frequencies

---

## Component Architecture

### The Four Runtime Modes

| Mode | Device Role | Auth Level | Capabilities |
|------|-------------|------------|--------------|
| **WEAPON** | Red Team Operator | `OFFENSIVE_SCOPED` | Adversary emulation, C2 control, scenario deployment. Every action mirrored to Blue Team telemetry. |
| **SHIELD** | Blue Team Analyst | `DEFENSIVE_SCOPED` | Detection engineering, threat hunting, incident response. Asymmetric information enforced. |
| **SANCTUARY** | Purple Lead | `FUSION_SCOPED` | Divergence analysis, detection half-life tracking, scenario design. Full ground truth. |
| **SPECTATOR** | Observer | `READONLY_SCOPED` | Sanitized telemetry view, debrief recordings, rule libraries. No operational impact. |

**Mode Switching**: Cryptographic handoff ceremony — current session sealed in audit chain, new token issued, device re-authenticates. ≥30 seconds, logged as critical event.

### Command Center Interface (War Room)

```
┌─────────────────────────────────────────────────────────────────┐
│  STATUS BAR          [MODE: WEAPON]  [TOKEN: NSO-TIER-1]        │
│  Time: 14:23:07 UTC  |  Mesh: 12 nodes  |  Scope: 192.168.10/24 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  TOPOLOGY    │  │  TELEMETRY   │  │  OPERATIONS  │          │
│  │  MAP         │  │  STREAM      │  │  PANEL       │          │
│  │  (WebGL)     │  │  (Real-time) │  │  (Contextual)│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  COMMAND LINE / QUERY INTERFACE (Context-Aware)                 │
├─────────────────────────────────────────────────────────────────┤
│  AUDIT TRAIL  [Hash: 0x7a3f...]  [Scope: ENFORCED]  [LOGGED]  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Overview

### Core Tables

- **exercises**: Campaign definitions, scenario state machines, phase tracking
- **operators**: User identities, role assignments, hardware-bound keys
- **authorization_tokens**: JWT records, scope definitions, revocation lists
- **audit_log**: Merkle tree entries, action hashes, blockchain anchors
- **telemetry_events**: Zeek, EDR, DNS, NetFlow normalized events
- **detection_rules**: Sigma/KQL/YARA rules with version control
- **payloads**: Scoped adversary simulation payloads with ATT&CK mapping
- **debriefs**: Divergence maps, detection half-life measurements

### Mesh Tables

- **mesh_nodes**: Active nodes, health status, WireGuard peer configs
- **scope_definitions**: Authorized IP ranges, VLANs, technique classes
- **exercise_participants**: Operator-device-exercise bindings

### Module Tables

- **ad_scenarios**: Active Directory attack chains and detection twins
- **wireless_scans**: SDR captures, rogue AP detections
- **protocol_anomalies**: Network protocol attack simulations
- **c2_sessions**: C2 beacon records, pivot maps (simulation only)
- **honeypot_events**: Honeypot trigger events, deception metrics

---

## Network Architecture

### WireGuard Mesh

- Every node has a WireGuard tunnel to the mesh gateway
- mTLS provides mutual authentication at the application layer
- Token revalidation every 60 seconds
- Zero-trust: No peer trusts any other peer by default

### Network Impairment Engine

Realistic training conditions via `tc netem`:

| Profile | Parameters | Training Value |
|---------|-----------|----------------|
| Zimbabwe | 80% loss for 5s every 60s | Breaks naive beacon assumptions |
| Satellite | 800ms RTT, 2% loss, 5% duplication | Tests async C2 |
| Congested WAN | 10Mbps cap, burst 32kb | Exfiltration under degraded throughput |
| Asymmetric | 100Mbps down / 1Mbps up | Consumer-grade constraints |
| Route Flap | Random 30s blackholes every 10min | Forces C2 resilience |
| Degraded EDR | 15-min SIEM lag, 10% host gaps | Night-shift simulation |

---

## AI/OBLISK Engine

### Architecture

```
┌─────────────────────────────────────────┐
│         OBLISK AGENT ENGINE             │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │  DETERMINISTIC  │  │  LLM AUGMENTED  │  │
│  │  FSM CORE       │  │  DECISION TREE  │  │
│  │  (Hash-chained) │  │  (Local vLLM)   │  │
│  └─────────────┘  └─────────────────┘  │
│         │                    │          │
│         └────────┬───────────┘          │
│                  │                      │
│         ┌────────┴────────┐            │
│         │  SCENARIO       │            │
│         │  STATE MACHINE  │            │
│         └─────────────────┘            │
└─────────────────────────────────────────┘
```

### Safety Constraints

- LLM runs locally via vLLM (Llama 3 70B). No external API calls.
- FSM core overrides any LLM output violating safety rules
- All AI decisions logged and hash-chained for audit

### MCP Server Integration

- **MCP-Sigma**: Compile and test Sigma rules against live telemetry
- **MCP-Zeek**: Generate and deploy Zeek scripts
- **MCP-C2**: Query C2 framework status (simulation)
- **MCP-Forensics**: Trigger memory dumps, automated analysis

---

*End of Architecture Document*
*NSO Kryptonite Platform v1.0*
