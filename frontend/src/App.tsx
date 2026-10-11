import React, { useCallback, useEffect, useState } from 'react';
import { ActiveTab, Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { OverviewPage } from './pages/OverviewPage';
import { RunTestPage } from './pages/RunTestPage';
import { FindingsPage } from './pages/FindingsPage';
import { AttackTracePage } from './pages/AttackTracePage';
import { DefenseComparisonPage } from './pages/DefenseComparisonPage';
import { api } from './services/api';
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
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  const [executionMode, setExecutionMode] = useState<'deterministic' | 'hybrid_llm'>('deterministic');
  const [llmProvider, setLlmProvider] = useState<string>('ollama');
  const [llmModel, setLlmModel] = useState<string>('llama3');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState<string>('http://localhost:11434');

  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [agents, setAgents] = useState<AgentTarget[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [replays, setReplays] = useState<ReplayRun[]>([]);
  const [traces, setTraces] = useState<Array<{ test_case: TestCase; events: ExecutionEvent[] }>>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const loadAllData = useCallback(async (preferredRunId?: string) => {
    try {
      setErrorBanner(null);
      const [statusData, agentsData, scenariosData, runsData, findingsData, replaysData] =
        await Promise.all([
          api.getSystemStatus(),
          api.listAgents(),
          api.listScenarios(),
          api.listTestRuns(),
          api.listFindings(),
          api.listReplays(),
        ]);

      setSystemStatus(statusData);
      if (statusData.execution_mode === 'hybrid_llm' || statusData.execution_mode === 'deterministic') {
        setExecutionMode(statusData.execution_mode);
      }
      if (statusData.llm_provider) setLlmProvider(statusData.llm_provider);
      if (statusData.llm_model) setLlmModel(statusData.llm_model);
      if (statusData.ollama_base_url) setOllamaBaseUrl(statusData.ollama_base_url);

      setAgents(agentsData);
      setScenarios(scenariosData);
      setRuns(runsData);
      setFindings(findingsData);
      setReplays(replaysData);

      const baselineRun =
        runsData.find((r) => !r.name.startsWith('[Mitigated Replay]')) || runsData[0];
      const targetRunId = preferredRunId || baselineRun?.id || '';
      if (targetRunId) {
        setSelectedRunId(targetRunId);
        const traceRes = await api.getTestRunTraces(targetRunId);
        setTraces(traceRes.traces);
        if (traceRes.traces.length > 0) {
          setSelectedTestCaseId(traceRes.traces[0].test_case.id);
        }
      } else {
        setSelectedRunId('');
        setTraces([]);
        setSelectedTestCaseId('');
      }
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to connect to AgentBreak API.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  const handleSaveExecutionMode = async (config: {
    execution_mode: 'deterministic' | 'hybrid_llm';
    llm_provider: string;
    llm_model: string;
    ollama_base_url: string;
  }) => {
    setExecutionMode(config.execution_mode);
    setLlmProvider(config.llm_provider);
    setLlmModel(config.llm_model);
    setOllamaBaseUrl(config.ollama_base_url);
    const updatedStatus = await api.updateExecutionMode(config);
    setSystemStatus(updatedStatus);
  };

  const handleSelectRun = async (runId: string) => {
    setSelectedRunId(runId);
    if (!runId) {
      setTraces([]);
      setSelectedTestCaseId('');
      return;
    }
    try {
      const traceRes = await api.getTestRunTraces(runId);
      setTraces(traceRes.traces);
      if (traceRes.traces.length > 0) {
        setSelectedTestCaseId(traceRes.traces[0].test_case.id);
      }
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to load run traces.');
    }
  };

  const handleInspectTrace = async (runId: string, testCaseId: string) => {
    if (runId !== selectedRunId) {
      await handleSelectRun(runId);
    }
    setSelectedTestCaseId(testCaseId);
    setActiveTab('traces');
  };

  const handleStartCampaign = async (payload: {
    agent_id: string;
    name: string;
    scenario_codes: string[];
    include_benign_baseline: boolean;
    enable_adaptive_followups: boolean;
    execution_mode: string;
    max_steps: number;
    time_budget_seconds: number;
    llm_config: Record<string, unknown>;
  }) => {
    setIsLaunching(true);
    try {
      const newRun = await api.startTestRun(payload);
      await loadAllData(newRun.id);
      setActiveTab('overview');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to start campaign.');
    } finally {
      setIsLaunching(false);
    }
  };

  const handleUpdateAgentPolicy = async (agentId: string, policy: PolicyConfig) => {
    await api.updateAgentPolicy(agentId, policy);
    const updatedAgents = await api.listAgents();
    setAgents(updatedAgents);
  };

  const handleApplyPreset = async (agentId: string, preset: 'unprotected' | 'hardened') => {
    await api.applyPolicyPreset(agentId, preset);
    const updatedAgents = await api.listAgents();
    setAgents(updatedAgents);
  };

  const handleUpdateFindingStatus = async (findingId: string, status: Finding['status']) => {
    await api.updateFindingStatus(findingId, status);
    const updatedFindings = await api.listFindings();
    setFindings(updatedFindings);
  };

  const handleExecuteReplay = async (
    originalRunId: string,
    defenses: Record<string, boolean>,
    permanent: boolean
  ) => {
    setIsReplaying(true);
    try {
      await api.executeReplay({
        original_run_id: originalRunId,
        apply_defenses: defenses,
        update_agent_policy_permanently: permanent,
      });
      await loadAllData(originalRunId);
      setActiveTab('replay');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to execute defense replay.');
    } finally {
      setIsReplaying(false);
    }
  };

  const handleQuickReplay = async (runId: string) => {
    await handleExecuteReplay(
      runId,
      {
        untrusted_content_delimiter: true,
        enforce_tool_rbac: true,
        least_privilege_records: true,
        isolate_session_memory: true,
        require_human_approval: true,
        enforce_call_budget_and_trust: true,
      },
      false
    );
  };

  const handleClearRuns = async () => {
    setIsClearing(true);
    try {
      await api.clearWorkspaceRuns();
      await loadAllData();
      setActiveTab('home');
    } finally {
      setIsClearing(false);
    }
  };

  const selectedRun = runs.find((r) => r.id === selectedRunId) || runs[0] || null;

  return (
    <div className="min-h-screen bg-[#070707] text-white flex flex-col lg:flex-row">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        systemStatus={systemStatus}
        onClearRuns={handleClearRuns}
        isClearing={isClearing}
        runs={runs}
        selectedRunId={selectedRunId}
        onSelectRun={(id) => {
          void handleSelectRun(id);
          setActiveTab('overview');
        }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 sm:px-10 py-8">
          {errorBanner && (
            <div className="mb-6 p-4 rounded-xl bg-[#14120A] border border-[#FFD444] text-white text-xs flex items-center justify-between gap-4">
              <span>System Alert: {errorBanner}</span>
              <button
                onClick={() => setErrorBanner(null)}
                className="ab-btn-outline px-3 py-1.5 text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="ab-card p-14 text-center space-y-2">
              <div className="font-serif-display text-xl text-white">
                Initializing AgentBreak Workspace
              </div>
              <div className="font-cursive-italic text-base text-[#FFD444]">
                Connecting to MongoDB collections & sandbox environment...
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'home' && (
                <HomePage
                  executionMode={executionMode}
                  llmProvider={llmProvider}
                  llmModel={llmModel}
                  ollamaBaseUrl={ollamaBaseUrl}
                  systemStatus={systemStatus}
                  onSaveExecutionMode={handleSaveExecutionMode}
                  onContinueToCampaign={() => setActiveTab('run')}
                />
              )}

              {activeTab === 'overview' && (
                <OverviewPage
                  runs={runs}
                  selectedRun={selectedRun}
                  onSelectRun={handleSelectRun}
                  findings={findings}
                  replays={replays}
                  onNavigateTab={setActiveTab}
                  onInspectTrace={handleInspectTrace}
                  onTriggerQuickReplay={handleQuickReplay}
                  isReplaying={isReplaying}
                />
              )}

              {activeTab === 'run' && (
                <RunTestPage
                  agents={agents}
                  scenarios={scenarios}
                  defaultExecutionMode={executionMode}
                  defaultLlmProvider={llmProvider}
                  defaultLlmModel={llmModel}
                  onStartCampaign={handleStartCampaign}
                  onUpdateAgentPolicy={handleUpdateAgentPolicy}
                  onApplyPreset={handleApplyPreset}
                  isLaunching={isLaunching}
                />
              )}

              {activeTab === 'findings' && (
                <FindingsPage
                  runs={runs}
                  selectedRunId={selectedRunId}
                  onSelectRun={handleSelectRun}
                  findings={findings}
                  onInspectTrace={handleInspectTrace}
                  onUpdateStatus={handleUpdateFindingStatus}
                  onTriggerReplay={handleQuickReplay}
                  isReplaying={isReplaying}
                />
              )}

              {activeTab === 'traces' && (
                <AttackTracePage
                  runs={runs}
                  selectedRunId={selectedRunId}
                  onSelectRun={handleSelectRun}
                  traces={traces}
                  selectedTestCaseId={selectedTestCaseId}
                  onSelectTestCase={setSelectedTestCaseId}
                />
              )}

              {activeTab === 'replay' && (
                <DefenseComparisonPage
                  runs={runs}
                  replays={replays}
                  selectedRunId={selectedRunId}
                  onSelectRun={handleSelectRun}
                  onExecuteReplay={handleExecuteReplay}
                  onInspectTrace={handleInspectTrace}
                  isReplaying={isReplaying}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
