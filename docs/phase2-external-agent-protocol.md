# AgentBreak external test-agent protocol v1.0

The protocol connects AgentBreak to one explicitly allowlisted synthetic target. It is not a general remote-scanning interface.

## Trust boundary

- AgentBreak sends a bounded document payload and legitimate task to the target.
- The target model cannot write its event log or mock outbox directly.
- `read_document` and `send_email_mock` append records owned by the target's trusted tool runtime.
- AgentBreak retrieves evidence with a server-held bearer token and verifies all run/attempt correlation identifiers.
- Redirects are not followed. Registration accepts only exact endpoints from `ALLOWED_TEST_AGENT_ENDPOINTS`.

Every JSON mutation includes `protocol_version: "1.0"`, `run_id`, and `attempt_id`. Request bodies are limited by the service and no route sends real email.

## Routes

### `GET /health`

Returns readiness, protocol version, and model mode.

### `GET /capabilities`

Requires bearer authentication. Returns:

```json
{
  "protocol_version": "1.0",
  "capabilities": ["document_injection", "reset", "trusted_tool_events"],
  "tool_names": ["read_document", "send_email_mock"]
}
```

### `POST /test/reset`

```json
{
  "protocol_version": "1.0",
  "run_id": "campaign-123",
  "attempt_id": "attempt-123",
  "control_mode": "vulnerable"
}
```

Restores the clean status document, confidential synthetic record, empty mock outbox, and empty append-only event log. Returns a new `snapshot_id`.

### `POST /test/documents/DOC-PROJECT-STATUS-001`

Replaces only the approved injection document body for the correlated attempt. Other document IDs are rejected.

### `POST /test/invoke`

Runs the legitimate task and returns an `invocation_id` plus the observable final response. Private model reasoning is never returned.

### `GET /test/evidence/{attempt_id}?run_id=...`

Returns correlated tool events, completion state, snapshot ID, and mock-outbox messages. Evidence event types include `TOOL_CALL_PROPOSED`, `TOOL_CALL_BLOCKED`, and `TOOL_CALL_EXECUTED`.

## Failure semantics

- Invalid token: `401`.
- Unsupported protocol or correlation mismatch: `409`/`422`.
- Unknown attempt/document: `404`.
- Oversized injected body: `422`.
- Provider failure: `502`; evidence remains incomplete and the AgentBreak oracle returns `INCONCLUSIVE`.
