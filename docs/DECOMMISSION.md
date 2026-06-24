# NSO Kryptonite Platform — Decommission Guide

> *How to safely destroy it without leaving artifacts.*

---

## Table of Contents

1. [Pre-Destruction Checklist](#pre-destruction-checklist)
2. [Evidence Preservation](#evidence-preservation)
3. [Graceful Shutdown](#graceful-shutdown)
4. [Data Destruction](#data-destruction)
5. [Mesh Dissolution](#mesh-dissolution)
6. [Hardware Decommission](#hardware-decommission)
7. [Verification](#verification)
8. [Memento Mori Protocol](#memento-mori-protocol)

---

## Pre-Destruction Checklist

Before decommissioning, answer these questions:

```
☐ Are all exercise artifacts preserved? (See Evidence Preservation)
☐ Has the audit chain been exported and anchored?
☐ Have all operators been notified of decommission?
☐ Is there a legal hold on any exercise data?
☐ Has the decommission been logged in the audit chain?
☐ Do you have physical access to all mesh nodes?
```

**If any answer is "no" or "unknown", STOP. Consult Sanctuary facilitator.**

---

## Evidence Preservation

### Export Audit Chain

```bash
# Export full audit chain with Merkle proofs
npm run audit:export -- --exercise-id <ID> --output ./evidence/

# Verify chain integrity
npm run audit:verify -- --chain ./evidence/audit-chain.json

# Anchor to blockchain (optional, for long-term timestamp verification)
npm run audit:anchor -- --chain ./evidence/audit-chain.json --network bitcoin
```

### Preserve Exercise Artifacts

```bash
# VM snapshots
proxmox-backup-client backup vm-snapshots.pxar:/var/lib/vz/snippets/

# Network captures
rsync -av /var/log/captures/ ./evidence/pcaps/

# Memory dumps
rsync -av /var/evidence/dumps/ ./evidence/memory/

# Detection rules generated
rsync -av ./data/rules/ ./evidence/rules/

# Operator debrief notes
rsync -av ./data/debriefs/ ./evidence/debriefs/
```

### Seal Evidence Bag

```bash
# Create Merkle tree of all evidence
npm run evidence:seal -- --input ./evidence/ --output ./evidence-bag.tar.gz

# Verify seal integrity
npm run evidence:verify -- --bag ./evidence-bag.tar.gz
```

---

## Graceful Shutdown

### Step 1: Activate Kill Switch

```bash
# This terminates all implants, C2 sessions, and active operations
npm run killswitch:activate -- --scope global --reason "DECOMMISSION"
```

Verify in audit log: All active sessions show `TERMINATED` status.

### Step 2: Stop Exercise Engine

```bash
# Stop scenario state machines
npm run exercise:halt -- --all

# Wait for confirmation: "All exercises halted, 0 active sessions"
```

### Step 3: Flush Telemetry Buffers

```bash
# Ensure all queued telemetry is written to audit chain
npm run telemetry:flush

# Verify: "Buffer empty, all events committed to chain"
```

---

## Data Destruction

### Database

```bash
# Secure wipe of all exercise data
npm run db:secure-wipe

# This performs:
# 1. Overwrite all exercise records with cryptographically random data
# 2. Delete overwritten records
# 3. Vacuum/compaction
# 4. Verify no recoverable data remains
```

### Local Storage (PWA)

```bash
# On each device, clear browser storage
# Chrome: DevTools > Application > Clear Storage > Clear Site Data
# Firefox: DevTools > Storage > Clear All

# Verify IndexedDB, LocalStorage, and Cache Storage are empty
```

### Filesystem Artifacts

```bash
# Remove all application data
rm -rf /var/lib/nso-kryptonite/
rm -rf /var/log/nso-kryptonite/
rm -rf /var/cache/nso-kryptonite/
rm -rf ~/.config/nso-kryptonite/

# Secure wipe log files
shred -vfz -n 3 /var/log/nso-kryptonite/*.log

# Remove WireGuard configs
rm -f /etc/wireguard/wg0.conf
rm -rf /etc/wireguard/peers/
```

### Container Images

```bash
# Stop and remove all containers
docker-compose -f docker/sanctuary-mesh.compose.yml down --volumes

# Remove images
docker rmi $(docker images -q nso-kryptonite/*)

# Prune volumes
docker volume prune -f

# Verify: docker ps -a should show no nso-kryptonite containers
docker ps -a | grep nso-kryptonite  # Should return empty
```

---

## Mesh Dissolution

### Remove Mesh Nodes

```bash
# For each node in the mesh:
npm run mesh:remove-node -- --node-id <NODE_ID>

# This:
# 1. Revokes the node's authorization token
# 2. Removes WireGuard peer from gateway
# 3. Removes node from distributed audit chain
# 4. Verifies no orphaned connections
```

### Dissolve Mesh Gateway

```bash
# After all nodes removed:
npm run mesh:dissolve-gateway

# Verify: "Mesh dissolved, 0 peers, 0 active tunnels"
```

---

## Hardware Decommission

### SDR Hardware

```bash
# Reset HackRF to factory defaults
hackrf_spiflash -w /dev/null  # Clear firmware
greatfet_firmware --reset      # Reset GreatFET

# Ubertooth: Factory reset
ubertooth-util -f
```

### Storage Media

```bash
# For SSDs: ATA Secure Erase
hdparm --user-master u --security-set-pass p /dev/sdX
hdparm --user-master u --security-erase p /dev/sdX

# For HDDs: Multi-pass overwrite
shred -vfz -n 7 /dev/sdX

# For NVMe: Format with crypto erase
nvme format /dev/nvme0n1 --ses=2  # Crypto erase
```

### Verification

```bash
# Verify storage is wiped
dd if=/dev/sdX bs=1M count=100 | xxd | head

# Should show only zeros or random data (no filesystem signatures)
# Expected: 00000000: 0000 0000 0000 0000 0000 0000 0000 0000  ................
```

---

## Verification

### Post-Decommission Checklist

```
☐ Audit chain exported and sealed
☐ All exercise artifacts preserved in evidence bag
☐ Kill switch activated (all sessions terminated)
☐ Database securely wiped
☐ Local storage cleared on all devices
☐ Filesystem artifacts removed
☐ Containers stopped and images removed
☐ All mesh nodes removed
☐ Mesh gateway dissolved
☐ SDR hardware reset
☐ Storage media wiped (verified with dd/xxd)
☐ No nso-kryptonite processes running (ps aux | grep -i kryptonite)
☐ No nso-kryptonite network listeners (netstat -tlnp | grep -i kryptonite)
☐ Final decommission entry in audit chain export
```

### Final Audit Entry

```
[TIMESTAMP] [DECOMMISSION] [operator_id] [SANCTUARY]
[Action: PLATFORM_DECOMMISSION] [Scope: GLOBAL]
[Result: SUCCESS] [Hash: 0x...]
[Verification: All checklists passed]
[Previous Hash: 0x...]
```

---

## Memento Mori Protocol

> *Have no illusions. Remember to die. Build anyway.*

If this platform is being decommissioned, one of three outcomes has occurred:

1. **Funded**: The platform proved the market exists. Scale and continue.
2. **Killed**: The market is not ready. Archive and preserve architecture.
3. **Burned**: Emergency decommission. All traces removed.

In all cases, the architecture survives because it was built to survive its own death. The operators carry the knowledge. The codebase, if preserved, can be rebuilt.

**If raided, decommissioned under duress, or destroyed:**
- The audit chain proves all operations were authorized
- The authorization core proves unauthorized actions were technically impossible
- The blockchain anchoring provides external timestamp verification
- The architecture exists in the heads of the operators who built it

**The platform is not the sanctuary. The operator is the sanctuary.**

---

*End of Decommission Guide*
*NSO Kryptonite Platform v1.0*
*Architectural Memento Mori Momentum*
