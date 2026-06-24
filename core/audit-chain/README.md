# Audit Chain

> *Immutable. Append-only. Cryptographically scoped.*

## Overview

Every action in the platform is logged in a distributed Merkle tree. The audit chain provides:

- **Non-repudiation**: Every action linked to an operator and device
- **Integrity**: Merkle tree structure prevents tampering
- **Verification**: Blockchain anchoring enables external timestamp verification
- **Distribution**: Every mesh node maintains a full copy

## Structure

```
[Timestamp] [Device ID] [Operator Identity] [Mode] [Action Hash] [Scope Hash] [Result] [Previous Hash]
```

## Properties

| Property | Implementation |
|----------|---------------|
| Append-only | No modification or deletion API exists |
| Distributed | Raft consensus across mesh nodes |
| Blockchain-anchored | Periodic SHA-3 hashes anchored to Bitcoin/Ethereum |
| Queryable | Temporal range, operator, action type filters |

## API

- `audit:log` — Append new entry
- `audit:verify` — Verify chain integrity
- `audit:export` — Export chain segment
- `audit:anchor` — Anchor to blockchain
