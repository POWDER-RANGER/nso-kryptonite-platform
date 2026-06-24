# NSO Kryptonite Platform

**Unified Adversarial Defense Command Center**

> *Every NSO technique taught is inseparable from its detection, mitigation, and accountability mechanism.*

---

## What This Is

The NSO Kryptonite Platform transforms any web-connected device — cell phone, laptop, or Linux endpoint — into a hardened command center and operational sanctuary for **authorized cyber ranges, defensive operations, purple team exercises, and certified security training**.

**Weapon Mode** (Red Team): Adversary emulation, C2 orchestration, scenario deployment, and tradecraft validation under strict cryptographic scope control.

**Shield Mode** (Blue Team): Real-time detection engineering, threat hunting, forensic reconstruction, and incident response under asymmetric information conditions.

**Sanctuary Mode** (Purple Team): The debrief and co-evolution engine where offense and defense converge to generate institutional knowledge.

**Spectator Mode** (Observer): View-only access to sanitized telemetry, debrief recordings, and detection rule libraries. No operational impact.

---

## The Three Immutable Laws

1. **No offensive action without defensive consequence.** Every attack generates telemetry. Every technique has a detection twin.
2. **No ground truth without earned reconstruction.** Blue Team begins blind. Clarity is the reward for investigative discipline.
3. **No completion without failure.** Timeout-first design. The first attempt is calibrated to collapse. Recovery is the metric.

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Proxmox VE (for training ranges) or K3s (for lightweight deployments)
- WireGuard tools
- SDR hardware (HackRF, Ubertooth) for wireless modules

### Development Setup

```bash
# Clone the repository
git clone https://github.com/POWDER-RANGER/nso-kryptonite-platform.git
cd nso-kryptonite-platform

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development stack
docker-compose -f docker/dev.compose.yml up -d

# Push database schema
npm run db:push

# Start dev server
npm run dev
```

### Production Deployment

```bash
# Single-device home lab
docker-compose -f docker/home-lab.compose.yml up -d

# Training range (3-5 bare metal)
docker-compose -f docker/training-range.compose.yml up -d

# Sanctuary mesh (distributed)
docker-compose -f docker/sanctuary-mesh.compose.yml up -d
```

---

## Project Structure

```
nso-kryptonite-platform/
├── apps/
│   ├── command-center/          # PWA War Room (React + TypeScript + Vite)
│   ├── api-server/              # Hono + tRPC API gateway
│   ├── mesh-gateway/            # WireGuard + mTLS mesh coordinator
│   └── obelisk-engine/          # AI agent engine (vLLM + FSM)
├── modules/
│   ├── ad-fusion/               # Active Directory Fusion (Module 1)
│   ├── wireless-advanced/       # Wireless Advanced (Module 2)
│   ├── protocol-exploitation/   # Protocol Exploitation (Module 3)
│   ├── post-exploitation/       # Post-Exploitation (Module 4)
│   ├── blue-defense/            # Blue Team Defense (Module 5)
│   └── skill-validation/        # Skill Validation / Purple Fusion (Module 6)
├── core/
│   ├── authorization/           # JWT scope tokens, Ed25519 signing
│   ├── audit-chain/             # Merkle tree logging, blockchain anchoring
│   ├── scope-enforcement/       # eBPF filters, hypervisor-level blocking
│   └── killswitch/              # Global/per-device termination grid
├── engine/
│   ├── scenario/                # Scenario state machine, campaign orchestration
│   ├── debrief/                 # Divergence analysis, detection half-life
│   └── telemetry/               # Zeek, EDR, DNS, NetFlow aggregation
├── docs/
│   ├── ARCHITECTURE.md          # System architecture, data flow, security model
│   ├── OPERATOR.md              # Step-by-step under stress
│   ├── DECOMMISSION.md          # Safe destruction without artifacts
│   ├── API.md                   # REST API + WebSocket reference
│   ├── WEBSOCKET.md             # Real-time stream specifications
│   └── SCENARIOS.md             # Scenario library and design guide
├── ops/
│   ├── docker/                  # Docker Compose configurations
│   ├── k8s/                     # Kubernetes manifests
│   ├── terraform/               # Infrastructure as Code
│   └── proxmox/                 # Proxmox VM templates and scripts
├── tests/
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   ├── e2e/                     # End-to-end tests
│   └── security/                # OWASP security test suite
├── contracts/                   # Shared types (frontend + backend)
├── db/
│   ├── schema.ts                # Drizzle ORM schema
│   └── seed.ts                  # Database seeding
├── scripts/
│   ├── init-dev.sh              # Development environment setup
│   └── setup-mesh.sh            # Mesh node provisioning
├── .env.example
├── docker-compose.yml
├── package.json
└── LICENSE
```

---

## The Six Domains

| Module | Red Team | Blue Team | Training Target |
|--------|----------|-----------|-----------------|
| **AD Fusion** | BloodHound, AS-REP/Kerberoast, DCSync | Kerberos anomaly detection, Sigma rules | Detect Kerberos attacks under normal noise |
| **Wireless Advanced** | SDR Evil Twin, BLE spoofing, KRACK | WIDS alerts, spectrum analysis, rogue containment | Distinguish rogue APs under RF noise |
| **Protocol Exploitation** | LLMNR/NBT-NS poison, VLAN hop, STP | Multicast anomaly detection, CAM monitoring | Catch protocol-layer bypasses |
| **Post-Exploitation** | C2 control, pivoting, injection simulation | EDR behavioral detection, memory forensics | Scope compromise graph from single alert |
| **Blue Defense** | *Pure Shield* — Honeypots, NDR, hunt mode | Hunt in compromised environment with degraded telemetry |
| **Skill Validation** | *Purple Fusion* — Certification engine, scoring, community | Full purple team capability under time pressure |

---

## Technology Stack

### Frontend (Command Center)
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui**
- **WebGL** (topology map rendering)
- **WebAssembly** (Sigma compilation, log analysis)
- **WebRTC** (mesh signaling)
- **WebCrypto API** (client-side encryption)
- **PWA** (service workers, offline capability, push notifications)

### Backend
- **Hono** (HTTP framework)
- **tRPC 11.x** (end-to-end type-safe APIs)
- **Drizzle ORM** (type-safe database queries)
- **MySQL** (relational data)
- **Redis** (sessions, real-time state)
- **WebSockets** (live telemetry, topology, alerts, audit streams)

### Mesh & Infrastructure
- **WireGuard** (zero-trust overlay)
- **mTLS** (mutual authentication)
- **eBPF** (scope enforcement, network filters)
- **Proxmox VE** (virtualized target ranges)
- **K3s** (lightweight Kubernetes)
- **ZFS** (snapshots, evidence preservation)

### AI Engine (OBLISK)
- **vLLM** (local LLM inference)
- **Llama 3 70B** (4-bit quantized for edge deployment)
- **Deterministic FSM** (safety override core)
- **MCP Servers** (Sigma, Zeek, C2, Forensics integration)

---

## 120-Day Roadmap

| Phase | Days | Objective | Gate |
|-------|------|-----------|------|
| **0: Ghost Protocol** | 1-7 | Secure dev environment, hardware, comms | All team present, no corporate accounts |
| **1: Foundation** | 8-21 | Proxmox cluster, K3s, Elastic, auth core v0.1 | Red executes → Blue detects → Log immutable |
| **2: Command Center** | 22-35 | PWA war room, WASM client, WireGuard mesh | Runs on phone, tablet, laptop |
| **3: Red Arsenal** | 36-49 | C2 mesh, loaders, OBLISK integration, error budgets | 24-hour campaign capability |
| **4: Blue Nervous System** | 50-63 | Detection pipeline, honeypots, debrief engine v0.1 | Detect Tier 1 in <4 hours |
| **5: Human Layer** | 64-77 | Psychology injects, delivery system, facilitators | Injects delivered without pause |
| **6: First Blood** | 78-91 | Tier 1 NSO campaign: 72 hours, all constraints | Measurable data, actionable rules |
| **7: Co-Evolution** | 92-105 | Tier 2 adaptation, detection half-life measurement | Half-life 2-6 hours, platform stable |
| **8: Mobile Hardening** | 106-112 | PWA offline, low-bandwidth, hardware kill-switch | Full platform on cell phone in airplane mode |
| **9: Reveal** | 113-120 | Demo, stakeholder decision | Fund or clean kill |

---

## Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — System diagram, data flow, security model
- **[OPERATOR.md](docs/OPERATOR.md)** — Step-by-step for the person using it under stress
- **[DECOMMISSION.md](docs/DECOMMISSION.md)** — How to safely destroy it without leaving artifacts
- **[API.md](docs/API.md)** — REST API and WebSocket stream reference
- **[SCENARIOS.md](docs/SCENARIOS.md)** — Scenario library design guide

---

## Security & Safety

**The Red Lines (Non-Negotiable):**

| Red Line | Technical Enforcement |
|----------|----------------------|
| No zero-day development | FSM override rejects payloads outside MITRE ATT&CK / Atomic Red Team |
| No third-party infrastructure abuse | Scope enforcement blocks external targeting |
| No real credential theft | Pre-provisioned synthetic victim personas only |
| Reversibility mandate | Hardware-tied kill-switch, ZFS snapshots, auto-restore |
| Framing discipline | All docs labeled: "Adversary Simulation for Defensive Training" |
| No deployable intrusion methodology | Watermarked, scoped, non-portable payloads |

---

## License

[AGPL-3.0](LICENSE) — Copyleft license ensuring all derivatives remain open-source. This software is designed exclusively for authorized defensive training operations. See LICENSE for full terms.

---

*Architectural Memento Mori Momentum*
*Authorized Operations Only*
