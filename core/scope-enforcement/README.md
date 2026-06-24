# Scope Enforcement

> *Network-level and hypervisor-level blocking of out-of-scope actions.*

## Layers

1. **eBPF Filters** — Kernel-level packet filtering
2. **Hypervisor Firewall** — Proxmox/KVM-level network rules
3. **Application Middleware** — Token validation on every request
4. **SDR Firmware Lock** — Hardware-level frequency restrictions

## eBPF Program

Attaches to network interfaces to drop packets targeting IPs outside authorization scope.

## Hypervisor Rules

Proxmox firewall rules block:
- Unauthorized technique execution
- Out-of-scope network traffic
- Unapproved VM snapshot operations
