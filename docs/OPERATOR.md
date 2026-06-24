# NSO Kryptonite Platform — Operator Guide

> *Step-by-step for the person using it under stress.*

---

## Table of Contents

1. [First-Time Setup](#first-time-setup)
2. [Starting an Exercise](#starting-an-exercise)
3. [The War Room Interface](#the-war-room-interface)
4. [Mode Switching](#mode-switching)
5. [Red Team Operations (WEAPON)](#red-team-operations)
6. [Blue Team Operations (SHIELD)](#blue-team-operations)
7. [Purple Team Operations (SANCTUARY)](#purple-team-operations)
8. [Emergency Procedures](#emergency-procedures)
9. [Troubleshooting](#troubleshooting)

---

## First-Time Setup

### 1. Join the Mesh

```
1. Open platform URL in browser (Chrome/Firefox recommended)
2. Tap "Install" when PWA prompt appears (mobile: Add to Home Screen)
3. Authenticate with hardware key or WebAuthn biometrics
4. Mesh Gateway will provision your WireGuard peer config
5. Download WireGuard config file (or scan QR on mobile)
6. Status bar shows: [MESH: CONNECTED] [NODE: authorized]
```

### 2. Verify Authorization

```
STATUS BAR must show:
- Green token indicator
- Your assigned scope (IP range, technique class)
- Current mode and exercise ID
- Time remaining on token (counts down from 60s, auto-renews)

If token is red or missing: You cannot execute any action.
```

### 3. Run Health Check

```
> healthcheck
[OUTPUT] Mesh: 12/12 nodes online
[OUTPUT] Telemetry: Zeek ✓ | EDR ✓ | DNS ✓ | NetFlow ✓
[OUTPUT] Token: Valid, expires in 47s
[OUTPUT] Scope: 192.168.10.0/24, Techniques: T1003-T1059
[OUTPUT] Kill-switch: Armed, biometric confirmed
```

---

## Starting an Exercise

### As Sanctuary Facilitator

```
1. Switch to SANCTUARY mode (see Mode Switching)
2. Click "New Exercise" in Operations Panel
3. Select scenario from library (or generate new via OBLISK)
4. Define scope: target IP range, technique classes, duration
5. Assign operators: drag names to WEAPON or SHIELD column
6. Set deception layers: Primary, Secondary, Real, Tertiary
7. Configure network impairment profile
8. Click "Deploy" — all operators receive push notifications
9. Exercise begins when first operator acknowledges
```

### As Red or Blue Operator

```
1. Wait for exercise notification (push + haptic on mobile)
2. Acknowledge to begin
3. Check STATUS BAR for exercise ID and your assigned mode
4. Review scope: Click token indicator to expand full scope details
5. Begin operations
```

---

## The War Room Interface

### Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│  STATUS BAR                                                     │
│  [MODE] [TOKEN] [MESH NODES] [SCOPE] [TIME]                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  TOPOLOGY    │  │  TELEMETRY   │  │  OPERATIONS  │          │
│  │  MAP         │  │  STREAM      │  │  PANEL       │          │
│  │  (WebGL)     │  │  (Real-time) │  │  (Contextual)│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  COMMAND LINE / QUERY INTERFACE                                 │
├─────────────────────────────────────────────────────────────────┤
│  AUDIT TRAIL                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Swipe Navigation (Mobile)

```
Swipe LEFT  → Telemetry Stream
Swipe RIGHT → Topology Map
Swipe UP    → Operations Panel
Swipe DOWN  → Command Line
```

### Critical UI Elements

| Element | Location | Function |
|---------|----------|----------|
| Token Indicator | Top-left | Click to expand scope details. Red = invalid. |
| Mode Badge | Top-center | Current mode. Click to initiate mode switch. |
| Mesh Status | Top-right | Connected nodes. Click for node details. |
| Kill Switch | Bottom-left (red) | **HOLD for 3 seconds** to trigger global kill. Biometric required. |
| Audit Hash | Bottom-center | Click to view full audit chain. |

---

## Mode Switching

### Cryptographic Handoff Ceremony

```
1. Click current MODE badge
2. Select target mode from dropdown
3. Confirm biometric (fingerprint/face/hardware key)
4. Current session is SEALED in audit chain
5. New authorization token is MINTED with appropriate scope
6. Device re-authenticates to mesh gateway
7. Interface reloads with new mode context (≥30 seconds)
8. Log entry: "MODE_SWITCH: WEAPON→SHIELD, operator_id, timestamp"
```

**Important**: You cannot mode-switch during active offensive actions. Complete or abort current operations first.

---

## Red Team Operations

### WEAPON Mode Interface

The Operations Panel shows:
- **Payload Deployment**: Scoped adversary simulation payloads
- **C2 Control**: Beacon interval, redirector health, operator shift timer
- **Error Budget**: Remaining tolerance for detectable mistakes
- **Scenario State**: Current kill chain phase

### Typical Workflow

```
1. Review scope: What IPs, what techniques, what time window
2. Check Topology Map: Identify target hosts (full visibility for Red)
3. Select payload from library (filtered to authorized techniques)
4. Configure payload parameters (auto-scoped to exercise range)
5. Deploy — platform auto-logs to Blue Team with 15-second delay
6. Monitor C2 health in Operations Panel
7. If detected, adapt: OBLISK suggests alternative TTPs
```

### Constraints (Cannot Be Disabled)

- Every action logged to Blue Team SIEM (15s delay)
- Cannot target IPs outside scope (blocked at eBPF)
- Cannot use techniques outside authorization (blocked at hypervisor)
- Cannot adjust logging level
- Cannot disable kill-switch

---

## Blue Team Operations

### SHIELD Mode Interface

The Operations Panel shows:
- **Detection Rules**: Sigma editor with live compilation
- **Host Isolation**: One-click containment
- **Memory Dump**: Forensic trigger for compromised hosts
- **Hypothesis Tracker**: Structured investigation notes
- **Forensic Timeline**: Export capability

### Asymmetric Information

```
Blue Team sees:
- Known hosts (from asset inventory)
- Dark nodes (unknown hosts rendered with uncertainty halos)
- Telemetry-driven correlation lines
- Alerts from deployed detection rules

Blue Team does NOT see:
- Red Team's actual compromise paths (must reconstruct)
- C2 tunnel endpoints (must hunt)
- True scope of breach (must discover)
```

### Typical Workflow

```
1. Monitor Telemetry Stream: Zeek, EDR, DNS, NetFlow
2. Write Sigma rules in query interface (live compilation to Elastic/KQL)
3. When alert fires: Click to pivot — correlation lines appear
4. Form hypothesis in Hypothesis Tracker
5. If host compromised: Trigger memory dump, isolate host
6. Build forensic timeline
7. Present findings during debrief
```

---

## Purple Team Operations

### SANCTUARY Mode Interface

The Operations Panel shows:
- **Divergence Map**: Blue's narrative vs ground truth
- **Detection Half-Life Tracker**: Real-time measurement
- **Scenario State Machine**: Kill chain progress
- **Inject Delivery**: Organizational psychology injects
- **Ground Truth Overlay**: Full visibility (facilitator only)

### Debrief Protocol

```
1. Blue Team Presents (60 min): Their reconstruction, hypotheses, confidence
2. Divergence Analysis (30 min): Map gaps without revealing truth
3. Red Team Reveals (30 min): Ground truth with full artifact chain
4. Detection Engineering Workshop (60 min): Blue writes rules, Red critiques
```

---

## Emergency Procedures

### Kill Switch Activation

```
DESKTOP:
1. Move mouse to red KILL SWITCH button (bottom-left)
2. HOLD for 3 seconds
3. Confirm biometric
4. All implants terminate, all sessions end, all C2 beacons stop

MOBILE:
1. Shake device twice (haptic feedback confirms)
2. Biometric prompt appears
3. Authenticate
4. Global termination initiated
```

### Token Expiry Mid-Operation

```
- Offensive actions: AUTO-PAUSED
- Defensive monitoring: CONTINUES
- Audit logging: CONTINUES
- Re-authenticate to resume offensive operations
```

### Scope Violation

```
- Action: BLOCKED
- Log: CRITICAL event recorded
- Notification: Sent to operator + Sanctuary facilitator
- Session: Suspended pending review
```

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "MESH DISCONNECTED" | WireGuard tunnel down | Check WireGuard status, re-download peer config |
| "TOKEN INVALID" | Expired or revoked | Re-authenticate with hardware key |
| "SCOPE VIOLATION" | Target outside authorization | Verify target IP in scope details panel |
| "ACTION BLOCKED" | Technique not authorized | Check authorized technique class in token |
| "OFFLINE QUEUE" | No mesh connectivity | Actions queued — will execute when connectivity resumes |
| "EDR OFFLINE" | Sensor array issue | Check sensor node health in mesh status |
| "WASM ERROR" | Browser compatibility | Use Chrome/Firefox latest, enable WebAssembly |

---

*Remember: The platform is not the sanctuary. The operator is the sanctuary. The platform is the weapon and the shield that makes the operator invincible.*

*End of Operator Guide*
*NSO Kryptonite Platform v1.0*
