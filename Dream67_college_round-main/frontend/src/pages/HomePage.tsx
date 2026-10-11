import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  Layers,
  Shield,
  Sliders,
  Terminal,
} from 'lucide-react';
import { SystemStatus } from '../types';

interface HomePageProps {
  executionMode: 'deterministic' | 'hybrid_llm';
  llmProvider: string;
  llmModel: string;
  ollamaBaseUrl: string;
  systemStatus: SystemStatus | null;
  onSaveExecutionMode: (config: {
    execution_mode: 'deterministic' | 'hybrid_llm';
    llm_provider: string;
    llm_model: string;
    ollama_base_url: string;
  }) => Promise<void>;
  onContinueToCampaign: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  executionMode,
  llmProvider,
  llmModel,
  ollamaBaseUrl,
  systemStatus,
  onSaveExecutionMode,
  onContinueToCampaign,
}) => {
  const [selectedMode, setSelectedMode] = useState<'deterministic' | 'hybrid_llm'>(executionMode);
  const [provider, setProvider] = useState<string>(llmProvider);
  const [model, setModel] = useState<string>(llmModel);
  const [baseUrl, setBaseUrl] = useState<string>(ollamaBaseUrl);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveExecutionMode({
        execution_mode: selectedMode,
        llm_provider: provider,
        llm_model: model,
        ollama_base_url: baseUrl,
      });
      onContinueToCampaign();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto py-4">
      {/* Editorial Welcome Header */}
      <div className="space-y-3 border-b border-[#1F1F23] pb-7">
        <span className="font-cursive-italic text-xl text-[#FFD444]">
          Autonomous AI Security Testing Platform
        </span>
        <h1 className="font-serif-display text-3xl sm:text-4xl text-white font-normal leading-tight">
          Select Execution Mode
        </h1>
        <p className="text-sm text-[#A1A1AA] max-w-2xl leading-relaxed pt-1">
          Choose how AgentBreak executes adversarial test campaigns against target agents and evaluates tool-permission boundaries. All results are calculated strictly from real runs stored in MongoDB.
        </p>
      </div>

      {/* Mode Selection Cards with Generous Spacing */}
      <form onSubmit={handleConfirm} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Deterministic Engine */}
          <div
            onClick={() => setSelectedMode('deterministic')}
            className={`p-7 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-6 ${
              selectedMode === 'deterministic'
                ? 'bg-[#14120A] border-[#FFD444] shadow-lg'
                : 'bg-[#0D0D0F] border-[#242429] hover:border-[#FFD444]/50'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl border border-[#FFD444] bg-[#09090B] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#FFD444]" />
                </div>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                    selectedMode === 'deterministic'
                      ? 'bg-[#FFD444] text-black border-[#FFD444]'
                      : 'bg-[#141417] text-[#A1A1AA] border-[#2B2B30]'
                  }`}
                >
                  {selectedMode === 'deterministic' ? 'Selected' : 'Select Mode'}
                </span>
              </div>

              <div>
                <span className="font-cursive-italic text-base text-[#FFD444]">
                  Repeatable rule-based sandbox
                </span>
                <h2 className="font-serif-display text-2xl text-white mt-0.5">
                  Deterministic Engine
                </h2>
              </div>

              <p className="text-xs text-[#D4D4D8] leading-relaxed">
                Executes multi-step attack scenarios and sandbox policy guards using deterministic state-machine rules. Requires zero external API keys and guarantees 100% reproducible traces across runs.
              </p>
            </div>

            <div className="pt-4 border-t border-[#242429] space-y-2 text-xs text-[#A1A1AA]">
              <div className="flex items-center gap-2 text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD444]" />
                <span>Zero external API key dependencies</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD444]" />
                <span>Full OWASP 2026 scenario & trace fidelity</span>
              </div>
            </div>
          </div>

          {/* Card 2: Hybrid LLM Engine */}
          <div
            onClick={() => setSelectedMode('hybrid_llm')}
            className={`p-7 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-6 ${
              selectedMode === 'hybrid_llm'
                ? 'bg-[#14120A] border-[#FFD444] shadow-lg'
                : 'bg-[#0D0D0F] border-[#242429] hover:border-[#FFD444]/50'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl border border-[#FFD444] bg-[#09090B] flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-[#FFD444]" />
                </div>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                    selectedMode === 'hybrid_llm'
                      ? 'bg-[#FFD444] text-black border-[#FFD444]'
                      : 'bg-[#141417] text-[#A1A1AA] border-[#2B2B30]'
                  }`}
                >
                  {selectedMode === 'hybrid_llm' ? 'Selected' : 'Select Mode'}
                </span>
              </div>

              <div>
                <span className="font-cursive-italic text-base text-[#FFD444]">
                  Live model + deterministic policy evaluator
                </span>
                <h2 className="font-serif-display text-2xl text-white mt-0.5">
                  Hybrid Live LLM Mode
                </h2>
              </div>

              <p className="text-xs text-[#D4D4D8] leading-relaxed">
                Connects target agent reasoning and adaptive attack variations to a live LLM endpoint (Ollama, OpenAI, or Gemini), while keeping the Sandbox Policy Guard and Security Evaluator strictly deterministic.
              </p>
            </div>

            <div className="pt-4 border-t border-[#242429] space-y-2 text-xs text-[#A1A1AA]">
              <div className="flex items-center gap-2 text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD444]" />
                <span>Supports Ollama, OpenAI & Gemini endpoints</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD444]" />
                <span>Independent deterministic boundary scoring</span>
              </div>
            </div>
          </div>
        </div>

        {/* Conditional LLM Configuration Panel when Hybrid LLM Mode is selected */}
        {selectedMode === 'hybrid_llm' && (
          <div className="ab-card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#1F1F23] pb-3">
              <div>
                <span className="font-cursive-italic text-base text-[#FFD444]">
                  Model endpoint parameters
                </span>
                <h3 className="font-serif-display text-lg text-white">
                  Configure Live LLM Provider
                </h3>
              </div>
              <Sliders className="w-4 h-4 text-[#FFD444]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="block font-cursive-italic text-base text-[#D4D4D8]">
                  Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="ab-input w-full px-4 py-2.5 text-xs"
                >
                  <option value="openrouter">OpenRouter API (Live LLM)</option>
                  <option value="ollama">Ollama (Local)</option>
                  <option value="openai">OpenAI API</option>
                  <option value="gemini">Google Gemini API</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-cursive-italic text-base text-[#D4D4D8]">
                  Model identifier
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. llama3, gpt-4o-mini, gemini-2.5-flash"
                  className="ab-input w-full px-4 py-2.5 text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block font-cursive-italic text-base text-[#D4D4D8]">
                  Endpoint URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="ab-input w-full px-4 py-2.5 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Current MongoDB Workspace State Strip */}
        <div className="ab-card p-6 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-[#FFD444]" />
              <div>
                <div className="text-xs text-[#A1A1AA]">Database</div>
                <div className="text-sm font-medium text-white">
                  MongoDB ({systemStatus?.mongodb_db_name || 'agentbreak'})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-[#FFD444]" />
              <div>
                <div className="text-xs text-[#A1A1AA]">Scenario Catalog</div>
                <div className="text-sm font-medium text-white">
                  {systemStatus?.counts.scenarios || 13} Modules Ready
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Terminal className="w-4 h-4 text-[#FFD444]" />
              <div>
                <div className="text-xs text-[#A1A1AA]">Recorded Runs</div>
                <div className="text-sm font-medium text-white">
                  {systemStatus?.counts.test_runs || 0} Runs • {systemStatus?.counts.findings || 0} Findings
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="ab-btn-solid px-6 py-3 text-xs flex items-center gap-2.5"
          >
            <span>
              {isSaving
                ? 'Applying Execution Mode...'
                : 'Confirm Execution Mode & Configure Campaign'}
            </span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
        </div>
      </form>
    </div>
  );
};
