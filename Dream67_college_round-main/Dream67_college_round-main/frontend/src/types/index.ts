export interface PolicyConfig {
  profile_name: string;
  untrusted_content_delimiter: boolean;
  enforce_tool_rbac: boolean;
  least_privilege_records: boolean;
  isolate_session_memory: boolean;
  require_human_approval: boolean;
  enforce_call_budget_and_trust: boolean;
  allowed_tools: string[];
  prohibited_tools: string[];
  allowed_record_classifications: string[];
  allowed_email_domains: string[];
  max_tool_calls_per_turn: number;
}

export interface ToolDefinition {
  id: string;
  agent_id: string;
  tool_name: string;
  permissions: Record<string, unknown>;
  risk_level: string;
  description: string;
}

export interface AgentTarget {
  id: string;
  project_id: string;
  name: string;
  adapter_type: string;
  system_goal: string;
  endpoint_config: Record<string, unknown>;
  policy_config: PolicyConfig;
  tools?: ToolDefinition[];
  created_at: string;
}

export interface Scenario {
  id: string;
  code: string;
  category: string;
  owasp_id: string;
  name: string;
  base_severity: 'Critical' | 'High' | 'Medium' | 'Low';
  test_definition: {
    objective: string;
    prerequisites: string[];
    user_prompt: string;
    attack_vector: string;
    [key: string]: unknown;
  };
  expected_outcome: {
    safe_behavior: string;
    failure_condition: string;
    required_controls: string[];
  };
}

export interface CategoryBreakdownItem {
  category: string;
  owasp_id: string;
  total_tests: number;
  successful_attacks: number;
  blocked_or_safe: number;
  findings_count: number;
}

export interface CampaignMetrics {
  total_test_cases: number;
  completed_adversarial_tests: number;
  completed_benign_tests: number;
  confirmed_vulnerabilities: number;
  successful_attacks: number;
  defended_or_blocked_attacks: number;
  attack_success_rate: number;
  policy_violation_rate: number;
  unauthorized_tool_execution_rate: number;
  sensitive_data_leakage_rate: number;
  benign_task_success_rate: number;
  false_positive_rate: number;
  test_coverage_rate: number;
  reproducibility_rate: number;
  severity_distribution: Record<'Critical' | 'High' | 'Medium' | 'Low', number>;
  category_breakdown: CategoryBreakdownItem[];
}

export interface TestRun {
  id: string;
  project_id: string;
  agent_id: string;
  agent_name: string;
  name: string;
  status: string;
  configuration: {
    execution_mode: string;
    max_steps: number;
    time_budget_seconds: number;
    enable_adaptive_followups: boolean;
    include_benign_baseline: boolean;
    policy_snapshot: PolicyConfig;
  };
  metrics_summary: CampaignMetrics;
  started_at: string;
  finished_at: string;
}

export interface TestCase {
  id: string;
  run_id: string;
  scenario_id: string;
  scenario_code: string;
  scenario_name: string;
  category: string;
  owasp_id: string;
  sequence_order: number;
  is_adaptive_followup: boolean;
  priority_score: number;
  input_payload: Record<string, unknown>;
  expected_behavior: Record<string, unknown>;
  agent_response: string;
  outcome: 'EXPLOITED' | 'BLOCKED_VIOLATION_ATTEMPT' | 'DEFENDED_SAFE' | 'BENIGN_PASSED' | 'BENIGN_BROKEN';
  attack_succeeded: boolean;
  policy_violated: boolean;
  unauthorized_tool_executed: boolean;
  data_leaked: boolean;
  leaked_tokens: string[];
  blocked_actions_count: number;
  executed_unauthorized_count: number;
  false_positive_flagged: boolean;
  event_count: number;
  duration_ms: number;
}

export interface ExecutionEvent {
  id: string;
  run_id: string;
  test_case_id: string;
  sequence: number;
  event_type: string;
  actor: string;
  details: Record<string, unknown>;
  boundary_crossed: boolean;
  timestamp: string;
}

export interface Finding {
  id: string;
  run_id: string;
  test_case_id: string;
  scenario_code: string;
  category: string;
  owasp_id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  affected_component: string;
  evidence: {
    outcome: string;
    leaked_canaries: string[];
    executed_unauthorized_actions: Array<Record<string, unknown>>;
    blocked_actions: Array<Record<string, unknown>>;
    tool_call_count: number;
    agent_response_excerpt: string;
    impact_rationale: string;
    exploitability: string;
    evidence_confidence: string;
    reproduction_steps: string[];
  };
  remediation: string;
  evaluation_method: string;
  status: 'Open' | 'Reproduced' | 'Mitigated' | 'Accepted';
  created_at: string;
}

export interface ScenarioComparisonRow {
  scenario_code: string;
  scenario_name: string;
  category: string;
  owasp_id: string;
  original_test_case_id: string;
  mitigated_test_case_id: string;
  original_outcome: string;
  mitigated_outcome: string;
  original_attack_succeeded: boolean;
  mitigated_attack_succeeded: boolean;
  original_data_leaked: boolean;
  mitigated_data_leaked: boolean;
  remediation_verified: boolean;
}

export interface ReplayRun {
  id: string;
  original_run_id: string;
  mitigated_run_id: string;
  agent_id: string;
  applied_defenses: Record<string, boolean>;
  comparison_summary: {
    original_asr: number;
    mitigated_asr: number;
    asr_reduction_points: number;
    original_vulnerabilities: number;
    mitigated_vulnerabilities: number;
    original_leakage_rate: number;
    mitigated_leakage_rate: number;
    original_benign_rate: number;
    mitigated_benign_rate: number;
    defense_blocking_rate: number;
    regression_pass_rate: number;
    functional_preservation_verified: boolean;
    scenario_comparisons: ScenarioComparisonRow[];
  };
  created_at: string;
}

export interface SystemStatus {
  status: string;
  app_name: string;
  mongodb_engine: string;
  mongodb_uri_configured: string;
  mongodb_db_name: string;
  execution_mode: string;
  llm_provider?: string;
  llm_model?: string;
  ollama_base_url?: string;
  counts: {
    projects: number;
    agents: number;
    scenarios: number;
    test_runs: number;
    findings: number;
    replays: number;
  };
}

export type AgentMode = 'vulnerable' | 'protected';
export type ScenarioKind = 'injection' | 'benign';

export interface ScanEvent {
  step: number;
  type: string;
  message: string;
  details: Record<string, unknown>;
  ts?: string;
}

export interface ScanFinding {
  title: string;
  severity: string;
  evidence: string;
}

export interface ScanMetrics {
  tool_attempts: number;
  unauthorized_executions: number;
  blocked_attempts: number;
  canary_exposed: boolean;
  iterations_limited: boolean;
}

export interface ScanResult {
  run_id: string;
  model?: string;
  scenario: ScenarioKind;
  agent_mode: AgentMode;
  document_source?: string;
  status: string;
  attack_success: boolean;
  outcome: string;
  finding: ScanFinding;
  metrics: ScanMetrics;
  final_answer?: string;
  started_at?: string;
  ended_at?: string;
  step_count?: number;
  persisted?: boolean;
  persist_error?: string | null;
  events: ScanEvent[];
}

export interface RealScanRequest {
  agent_mode: AgentMode;
  scenario: ScenarioKind;
  document?: string | null;
  task?: string | null;
}

