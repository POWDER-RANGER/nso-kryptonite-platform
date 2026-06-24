# Telemetry Engine

> *Multi-source log aggregation with real-time correlation.*

## Sources

| Source | Protocol | Data Types |
|--------|----------|-----------|
| **Zeek** | TCP/JSON | conn, dns, http, kerberos, x509 |
| **EDR** | WebSocket/API | process events, file ops, registry, network |
| **DNS** | UDP/TCP | queries, responses, NXDOMAIN patterns |
| **NetFlow** | UDP/IPFIX | flow records, top talkers, anomalies |
| **Windows Events** | TCP/WinRM | Security, System, PowerShell logs |

## Correlation Engine

Alerts are correlated based on:
- **Temporal proximity** — Events within time window
- **Process ancestry** — Parent-child process relationships
- **Network adjacency** — Source/destination IP relationships

## Sigma Live Compilation

Analysts write Sigma rules → Platform compiles to:
- Elastic Query DSL
- Microsoft KQL
- Splunk SPL

WebAssembly client-side compilation for air-gapped operation.
