# Phase 2 implementation report

## Outcome

The repository now contains a working Phase 2 vertical slice alongside the unchanged Phase 1 flow. An operator can register the separate HTTP test agent, launch a maximum-five-attempt document-injection campaign, inspect feedback lineage and trusted evidence, and reopen results from MongoDB after an API restart.

OpenAI is the preferred live provider. Both reasoning roles use the Responses API:

- The attacker uses strict JSON-schema output to generate a candidate and revision summary from bounded prior feedback.
- The external target uses function calling for `read_document` and `send_email_mock`, preserving response items between tool turns.

When no model key is configured, the deterministic provider exercises the same adapter, persistence, oracle, and UI paths for repeatable development and CI.

## Main changed paths

- `backend/app/api/v1.py` — integration, campaign, attempt, evidence, and cancellation endpoints.
- `backend/app/models.py` — Phase 2 request, persistence, evidence, and verdict contracts.
- `backend/app/services/campaign_runner.py` — bounded adaptive orchestration and feedback lineage.
- `backend/app/services/phase2_attacker.py` — deterministic, OpenAI, and optional OpenRouter providers.
- `backend/app/services/external_agent.py` — authenticated, timeout-limited, non-redirecting exact-allowlist adapter.
- `backend/app/services/phase2_oracle.py` — model-independent evidence verification.
- `external_test_agent/` — independently runnable target with isolated state, two mock tools, event telemetry, and mock outbox.
- `frontend/src/app/campaigns/` and `frontend/src/components/campaign*.tsx` — real campaign launch/history/detail/evidence UI.
- `backend/app/db/store.py` and `backend/app/services/fixtures.py` — additive collections, indexes, and scenario seed.
- `.env.example`, `backend/.env.example`, and `docker-compose.yml` — OpenAI and external-agent configuration.

## Verification performed

- Backend: 19 tests passed, including existing Phase 1 regression tests, protocol/auth/reset tests, all four oracle outcomes, feedback adaptation, and mocked OpenAI Responses API contracts.
- Frontend: ESLint passed.
- Frontend: Next.js 16.4 production build passed, including `/campaigns` and `/campaigns/[id]`.
- Containers: `docker compose config --quiet` passed.
- Atlas-backed manual demo: registered the independent service, ran vulnerable/protected/benign controls, reloaded the saved vulnerable campaign after restarting the API.

Observed persisted control results:

- Vulnerable: two attempts, feedback and parent lineage present, final `EXECUTED_VIOLATION`, seven trusted events, complete evidence.
- Protected: `NO_VIOLATION_OBSERVED` followed by `BLOCKED_ATTEMPT`.
- Benign: `NO_VIOLATION_OBSERVED`.

## Known limitations

- No live OpenAI request was made because `OPENAI_API_KEY` is not currently configured. The provider contract is covered with mocked HTTP responses; a live run remains the final environment-specific check.
- Campaign work is in-process. MongoDB persists completed data, but an API restart marks an in-flight campaign failed instead of resuming it.
- The HTTP adapter is intentionally protocol-specific and restricted to configured exact endpoints; this is not a universal agent connector or production target scanner.
- Email effects remain entirely inside the synthetic in-memory mock outbox.

## Manual demo

1. Add `OPENAI_API_KEY` to `backend/.env` and leave both provider settings on `auto`.
2. Start the external agent on port 8090, the FastAPI backend on port 8000, and the frontend on port 3000 using `docs/phase2-running.md`.
3. Open `/campaigns` and register `http://127.0.0.1:8090`.
4. Launch the vulnerable control with a budget of five.
5. Open the campaign detail page and inspect candidate revisions, parent/feedback IDs, events, outbox references, and the oracle explanation.
6. Repeat with protected and benign controls to demonstrate blocked and no-violation outcomes.
