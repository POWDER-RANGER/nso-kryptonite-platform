# Contributing to NSO Kryptonite Platform

> *Adversary Simulation for Defensive Training — Detection Psychology & SOC Cognition*

---

## Philosophy

This project is not about building attack tools. It is about making defenders immune to the highest-tier threats by forcing them to survive those threats in controlled, measurable, iterative conditions.

Every contribution must follow the **Kryptonite Principle**: Every offensive technique added must be inseparable from its detection, mitigation, and accountability mechanism.

---

## How to Contribute

### Reporting Issues

- Use GitHub Issues with the appropriate template
- Security issues: Use the security advisory form (do not open public issues)
- Include: Mode affected, reproduction steps, expected vs actual behavior

### Submitting Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Follow the coding standards (see below)
4. Add tests for new functionality
5. Ensure all tests pass: `npm run test`
6. Ensure type checking passes: `npm run check`
7. Submit a Pull Request with detailed description

### Coding Standards

- **TypeScript**: Strict mode enabled. No `any` types without justification.
- **Security**: All inputs validated with Zod. No raw SQL. No client-side secrets.
- **Testing**: Unit tests for all utilities, integration tests for API routes, e2e for critical paths.
- **Documentation**: Every module must have README + ARCHITECTURE + OPERATOR docs.

### Module Contributions

When adding a new module or domain:

1. Create directory under `modules/` with the module name
2. Include: Red Team interface, Blue Team interface, detection twin, documentation
3. Map all techniques to MITRE ATT&CK
4. Include safety constraints that cannot be disabled
5. Add tests for both offensive and defensive paths

---

## The Three Laws for Contributors

1. **No offensive code without defensive twin.** Every attack simulation must include detection logic.
2. **No ground truth exposure.** Blue Team interfaces never leak Red Team information.
3. **No bypass of authorization core.** The auth core is not optional — it is mandatory for all functions.

---

## Code of Conduct

- This is a defensive training platform. No contributions that optimize for unauthorized offensive use.
- All discussions assume authorized, scoped, defensive training context.
- Respect the psychological safety principles: opt-out without penalty, no-stupid-questions, non-competitive Red Team.

---

*Authorized Operations Only*
