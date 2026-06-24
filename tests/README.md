# Test Suite

## Structure

```
tests/
├── unit/           # Unit tests for individual functions
├── integration/    # Integration tests for API routes
├── e2e/            # End-to-end browser tests
└── security/       # OWASP security test suite
```

## Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test -- --coverage

# E2E tests
npm run test:e2e

# Security tests
npm run test:security
```

## Coverage Targets

| Category | Target |
|----------|--------|
| Unit tests | 80%+ |
| Integration tests | 80%+ |
| Security tests | 90% OWASP coverage |
| E2E tests | Critical paths only |

## OWASP Security Testing

- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection
- A05: Security Misconfiguration
- A07: Authentication Failures
