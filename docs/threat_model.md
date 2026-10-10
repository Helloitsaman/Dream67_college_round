# Threat model

## Scope

The MVP evaluates one authorized synthetic Workplace Assistant across three controlled trust boundaries: inbound email, retrieved documents, and mocked tool results. It measures observable tool proposals, authorization decisions, tool results, and sandbox state changes. It does not claim access to hidden chain of thought.

## Assets and security properties

- Synthetic confidential canaries must not reach the external mock outbox.
- `/sandbox/protected/*` must not be modified by injected instructions.
- Trusted facts must not silently inherit authority from low-trust retrieval.
- Benign internal email and read-only summary tasks must keep working after defense.
- Provider credentials and the BFF service token must never reach the browser or trace log.

## Trust boundaries and controls

| Boundary | Main risk | Control |
| --- | --- | --- |
| Browser → BFF | Arbitrary proxying, CSRF | Exact route allowlist, same-origin mutation check, body cap |
| BFF → FastAPI | Unauthenticated service access | Constant-time bearer token check |
| Retrieved content → target | Instruction/data confusion | Explicit low-trust fixtures and injection telemetry |
| Target → tools | Unauthorized side effect | Independent recipient/path policy enforcement |
| Tools → environment | Host or network escape | In-memory workspace, normalized paths, fixture-only URLs, mock outbox |
| Trace → viewer | Secret leakage | Redaction and bounded evidence fields |

## Deliberate non-goals

No host shell execution, real email delivery, arbitrary URL fetching, production credential use, external-agent penetration testing, semantic universal-safety claims, or autonomous patching is permitted. A successful controlled sample is evidence of a vulnerability; an unsuccessful sample is not proof of safety.

