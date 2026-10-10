export type RunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type OracleOutcome =
  | "INJECTION_DETECTED"
  | "POLICY_VIOLATION_ATTEMPTED"
  | "POLICY_VIOLATION_BLOCKED"
  | "POLICY_VIOLATION_EXECUTED"
  | "NO_VIOLATION_OBSERVED"
  | "INCONCLUSIVE";

export type PageResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type Agent = {
  agent_id: string;
  name: string;
  description: string;
  model: string;
  tool_ids: string[];
  policy_set_id: string;
  defense_profile_id?: string | null;
  config_version: number;
};

export type PolicyRule = {
  policy_id: string;
  title: string;
  effect: "allow" | "deny";
  action: string;
  conditions: Record<string, unknown>;
  severity: string;
};

export type PolicySet = {
  policy_set_id: string;
  name: string;
  version: number;
  default_effect: "allow" | "deny";
  rules: PolicyRule[];
};

export type TestCase = {
  case_id: string;
  name: string;
  kind: "attack" | "benign" | "regression";
  attack_surface: "email" | "rag_document" | "tool_response" | "none";
  user_task: string;
  policy_ids: string[];
  labels: string[];
};

export type TestSuite = {
  suite_id: string;
  name: string;
  description: string;
  version: number;
  case_ids: string[];
  cases: TestCase[];
};

export type RunSummary = {
  total_attempts: number;
  valid_attempts: number;
  verified_executed_violations: number;
  attempted_violations: number;
  blocked_attempts: number;
  inconclusive_attempts: number;
  attack_success_rate: number;
};

export type Run = {
  run_id: string;
  agent_id?: string;
  suite_id?: string;
  policy_set_id?: string;
  // Compatibility fields retained by runs written by the prototype backend.
  model?: string;
  scenario?: string;
  defense_id?: string | null;
  status: RunStatus;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  model_config_snapshot?: Record<string, unknown> | null;
  // Queued and legacy records may not have computed metrics yet.
  summary?: RunSummary | null;
  error?: string | null;
};

export type TraceEvent = {
  event_id: string;
  run_id: string;
  attempt_id: string;
  sequence: number;
  type: string;
  source: string;
  message: string;
  tool_name?: string | null;
  arguments_redacted?: Record<string, unknown> | null;
  result_redacted?: Record<string, unknown> | null;
  policy_decision?: string | null;
  policy_ids: string[];
  timestamp: string;
};

export type Finding = {
  finding_id: string;
  run_id: string;
  case_id: string;
  payload_id?: string | null;
  policy_id: string;
  title: string;
  violation_type: string;
  outcome: OracleOutcome;
  evidence_event_ids: string[];
  replay_case_id: string;
  severity: string;
  trust_boundary: string;
  actual_effect: string;
  suggested_mitigation: string;
};

export type Defense = {
  defense_id: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  applicability: string[];
  version: number;
};

export type Regression = {
  regression_id: string;
  baseline_run_id: string;
  defended_run_id: string;
  status: RunStatus;
  case_results: Array<Record<string, unknown>>;
  attack_block_rate: number;
  benign_pass_rate: number;
};

export type Health = {
  status: string;
  storage: string;
  database_connected: boolean;
  worker: string;
  network_mode: string;
  warning?: string | null;
};
