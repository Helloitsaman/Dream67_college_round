import {
  AgentTarget,
  ExecutionEvent,
  Finding,
  PolicyConfig,
  ReplayRun,
  Scenario,
  SystemStatus,
  TestCase,
  TestRun,
} from '../types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error (${res.status}): ${errText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getSystemStatus: () => request<SystemStatus>('/system/status'),
  updateExecutionMode: (payload: {
    execution_mode: string;
    llm_provider: string;
    llm_model: string;
    ollama_base_url: string;
  }) =>
    request<SystemStatus>('/system/execution-mode', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  clearWorkspaceRuns: () => request<Record<string, unknown>>('/system/reset-demo', { method: 'POST' }),

  listAgents: () => request<AgentTarget[]>('/agents'),
  updateAgentPolicy: (agentId: string, policy_config: PolicyConfig) =>
    request<AgentTarget>(`/agents/${agentId}/policy`, {
      method: 'PATCH',
      body: JSON.stringify({ policy_config }),
    }),
  applyPolicyPreset: (agentId: string, preset: 'unprotected' | 'hardened') =>
    request<AgentTarget>(`/agents/${agentId}/preset/${preset}`, {
      method: 'POST',
    }),

  listScenarios: () => request<Scenario[]>('/scenarios'),

  listTestRuns: () => request<TestRun[]>('/test-runs'),
  startTestRun: (payload: {
    agent_id: string;
    name: string;
    scenario_codes?: string[];
    categories?: string[];
    include_benign_baseline: boolean;
    enable_adaptive_followups: boolean;
    execution_mode: string;
    max_steps: number;
    time_budget_seconds: number;
    llm_config?: Record<string, unknown>;
  }) =>
    request<TestRun>('/test-runs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getTestRunDetails: (runId: string) =>
    request<{ run: TestRun; test_cases: TestCase[]; findings: Finding[] }>(`/test-runs/${runId}`),

  getTestRunTraces: (runId: string, testCaseId?: string) => {
    const query = testCaseId ? `?test_case_id=${encodeURIComponent(testCaseId)}` : '';
    return request<{
      run: TestRun;
      traces: Array<{ test_case: TestCase; events: ExecutionEvent[] }>;
    }>(`/test-runs/${runId}/traces${query}`);
  },

  listFindings: (runId?: string) => {
    const query = runId ? `?run_id=${encodeURIComponent(runId)}` : '';
    return request<Finding[]>(`/findings${query}`);
  },

  updateFindingStatus: (findingId: string, status: Finding['status']) =>
    request<Finding>(`/findings/${findingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  listReplays: (originalRunId?: string) => {
    const query = originalRunId ? `?original_run_id=${encodeURIComponent(originalRunId)}` : '';
    return request<ReplayRun[]>(`/replays${query}`);
  },

  executeReplay: (payload: {
    original_run_id: string;
    apply_defenses: Record<string, boolean>;
    update_agent_policy_permanently: boolean;
  }) =>
    request<ReplayRun>('/replays', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getReport: (runId: string) =>
    request<{
      run: TestRun;
      metrics: TestRun['metrics_summary'];
      findings: Finding[];
      test_cases: TestCase[];
      replays: ReplayRun[];
      markdown_report: string;
    }>(`/reports/${runId}`),
};
