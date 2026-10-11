# Running Phase 2

Phase 2 evaluates a separately running test agent through a narrow HTTP protocol. The backend never imports the target agent in production execution: it registers an approved endpoint, injects a synthetic document, invokes the target, retrieves trusted tool evidence, and lets the deterministic oracle decide the outcome.

## Provider modes

`ATTACK_LLM_PROVIDER` controls the adaptive attacker and `TARGET_LLM_PROVIDER` controls the external target agent.

- `auto` prefers OpenAI when `OPENAI_API_KEY` is set, otherwise falls back to OpenRouter when configured, then to the deterministic mock.
- `openai` requires `OPENAI_API_KEY` and uses the Responses API.
- `mock` makes no model API calls and is the reproducible test/demo mode.

The default OpenAI model is `gpt-6.1-sol`. Override it with `OPENAI_MODEL` or set `TARGET_LLM_MODEL` when the target should use a different model from the attacker.

## Configure OpenAI locally

Put the key in `backend/.env`; the backend and the separately launched test-agent service both load that file. Do not paste the key into source code or commit it.

```dotenv
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-6.1-sol
ATTACK_LLM_PROVIDER=auto
TARGET_LLM_PROVIDER=auto
```

The integration follows OpenAI's [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), uses [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) for attacker candidates, and uses the documented [function-calling loop](https://developers.openai.com/api/docs/guides/function-calling) for the external target.

## Run locally

From the repository root, start the external test agent:

```powershell
$env:PYTHONPATH="backend;."
uvicorn external_test_agent.app:app --host 127.0.0.1 --port 8090
```

In another terminal, start the backend:

```powershell
$env:PYTHONPATH="backend"
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Then run the frontend as usual and open `/campaigns`. Register `http://127.0.0.1:8090`, create a campaign, and inspect its attempts, feedback lineage, evidence, and oracle verdicts.

Docker Compose starts all three services and passes the same provider configuration to both reasoning roles.

## Safety boundary

The target exposes only `read_document` and `send_email_mock`. Email is written to an in-memory mock outbox; no real message is sent. Each attempt resets its state, all requests carry run/attempt correlation identifiers, endpoints must match the backend allowlist exactly, and the oracle trusts only correlated tool events plus mock-outbox evidence.

## Verification

```powershell
$env:PYTHONPATH="backend"
$env:STORAGE_BACKEND="memory"
python -m unittest discover -s backend/tests -v

Set-Location frontend
pnpm lint
pnpm build
```

The OpenAI integration tests use an HTTP mock and do not spend API credits. A live campaign requires a valid account key with access to the configured model.
