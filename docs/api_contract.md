# AgentBreak API contract

All `/v1/*` endpoints require `Authorization: Bearer <BACKEND_SERVICE_TOKEN>`. The browser never receives this token: it calls the same-origin Next.js `/api/*` BFF, which forwards only allowlisted routes. Timestamps use UTC ISO 8601 and identifiers are stable strings.

| Method | Endpoint | Result |
| --- | --- | --- |
| GET | `/health` | Storage, worker, and simulator readiness |
| GET | `/v1/agents` | Paginated target catalog |
| GET | `/v1/suites` | Suites with expanded cases |
| GET | `/v1/policies` | Machine-readable policy sets |
| GET | `/v1/defenses` | Available enforcement profiles |
| POST | `/v1/runs` | `202` with queued `run_id` |
| GET | `/v1/runs` | Paginated runs, newest first |
| GET | `/v1/runs/{id}` | Lifecycle and metrics |
| GET | `/v1/runs/{id}/events` | Ordered, redacted observable trace |
| GET | `/v1/runs/{id}/findings` | Deduplicated policy findings |
| POST | `/v1/runs/{id}/cancel` | Request bounded-run cancellation |
| POST | `/v1/regressions` | Replay a baseline with a defense |
| GET | `/v1/regressions/{id}` | Attack block and benign pass rates |
| GET | `/v1/reports/{run_id}?format=json\|markdown` | Download assessment |

Example run request:

```json
{
  "agent_id": "workplace-agent-v1",
  "suite_id": "core-agent-security-v1",
  "policy_set_id": "workplace-baseline",
  "max_attempts_per_case": 2
}
```

`max_attempts_per_case` is validated from 1 through 20. The deterministic MVP executes at most three variations per attack case and one benign control to keep local runs bounded.

