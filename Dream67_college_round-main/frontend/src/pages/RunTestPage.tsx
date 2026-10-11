import React, { useEffect, useState } from 'react';
import {
  ArrowUp,
  CheckSquare,
  Cpu,
  Lock,
  Paperclip,
  Sliders,
  Square,
  Unlock,
  Wrench,
} from 'lucide-react';
import { AgentTarget, PolicyConfig, Scenario } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

interface RunTestPageProps {
  agents: AgentTarget[];
  scenarios: Scenario[];
  defaultExecutionMode: 'deterministic' | 'hybrid_llm';
  defaultLlmProvider: string;
  defaultLlmModel: string;
  onStartCampaign: (payload: {
    agent_id: string;
    name: string;
    scenario_codes: string[];
    include_benign_baseline: boolean;
    enable_adaptive_followups: boolean;
    execution_mode: string;
    max_steps: number;
    time_budget_seconds: number;
    llm_config: Record<string, unknown>;
  }) => Promise<void>;
  onUpdateAgentPolicy: (agentId: string, policy: PolicyConfig) => Promise<void>;
  onApplyPreset: (agentId: string, preset: 'unprotected' | 'hardened') => Promise<void>;
  isLaunching: boolean;
}

const DEFENSE_CONTROLS_META: Array<{
  key: keyof PolicyConfig;
  label: string;
  description: string;
  owasp: string;
}> = [
  {
    key: 'untrusted_content_delimiter',
    label: 'Untrusted Content Isolation (<untrusted_retrieved_data>)',
    description: 'Wraps retrieved documents in passive data tags and strips embedded [SYSTEM OVERRIDE] blocks.',
    owasp: 'OWASP-AA01',
  },
  {
    key: 'enforce_tool_rbac',
    label: 'Strict Tool-Level RBAC & Domain Allowlist',
    description: 'Blocks delete_file_mock, run_command_mock, and external email exfiltration outside the LLM.',
    owasp: 'OWASP-AA02 / AA05',
  },
  {
    key: 'least_privilege_records',
    label: 'Session-Scoped Least Privilege Record ACL & DLP',
    description: 'Denies access to admin_confidential records regardless of claimed role.',
    owasp: 'OWASP-AA03',
  },
  {
    key: 'isolate_session_memory',
    label: 'Cross-Session Persistent Memory Isolation',
    description: 'Quarantines untrusted memory writes so Session A cannot contaminate Session B.',
    owasp: 'OWASP-AA06',
  },
  {
    key: 'require_human_approval',
    label: 'Out-of-Band Human Approval Gate',
    description: 'Requires verified human authorization token before high-impact communications or state changes.',
    owasp: 'OWASP-AA09',
  },
  {
    key: 'enforce_call_budget_and_trust',
    label: 'Call Budget Controller & Signed Tool/Agent Manifest',
    description: 'Caps per-turn tool invocations (max 4) and rejects unsigned inter-agent or shadow plugin calls.',
    owasp: 'OWASP-AA04 / AA07 / AA08 / AA10',
  },
];

export const RunTestPage: React.FC<RunTestPageProps> = ({
  agents,
  scenarios,
  defaultExecutionMode,
  defaultLlmProvider,
  defaultLlmModel,
  onStartCampaign,
  onUpdateAgentPolicy,
  onApplyPreset,
  isLaunching,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    agents[0]?.id || 'agt-docuassist-vuln'
  );
  const [campaignName, setCampaignName] = useState<string>('');
  const [selectedCodes, setSelectedCodes] = useState<string[]>(
    scenarios.filter((s) => s.category !== 'Benign Baseline').map((s) => s.code)
  );
  const [includeBenign, setIncludeBenign] = useState<boolean>(true);
  const [enableAdaptive, setEnableAdaptive] = useState<boolean>(true);
  const [executionMode, setExecutionMode] = useState<'deterministic' | 'hybrid_llm'>(
    defaultExecutionMode
  );
  const [maxSteps, setMaxSteps] = useState<number>(16);
  const [timeBudget, setTimeBudget] = useState<number>(60);
  const [llmProvider, setLlmProvider] = useState<string>(defaultLlmProvider);
  const [llmModel, setLlmModel] = useState<string>(defaultLlmModel);
  const [isSavingPolicy, setIsSavingPolicy] = useState<boolean>(false);

  useEffect(() => {
    setExecutionMode(defaultExecutionMode);
    setLlmProvider(defaultLlmProvider);
    setLlmModel(defaultLlmModel);
  }, [defaultExecutionMode, defaultLlmProvider, defaultLlmModel]);

  const activeAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
  const adversarialScenarios = scenarios.filter((s) => s.category !== 'Benign Baseline');

  const toggleScenario = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleToggleControl = async (key: keyof PolicyConfig) => {
    if (!activeAgent) return;
    setIsSavingPolicy(true);
    try {
      const updated: PolicyConfig = {
        ...activeAgent.policy_config,
        profile_name: 'CUSTOM_INTERACTIVE_POSTURE',
        [key]: !activeAgent.policy_config[key],
      };
      await onUpdateAgentPolicy(activeAgent.id, updated);
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAgent) return;
    const modelLabel = llmModel.trim() || defaultLlmModel || activeAgent.name;
    const effectiveName =
      campaignName.trim() || `Security Assessment — ${modelLabel}`;
    await onStartCampaign({
      agent_id: activeAgent.id,
      name: effectiveName,
      scenario_codes: selectedCodes,
      include_benign_baseline: includeBenign,
      enable_adaptive_followups: enableAdaptive,
      execution_mode: executionMode,
      max_steps: maxSteps,
      time_budget_seconds: timeBudget,
      llm_config: { provider: llmProvider, model: modelLabel },
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Editorial Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#1F1F23]">
        <div>
          <span className="font-cursive-italic text-lg text-[#FFD444]">
            Target Configuration & Vulnerability Scope
          </span>
          <h1 className="font-serif-display text-2xl sm:text-3xl text-white font-normal mt-0.5">
            Autonomous Red-Team Directive
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="ab-input px-4 py-2.5 text-xs font-medium min-w-[260px]"
          >
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {llmModel || defaultLlmModel || ag.name} ({ag.policy_config.profile_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleLaunch} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          {/* Left Column: Target Agent Profile & Defense Posture */}
          <div className="lg:col-span-5 space-y-6">
            <div className="ab-card p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1F1F23] pb-3">
                <div>
                  <span className="font-cursive-italic text-base text-[#FFD444]">
                    Target laboratory environment
                  </span>
                  <h2 className="font-serif-display text-lg text-white">
                    Agent Boundary & Mock Tools
                  </h2>
                </div>
                <Cpu className="w-4 h-4 text-[#FFD444]" />
              </div>

              {activeAgent && (
                <>
                  <div className="p-4 rounded-xl bg-[#111114] border border-[#242429] space-y-2">
                    <div className="font-cursive-italic text-base text-[#FFD444]">
                      Stated system instruction
                    </div>
                    <p className="text-sm text-white leading-relaxed">
                      "{activeAgent.system_goal}"
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-cursive-italic text-base text-[#A1A1AA]">
                        Connected sandbox tools ({activeAgent.tools?.length || 6})
                      </span>
                      <Wrench className="w-3.5 h-3.5 text-[#FFD444]" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(activeAgent.tools || []).map((t) => (
                        <div
                          key={t.tool_name}
                          className="p-3 rounded-xl bg-[#111114] border border-[#242429] flex items-center justify-between gap-2"
                        >
                          <span className="text-xs font-mono text-white truncate">
                            {t.tool_name}
                          </span>
                          <SeverityBadge severity={t.risk_level} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sandbox Defense Controls Toggle Matrix */}
            {activeAgent && (
              <div className="ab-card p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-[#1F1F23] pb-3">
                  <div>
                    <span className="font-cursive-italic text-base text-[#FFD444]">
                      Independent policy guard
                    </span>
                    <h2 className="font-serif-display text-lg text-white">
                      Active Security Controls
                    </h2>
                  </div>
                  <span className="px-3 py-1 rounded-lg border border-[#FFD444] text-xs text-white font-mono">
                    {activeAgent.policy_config.profile_name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    disabled={isSavingPolicy}
                    onClick={() => onApplyPreset(activeAgent.id, 'unprotected')}
                    className="ab-btn-outline py-2.5 px-3 text-xs flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-3.5 h-3.5 text-[#FFD444]" />
                    <span>Unprotected Profile</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingPolicy}
                    onClick={() => onApplyPreset(activeAgent.id, 'hardened')}
                    className="ab-btn-primary py-2.5 px-3 text-xs flex items-center justify-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#FFD444]" />
                    <span>Hardened Profile</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {DEFENSE_CONTROLS_META.map((ctrl) => {
                    const enabled = Boolean(activeAgent.policy_config[ctrl.key]);
                    return (
                      <div
                        key={ctrl.key}
                        onClick={() => handleToggleControl(ctrl.key)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          enabled
                            ? 'bg-[#14120A] border-[#FFD444]'
                            : 'bg-[#111114] border-[#242429] hover:border-[#3F3F46]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium text-white">
                            {ctrl.label}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium ${
                              enabled
                                ? 'bg-[#FFD444] text-black'
                                : 'bg-[#1C1C20] text-[#A1A1AA]'
                            }`}
                          >
                            {enabled ? 'Active' : 'Off'}
                          </span>
                        </div>
                        <p className="text-xs text-[#A1A1AA] mt-1.5 leading-relaxed">
                          {ctrl.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Execution Budgets & OWASP 2026 Scenarios */}
          <div className="lg:col-span-7 space-y-6">
            <div className="ab-card p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#1F1F23] pb-3">
                <div>
                  <span className="font-cursive-italic text-base text-[#FFD444]">
                    Campaign execution guardrails
                  </span>
                  <h2 className="font-serif-display text-lg text-white">
                    Engine Mode & Resource Budgets
                  </h2>
                </div>
                <Sliders className="w-4 h-4 text-[#FFD444]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block font-cursive-italic text-base text-[#D4D4D8]">
                    Execution mode
                  </label>
                  <select
                    value={executionMode}
                    onChange={(e) =>
                      setExecutionMode(e.target.value as 'deterministic' | 'hybrid_llm')
                    }
                    className="ab-input w-full px-4 py-2.5 text-xs"
                  >
                    <option value="deterministic">
                      Deterministic Engine (Rule-Based Sandbox)
                    </option>
                    <option value="hybrid_llm">
                      Hybrid Live LLM Mode (Ollama / OpenAI / Gemini)
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block font-cursive-italic text-base text-[#D4D4D8]">
                    Step & time limits ({maxSteps} steps • {timeBudget}s)
                  </label>
                  <div className="flex items-center gap-4 pt-2">
                    <input
                      type="range"
                      min={4}
                      max={30}
                      value={maxSteps}
                      onChange={(e) => setMaxSteps(Number(e.target.value))}
                      className="w-full accent-[#FFD444]"
                    />
                    <input
                      type="range"
                      min={15}
                      max={180}
                      step={15}
                      value={timeBudget}
                      onChange={(e) => setTimeBudget(Number(e.target.value))}
                      className="w-full accent-[#FFD444]"
                    />
                  </div>
                </div>
              </div>

              {executionMode === 'hybrid_llm' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#14120A] border border-[#FFD444]">
                  <div className="space-y-1.5">
                    <label className="block text-xs text-[#FFD444]">LLM Provider</label>
                    <select
                      value={llmProvider}
                      onChange={(e) => setLlmProvider(e.target.value)}
                      className="ab-input w-full px-3.5 py-2 text-xs"
                    >
                      <option value="openrouter">OpenRouter API (Live LLM)</option>
                      <option value="ollama">Local Ollama (http://localhost:11434)</option>
                      <option value="openai">OpenAI Endpoint</option>
                      <option value="gemini">Google Gemini API</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs text-[#FFD444]">Model Name</label>
                    <input
                      type="text"
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      className="ab-input w-full px-3.5 py-2 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white">
                  <input
                    type="checkbox"
                    checked={enableAdaptive}
                    onChange={(e) => setEnableAdaptive(e.target.checked)}
                    className="accent-[#FFD444] w-4 h-4"
                  />
                  <span>Enable adaptive follow-up attack generation</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white">
                  <input
                    type="checkbox"
                    checked={includeBenign}
                    onChange={(e) => setIncludeBenign(e.target.checked)}
                    className="accent-[#FFD444] w-4 h-4"
                  />
                  <span>Include 3 benign baseline verification tasks</span>
                </label>
              </div>
            </div>

            {/* OWASP 2026 Scenario Modules */}
            <div className="ab-card p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F1F23] pb-3">
                <div>
                  <span className="font-cursive-italic text-base text-[#FFD444]">
                    OWASP Agentic Top 10 (2026)
                  </span>
                  <h2 className="font-serif-display text-lg text-white">
                    Adversarial Scenarios ({selectedCodes.length} selected)
                  </h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCodes(adversarialScenarios.map((s) => s.code))}
                    className="ab-btn-outline px-3.5 py-2 text-xs"
                  >
                    Select All 10 Categories
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCodes(['PI-INDIRECT-01', 'TM-DELETE-01', 'DL-PRIV-01', 'MP-CROSS-01'])
                    }
                    className="ab-btn-outline px-3.5 py-2 text-xs"
                  >
                    Priority Core Suite (4)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {adversarialScenarios.map((scen) => {
                  const isChecked = selectedCodes.includes(scen.code);
                  return (
                    <div
                      key={scen.code}
                      onClick={() => toggleScenario(scen.code)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-[#14120A] border-[#FFD444]'
                          : 'bg-[#111114] border-[#242429] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#FFD444] shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-[#52525B] shrink-0" />
                          )}
                          <span className="text-xs font-mono text-[#FFD444]">
                            {scen.code}
                          </span>
                        </div>
                        <SeverityBadge severity={scen.base_severity} />
                      </div>
                      <div className="text-sm font-medium text-white mt-2">
                        {scen.name}
                      </div>
                      <p className="text-xs text-[#A1A1AA] mt-1.5 line-clamp-2 leading-relaxed">
                        {scen.test_definition.objective}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Directive Bar */}
        <div className="p-3 rounded-2xl bg-[#111114] border border-[#2B2B32] focus-within:border-[#FFD444] flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5 flex-1 pl-2">
            <Paperclip className="w-5 h-5 text-[#A1A1AA] shrink-0" />
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Enter campaign directive name (optional) and press Launch..."
              className="w-full bg-transparent text-white text-sm outline-none placeholder:text-[#71717A]"
            />
          </div>

          <button
            type="submit"
            disabled={isLaunching || selectedCodes.length === 0}
            className="px-5 py-3 rounded-xl bg-[#FFD444] text-black font-semibold text-xs flex items-center gap-2 hover:bg-[#ffe074] transition-all shrink-0"
          >
            <span>{isLaunching ? 'Executing Directive...' : 'Launch Campaign'}</span>
            <ArrowUp className="w-4 h-4 text-black" />
          </button>
        </div>
      </form>
    </div>
  );
};
