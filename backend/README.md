# AgentBreak backend

The backend owns security policy, sandbox execution, oracle classification, scan orchestration, MongoDB access, replay, and reporting. The frontend is never trusted to write evaluation results.

Run from the repository root:

```powershell
$env:PYTHONPATH="backend"
$env:STORAGE_BACKEND="memory" # or configure MONGODB_URI
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

All `/v1/*` endpoints require the bearer value in `BACKEND_SERVICE_TOKEN`. `/health` is intentionally unauthenticated for local/container readiness checks.

The default `deterministic/mock-v1` target makes security outcomes repeatable without an LLM key. `openrouter_client.py` and the earlier demonstration routes remain as reference code but are not mounted by the production application.

Run tests:

```powershell
$env:PYTHONPATH="backend"
$env:STORAGE_BACKEND="memory"
python -m unittest discover -s backend/tests -v
```
