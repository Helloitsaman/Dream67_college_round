import React, { useState } from 'react';
import { Play, Beaker, Loader2 } from 'lucide-react';
import { AgentMode, ScanResult, ScenarioKind } from '../types';
import { api } from '../services/api';
import { ScanResultCard } from './ScanResultCard';

interface RunScanPageProps {
  onScanComplete: (result: ScanResult) => void;
  onInspectTrace: () => void;
}

export const RunScanPage: React.FC<RunScanPageProps> = ({
  onScanComplete,
  onInspectTrace,
}) => {
  const [agentMode, setAgentMode] = useState<AgentMode>('vulnerable');
  const [scenario, setScenario] = useState<ScenarioKind>('injection');
  const [document, setDocument] = useState('');
  const [task, setTask] = useState('');

  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState<'real' | 'demo' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runReal() {
    setLoading('real');
    setError(null);
    try {
      const data = await api.runRealScan({
        agent_mode: agentMode,
        scenario,
        document: document.trim() || null,
        task: task.trim() || null,
      });
      setResult(data);
      onScanComplete(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Real scan failed.');
    } finally {
      setLoading(null);
    }
  }

  async function runDemo() {
    setLoading('demo');
    setError(null);
    try {
      const data = await api.runDemoScan({ agent_mode: agentMode });
      setResult(data);
      onScanComplete(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo scan failed.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif-display text-3xl text-white">
          Configure &amp; Run Scan
        </h1>
        <p className="font-cursive-italic text-lg text-[#FFD444]">
          Probe the target agent with an untrusted document and watch the oracle.
        </p>
      </header>

      <section className="ab-card p-7 space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
              Target configuration
            </label>
            <select
              value={agentMode}
              onChange={(e) => setAgentMode(e.target.value as AgentMode)}
              className="ab-input w-full p-3 text-sm"
            >
              <option value="vulnerable">Vulnerable agent (weak guardrails)</option>
              <option value="protected">Protected agent (trust boundary enforced)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
              Scenario
            </label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as ScenarioKind)}
              className="ab-input w-full p-3 text-sm"
            >
              <option value="injection">Indirect prompt injection</option>
              <option value="benign">Benign baseline</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
            Task instruction (optional)
          </label>
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Default: summarize the quarterly report and list its milestones"
            className="ab-input w-full p-3 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
            Untrusted document (optional)
          </label>
          <textarea
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            rows={6}
            placeholder="Paste document content to test. It is treated as untrusted retrieved content and sent to the agent on a real scan. Leave empty to use the built-in scenario."
            className="ab-input w-full p-3 font-mono text-xs"
          />
          <p className="text-xs text-[#71717A]">
            Only the real scan uses this. The scripted demo always runs the built-in scenario.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={runReal}
            disabled={loading !== null}
            className="ab-btn-solid px-6 py-3 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {loading === 'real' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {loading === 'real' ? 'Running Real Scan...' : 'Run Real AI Scan'}
          </button>

          <button
            onClick={runDemo}
            disabled={loading !== null}
            className="ab-btn-primary px-6 py-3 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {loading === 'demo' ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#FFD444]" />
            ) : (
              <Beaker className="w-4 h-4 text-[#FFD444]" />
            )}
            {loading === 'demo' ? 'Running...' : 'Run Scripted Demo'}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-[#FFD444] bg-[#14120A] p-4 text-sm text-white">
            {error}
          </div>
        )}
      </section>

      {result && (
        <ScanResultCard result={result} onInspectTrace={onInspectTrace} />
      )}
    </div>
  );
};
