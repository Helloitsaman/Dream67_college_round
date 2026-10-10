# Data dictionary

AgentBreak uses MongoDB as the durable store and an in-memory adapter for tests or degraded local demos. Bootstrap is idempotent, creates validators and indexes, and seeds the built-in catalog.

| Collection | Stable key | Contents |
| --- | --- | --- |
| `agents` | `agent_id` | Target model, tools, policy, config version |
| `tools` | `tool_id` | Synthetic tool schemas and permissions |
| `policy_sets` | `policy_set_id` | Versioned deny/allow rules |
| `test_suites` | `suite_id` | Named case lists |
| `test_cases` | `case_id` | Attack surface, fixture, assertions, labels |
| `payloads` | `payload_id` | Synthetic seed and generated candidates |
| `runs` | `run_id` | Lifecycle, model snapshot, summary denominators |
| `attempts` | `attempt_id` | Per-candidate oracle result and workspace ID |
| `trace_events` | `event_id` | Ordered redacted observable events |
| `findings` | `finding_id` | Deduplicated verified/blocked/attempted evidence |
| `defenses` | `defense_id` | Independent tool-enforcement profiles |
| `regression_results` | `regression_id` | Before/after attack and utility metrics |
| `reports` | `report_id` | Reserved export metadata |

Important indexes include unique stable IDs, `(attempt_id, sequence)`, `(run_id, timestamp)`, `(status, created_at)`, `(agent_id, created_at)`, and `(kind, attack_surface)`.

Large raw transcripts are intentionally excluded from normal trace documents. Arguments/results are size-limited and credential-shaped fields are redacted. All supplied datasets are synthetic and use non-routable `example.test` identities.

