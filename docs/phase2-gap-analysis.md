# Phase 2 gap analysis

## Repository detected

- Frontend: Next.js 16 App Router with a same-origin allowlisted BFF.
- Backend: FastAPI with authenticated `/v1` routes and lifespan-managed storage.
- Persistence: PyMongo `AsyncMongoClient`, MongoDB validators/indexes, plus an in-memory test backend.
- Phase 1 engine: deterministic attacker and target, per-attempt fixtures, simulated tools, policy authorization, trace events, deterministic oracle, reports, and defense replay.
- Model provider: an unused synchronous OpenRouter reference client. The production `app.main` does not mount the legacy real-scan route.

## Reused in Phase 2

- Existing service-token authentication and frontend BFF.
- `DocumentStore` abstraction and Atlas initialization pattern.
- Run status vocabulary, synthetic-only safety boundary, report language, and UI primitives.
- In-process bounded task lifecycle for the local MVP. Completed campaign data is persisted; a durable queue remains a future production requirement.

## Required additive work

| Requirement | Before Phase 2 | Phase 2 delta |
|---|---|---|
| External target | In-process scripted target | Versioned authenticated HTTP adapter and separately running demo target |
| Attacker | Replays one seeded payload | OpenRouter-backed generator with deterministic adaptive fake for tests |
| Adaptation | Variation label only | Parent attempt, feedback source, feedback digest, and materially revised payload |
| Evidence | Backend-generated local traces | Authenticated append-only target tool events and mock-outbox records |
| Oracle | Phase 1 tool execution objects | Correlation-aware external evidence oracle with four explicit verdicts |
| Persistence | Runs, attempts, traces, findings | Integrations, campaigns, attack attempts, tool events, verification results |
| UI | Phase 1 runs | Minimal campaign launch, lineage, verdict, and evidence views |

## Compatibility constraints

- Do not alter or drop existing Phase 1 collections or routes.
- Keep the current Next.js application; no Vite migration is applicable.
- Existing Atlas `runs` includes both current and prototype document shapes, so frontend reads remain defensive.
- The Docker internal network must remain private for MongoDB. Only model-calling services receive a separate egress network.

## Known MVP limitations

- Campaign execution is an in-process task. Completed data survives API restarts, but an actively running campaign is marked failed if its process disappears rather than resumed by a durable worker.
- The external HTTP protocol proves one controlled adapter, not universal agent compatibility.
- The single scenario and synthetic canary do not establish general agent safety.
