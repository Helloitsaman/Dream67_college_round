# AgentBreak

AgentBreak is a controlled security evaluation lab for AI agents. The MVP tests a built-in Workplace Assistant against indirect email injection, poisoned retrieval, and malicious tool output. It records observable actions, proves synthetic side effects with a deterministic oracle, applies independent tool-policy defenses, replays attacks, and measures benign utility.

It is intentionally not a production penetration-testing tool or universal safety certification.

## What works

- Next.js 16 dashboard with a same-origin, allowlisted Backend-for-Frontend
- FastAPI API with typed requests, service authentication, queued scan lifecycle, cancellation, and polling
- MongoDB validators, indexes, idempotent catalog seeds, and an in-memory test/degraded mode
- Seven simulated tools with no host shell, real email, or arbitrary outbound web access
- Isolated per-attempt fixture reset and canary/state-hash evidence
- Attempted vs blocked vs executed policy outcomes
- Strict server-side recipient/path defense and before/after replay
- Benign regression measurement and JSON/Markdown assessment export
- Exact-count synthetic datasets and validation scripts

## Quick start with Docker

```powershell
Copy-Item .env.example .env
# Replace BACKEND_SERVICE_TOKEN in .env before anything beyond a local demo.
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The API health endpoint is exposed only on localhost at [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health). MongoDB and Redis are on an internal Compose network and are not published.

## Local development

Prerequisites: Node.js 24+, pnpm 11+, Python 3.11–3.13, and optional local/Atlas MongoDB.

```powershell
# Backend
Copy-Item backend/.env.example backend/.env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
$env:PYTHONPATH="backend"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

For a zero-database demo/test session, set `STORAGE_BACKEND=memory`. With `STORAGE_BACKEND=auto`, the API uses MongoDB when reachable and clearly reports a volatile-memory fallback in `/health`.

In another terminal:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
Set-Location frontend
pnpm install
pnpm dev
```

The frontend must use server-only `API_INTERNAL_URL` and `BACKEND_SERVICE_TOKEN`; never add a `NEXT_PUBLIC_` prefix to either.

## Database and datasets

```powershell
$env:PYTHONPATH="backend"
python -m app.scripts.generate_data
python -m app.scripts.init_db
python -m app.scripts.seed_data
python -m app.scripts.verify_seed
```

The generator produces 30 benign tasks, 40 emails, 30 RAG documents, 20 files, 12 policies, 30 seed payloads, 30 attack scenarios, 20 regression cases, and 7 tool definitions. All identities and canaries are synthetic.

## Verification

```powershell
$env:PYTHONPATH="backend"
$env:STORAGE_BACKEND="memory"
python -m unittest discover -s backend/tests -v

Set-Location frontend
pnpm lint
pnpm build
```

If your system Python is unavailable, an isolated run works with `uv run --isolated --python 3.13 --with-requirements backend/requirements.txt ...`.

## Project map

- `backend/app/services/runner.py` — bounded orchestration and trace recording
- `backend/app/services/policies.py` — machine-evaluable authorization
- `backend/app/services/oracle.py` — deterministic outcome classification
- `backend/app/services/sandbox.py` — fixture-only simulated tools
- `backend/app/db/store.py` — memory/MongoDB adapters, validators, indexes
- `frontend/src/app/api/[...path]/route.ts` — constrained BFF
- `frontend/src/components/run-detail.tsx` — evidence trace and findings
- `datasets/` — validated synthetic fixtures
- `docs/` — API contract, data dictionary, and threat model

The original blueprint is preserved in `AgentBreak_MVP_Build_Spec.md`.
