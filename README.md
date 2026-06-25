<!-- ══════════════════════════════════════════ NSO KRYPTONITE HEADER -->
<div align="center">

[![Header](https://capsule-render.vercel.app/api?type=waving&color=0:0D1117,35:1A0000,70:B71C1C,100:FF1744&height=300&section=header&text=NSO+KRYPTONITE&fontSize=70&fontColor=FF1744&animation=fadeIn&fontAlignY=40&desc=Unified+Adversarial+Defense+Command+Center+%E2%80%94+Purple+Team+Platform&descColor=EF5350&descSize=17&descAlignY=64)](https://github.com/POWDER-RANGER/nso-kryptonite-platform)

<br>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Share+Tech+Mono&weight=700&size=18&duration=2600&pause=700&color=FF1744&center=true&vCenter=true&width=900&lines=WEAPON+MODE+%E2%80%94+Adversary+Emulation+%E2%80%94+C2+Orchestration;SHIELD+MODE+%E2%80%94+Real-time+Detection+%E2%80%94+Threat+Hunting;SANCTUARY+MODE+%E2%80%94+Debrief+%26+Co-Evolution+Engine;Every+NSO+technique+with+its+detection%2C+mitigation%2C+%26+accountability)](https://github.com/POWDER-RANGER/nso-kryptonite-platform)

<br>

![](https://img.shields.io/badge/PLATFORM-ONLINE-FF1744?style=for-the-badge&labelColor=0D1117)
![](https://img.shields.io/badge/LICENSE-AGPL--3.0-FF9100?style=for-the-badge&labelColor=0D1117)
![](https://img.shields.io/badge/RED_TEAM-Weaponized-B71C1C?style=for-the-badge&labelColor=0D1117)
![](https://img.shields.io/badge/BLUE_TEAM-Hardened-2979FF?style=for-the-badge&labelColor=0D1117)
![](https://img.shields.io/badge/PURPLE_TEAM-Fusion-7C4DFF?style=for-the-badge&labelColor=0D1117)

</div>

---

## ⚔️ Four Modes of Operation

| Mode | Function | Access |
|------|----------|--------|
| **🔴 WEAPON** | Adversary emulation, C2 orchestration, scenario deployment, tradecraft validation | Red Team Operators |
| **🔵 SHIELD** | Real-time detection engineering, threat hunting, forensic reconstruction | Blue Team Defenders |
| **🟣 SANCTUARY** | Debrief and co-evolution engine — offense and defense converge | Purple Team Fusion |
| **⚪ SPECTATOR** | View-only sanitized telemetry, debrief recordings, detection rule libraries | Observers |

---

## 📜 The Three Immutable Laws

1. **No offensive action without defensive consequence.** Every attack generates telemetry. Every technique has a detection twin.
2. **No ground truth without earned reconstruction.** Blue Team begins blind. Clarity is the reward for investigative discipline.
3. **No completion without failure.** Timeout-first design. The first attempt is calibrated to collapse. Recovery is the metric.

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/POWDER-RANGER/nso-kryptonite-platform.git
cd nso-kryptonite-platform

# Install & setup
npm install
cp .env.example .env
# Edit .env with your configuration

# Development stack
docker-compose -f docker/dev.compose.yml up -d
npm run db:push
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

## 🏗️ Architecture

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    NSO KRYPTONITE — UNIFIED PLATFORM                     ║
║                                                                          ║
║  ┌──────────────────────────────────────────────────────────────────┐   ║
║  │                    COMMAND CENTER (PWA)                           │   ║
║  │  React 19 + TypeScript + Vite + Tailwind + WebGL + WebAssembly   │   ║
║  │  WebRTC mesh signaling · WebCrypto client-side encryption        │   ║
║  │  Offline-first · Push notifications · Cross-platform            │   ║
║  └──────────────────────────────────────────────────────────────────┘   ║
║                              │                                           ║
║  ┌───────────────────────────┼──────────────────────────────────────┐  ║
║  │              API GATEWAY (Hono + tRPC 11 + Drizzle)               │  ║
║  │  JWT scope tokens · Ed25519 signing · RBAC · Rate limiting       │  ║
║  └───────────────────────────┼──────────────────────────────────────┘  ║
║                              │                                           ║
║  ┌──────────┬───────────────┼───────────────┬──────────┬────────────┐  ║
║  │  AD      │  Wireless    │  Protocol     │  Post-   │  Blue      │  ║
║  │  Fusion  │  Advanced    │  Exploitation │  Exploit │  Defense   │  ║
║  │  M1      │  M2          │  M3           │  M4      │  M5        │  ║
║  ├──────────┼───────────────┼───────────────┼──────────┼────────────┤  ║
║  │ BloodHound│ SDR Evil Twin│ LLMNR poison  │ C2 mesh  │ Honeypots  │  ║
║  │ Kerberoast│ BLE spoofing │ VLAN hop      │ Pivoting │ NDR        │  ║
║  │ DCSync   │ KRACK        │ STP attack    │ Injection│ Hunt mode  │  ║
║  └──────────┴───────────────┴───────────────┴──────────┴────────────┘  ║
║                              │                                           ║
║  ┌───────────────────────────▼──────────────────────────────────────┐  ║
║  │                    OBLISK AI ENGINE (vLLM + FSM)                  │  ║
║  │  Llama 3 70B (4-bit) · Deterministic safety override            │  ║
║  │  MCP Servers: Sigma, Zeek, C2, Forensics integration             │  ║
║  └──────────────────────────────────────────────────────────────────┘  ║
║                              │                                           ║
║  ┌───────────────────────────▼──────────────────────────────────────┐  ║
║  │                    INFRASTRUCTURE LAYER                             │  ║
║  │  WireGuard zero-trust · mTLS · eBPF scope enforcement            │  ║
║  │  Proxmox VE · K3s · ZFS snapshots · Evidence preservation        │  ║
║  └──────────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 🎯 The Six Domains

| Module | Red Team | Blue Team | Training Target |
|--------|----------|-----------|-----------------|
| **AD Fusion (M1)** | BloodHound, AS-REP/Kerberoast, DCSync | Kerberos anomaly detection, Sigma rules | Detect Kerberos attacks under normal noise |
| **Wireless Advanced (M2)** | SDR Evil Twin, BLE spoofing, KRACK | WIDS alerts, spectrum analysis, rogue containment | Distinguish rogue APs under RF noise |
| **Protocol Exploitation (M3)** | LLMNR/NBT-NS poison, VLAN hop, STP | Multicast anomaly detection, CAM monitoring | Catch protocol-layer bypasses |
| **Post-Exploitation (M4)** | C2 control, pivoting, injection simulation | EDR behavioral detection, memory forensics | Scope compromise graph from single alert |
| **Blue Defense (M5)** | *Pure Shield* — Honeypots, NDR, hunt mode | Hunt in compromised environment with degraded telemetry |
| **Skill Validation (M6)** | *Purple Fusion* — Certification engine, scoring, community | Full purple team capability under time pressure |

---

## 🛡️ The Red Lines (Non-Negotiable)

| Red Line | Technical Enforcement |
|----------|----------------------|
| No zero-day development | FSM override rejects payloads outside MITRE ATT&CK / Atomic Red Team |
| No third-party infrastructure abuse | Scope enforcement blocks external targeting |
| No real credential theft | Pre-provisioned synthetic victim personas only |
| Reversibility mandate | Hardware-tied kill-switch, ZFS snapshots, auto-restore |
| No deployable intrusion methodology | Watermarked, scoped, non-portable payloads |

---

## 📈 GitHub Stats

<div align="center">

![NSO Stats](https://github-readme-stats.vercel.app/api?username=POWDER-RANGER&repo=nso-kryptonite-platform&show_icons=true&theme=radical&hide_border=true)

</div>

---

## 🔗 POWDER-RANGER Ecosystem

### 🌐 Live .io Pages
| Project | Link | Description |
|---------|------|-------------|
| **Main Portfolio** | [powder-ranger.github.io](https://powder-ranger.github.io) | Master portfolio with all 46 repos |
| **NSO Kryptonite** | [powder-ranger.github.io/nso-kryptonite-platform](https://powder-ranger.github.io/nso-kryptonite-platform) | Adversarial defense demo |
| **CIVWATCH** | [powder-ranger.github.io/CIVWATCH](https://powder-ranger.github.io/CIVWATCH) | Civic transparency platform |
| **OBLISK** | [powder-ranger.github.io/OBLISK](https://powder-ranger.github.io/OBLISK) | Multi-agent AI orchestration |
| **AI Nexus** | [powder-ranger.github.io/ai-nexus](https://powder-ranger.github.io/ai-nexus) | Browser-based AI platform |
| **Dollar Gravity** | [powder-ranger.github.io/dollar-gravity-framework](https://powder-ranger.github.io/dollar-gravity-framework) | USD gravity visualization |

### 🔧 Core Repositories
| Repository | Language | Purpose |
|-----------|----------|---------|
| **[NSO Kryptonite](https://github.com/POWDER-RANGER/nso-kryptonite-platform)** | TypeScript | Adversarial defense command center (this repo) |
| **[CIVWATCH](https://github.com/POWDER-RANGER/CIVWATCH)** | TypeScript | Civic transparency platform |
| **[OBLISK](https://github.com/POWDER-RANGER/OBLISK)** | Python | Multi-agent AI with encrypted vaults |
| **[RED-AGENT-GOV](https://github.com/POWDER-RANGER/RED-AGENT-GOV)** | Python | Governance-enforced agent engine |
| **[CharlesAI](https://github.com/POWDER-RANGER/CharlesAI)** | PowerShell | COMET Agent with memory & orchestration |
| **[OBELISK-Enterprise](https://github.com/POWDER-RANGER/OBELISK-Enterprise)** | Python | $2.5M AI Governance Platform |
| **[AI Nexus](https://github.com/POWDER-RANGER/ai-nexus)** | JavaScript | Browser-based complete AI platform |
| **[Guiding Light AI](https://github.com/POWDER-RANGER/guiding-light-ai)** | Rust | Values-to-policies CLI tool |
| **[Dollar Gravity](https://github.com/POWDER-RANGER/dollar-gravity-framework)** | JavaScript | USD-centric finance-security dashboard |
| **[Dojin D](https://github.com/POWDER-RANGER/dojin-d)** | TypeScript | ECS combat simulation engine |
| **[Contextual Memory UI](https://github.com/POWDER-RANGER/contextual-memory-ui)** | JavaScript | AI memory infrastructure platform |
| **[OBELISK-Desktop-AI](https://github.com/POWDER-RANGER/OBELISK-Desktop-AI)** | PowerShell | Desktop AI orchestrator |
| **[POWDER-RANGER Bot](https://github.com/POWDER-RANGER/powder-ranger-bot)** | Python | Autonomous GTA V + MGS5 agent |
| **[CIVWATCH Cell Titan](https://github.com/POWDER-RANGER/civwatch-cell-titan)** | Shell | RF observability platform |
| **[CIVWATCH v3](https://github.com/POWDER-RANGER/civwatch-v3)** | HTML | Unified RF observability |

---

## 🤝 Connect

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Curtis_Farrar-0077B5?style=flat&logo=linkedin)](https://www.linkedin.com/in/curtis-farrar-g6b)
[![GitHub](https://img.shields.io/badge/GitHub-POWDER--RANGER-181717?style=flat&logo=github)](https://github.com/POWDER-RANGER)
[![Portfolio](https://img.shields.io/badge/Portfolio-powder--ranger.github.io-FF1744?style=flat&logo=githubpages)](https://powder-ranger.github.io)
[![ORCID](https://img.shields.io/badge/ORCID-0009--0008--9273--2458-A6CE39?style=flat&logo=orcid)](https://orcid.org/0009-0008-9273-2458)

---

*Architectural Memento Mori Momentum — Authorized Operations Only*

<div align="center">

[![Footer](https://capsule-render.vercel.app/api?type=waving&color=0:FF1744,35:B71C1C,70:1A0000,100:0D1117&height=150&section=footer)](https://github.com/POWDER-RANGER/nso-kryptonite-platform)

</div>
