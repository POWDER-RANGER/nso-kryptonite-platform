# Module 2: Wireless Advanced

> *Distinguish rogue APs from legitimate corporate SSIDs under RF noise.*

## Overview

The Wireless Advanced module simulates and detects wireless-based attacks using SDR hardware. It covers Evil Twin, BLE spoofing, WPS/KRACK simulation, and rogue AP detection.

## Red Team (WEAPON)

- SDR control panel (HackRF, Ubertooth) for Evil Twin, BLE spoofing, WPS/KRACK simulation
- 802.11 frame capture and analysis
- Rogue AP deployment with configurable BSSID, SSID, and captive portal logic

**Constraint**: All RF transmissions are scoped to the training range. The platform physically blocks transmission outside authorized frequencies via SDR firmware lock.

## Blue Team (SHIELD)

- WIDS alert console (Kismet, custom sensors)
- Spectrum analysis visualization (Ubertooth data rendered as waterfall charts)
- Rogue AP containment workflow: deauth, client migration, 802.1X enforcement
- Hardening wizard: EAP-TLS configuration, certificate pinning, legacy protocol disable

## Detection Twin Mapping

| Attack Technique | Detection Signal | Countermeasure |
|-----------------|------------------|----------------|
| Evil Twin | BSSID collision, beacon rate anomaly | Deauth containment, 802.1X enforcement |
| BLE Spoofing | Unexpected UUID, RSSI anomaly | BLE whitelist, proximity validation |
| WPS Brute Force | WPS pin attempt bursts | Disable WPS, monitor pin lockout |
| KRACK | Key reinstallation handshake anomaly | WPA3/802.11w, handshake validation |

## Training Objective

Distinguish rogue APs from legitimate corporate SSIDs under RF noise and identify BLE-based data exfiltration.

## File Structure

```
modules/wireless-advanced/
├── README.md
├── src/
│   ├── red/
│   │   ├── sdr-control.ts      # SDR control panel
│   │   ├── evil-twin.ts        # Evil Twin simulation
│   │   ├── ble-spoof.ts        # BLE spoofing
│   │   └── krack-sim.ts        # KRACK simulation
│   ├── blue/
│   │   ├── wids-console.ts     # WIDS alert management
│   │   ├── spectrum-analyzer.ts # Waterfall visualization
│   │   └── containment.ts      # Rogue AP containment
│   └── shared/
│       ├── frequency-lock.ts   # SDR firmware scope lock
│       └── attck-mapping.ts    # ATT&CK technique mapping
└── tests/
    ├── sdr.test.ts
    └── detection.test.ts
```
