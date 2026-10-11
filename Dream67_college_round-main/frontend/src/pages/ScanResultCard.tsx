import React from 'react';
import { Terminal, ShieldCheck, ShieldAlert, Database } from 'lucide-react';
import { ScanResult } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

interface ScanResultCardProps {
  result: ScanResult;
  onInspectTrace?: () => void;
}

const Tile: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="ab-card p-5">
    <p className="text-xs uppercase tracking-wider text-[#A1A1AA]">{label}</p>
    <div className="mt-2 text-lg font-semibold">{children}</div>
  </div>
);

export const ScanResultCard: React.FC<ScanResultCardProps> = ({
  result,
  onInspectTrace,
}) => {
  const breached = result.attack_success;
  const metrics = result.metrics || {
    tool_attempts: 0,
    unauthorized_executions: 0,
    blocked_attempts: 0,
    canary_exposed: false,
    iterations_limited: false,
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Tile label="Attack">
          <span className={breached ? 'text-[#FFD444]' : 'text-white'}>
            {breached ? 'Succeeded' : 'Not observed'}
          </span>
        </Tile>
        <Tile label="Severity">
          <SeverityBadge severity={result.finding.severity === 'high' ? 'High' : 'Low'} />
        </Tile>
        <Tile label="Canary leaked">
          <span className={metrics.canary_exposed ? 'text-[#FFD444]' : 'text-white'}>
            {metrics.canary_exposed ? 'Yes' : 'No'}
          </span>
        </Tile>
        <Tile label="Persisted">
          {result.persisted === undefined ? (
            <span className="text-[#71717A]">—</span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#FFD444]" />
              {result.persisted ? 'Saved' : 'Not saved'}
            </span>
          )}
        </Tile>
      </section>

      {result.persist_error && (
        <div className="rounded-xl border border-[#FFD444] bg-[#14120A] p-4 text-xs text-white font-mono">
          persist_error: {result.persist_error}
        </div>
      )}

      <section className="ab-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          {breached ? (
            <ShieldAlert className="w-5 h-5 text-[#FFD444]" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-[#FFD444]" />
          )}
          <h2 className="font-serif-display text-xl">Security finding</h2>
        </div>
        <p className="font-medium">{result.finding.title}</p>
        <p className="text-sm text-[#A1A1AA]">{result.finding.evidence}</p>
        {result.final_answer && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#111114] border border-[#242429] text-xs text-[#D4D4D8] whitespace-pre-wrap">
            <span className="text-[#FFD444] font-cursive-italic text-sm block mb-1">
              Agent Final Response:
            </span>
            {result.final_answer}
          </div>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-1 pt-2 text-xs text-[#71717A]">
          <span>Outcome: {result.outcome}</span>
          <span>Mode: {result.agent_mode}</span>
          <span>Scenario: {result.scenario}</span>
          {result.document_source && <span>Document: {result.document_source}</span>}
          {result.model && <span>Model: {result.model}</span>}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Tile label="Tool attempts">{metrics.tool_attempts}</Tile>
        <Tile label="Unauthorized exec">{metrics.unauthorized_executions}</Tile>
        <Tile label="Blocked">{metrics.blocked_attempts}</Tile>
        <Tile label="Trace steps">{result.events?.length ?? result.step_count ?? 0}</Tile>
      </section>

      {result.events && result.events.length > 0 && (
        <section className="ab-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-display text-xl">Execution Trace Steps</h2>
            {onInspectTrace && (
              <button
                onClick={onInspectTrace}
                className="ab-btn-outline px-4 py-2 text-xs flex items-center gap-2"
              >
                <Terminal className="w-3.5 h-3.5 text-[#FFD444]" />
                Open in Full Trace Timeline
              </button>
            )}
          </div>
          <div className="space-y-3">
            {result.events.map((ev) => (
              <div
                key={ev.step}
                className={`border-l-2 pl-4 py-1 ${
                  ev.type === 'tool_executed' || ev.type === 'tool_attempt'
                    ? 'border-[#FFD444]'
                    : 'border-[#2E2E34]'
                }`}
              >
                <p className="text-xs font-mono text-[#FFD444]">
                  Step {ev.step} · {ev.type}
                </p>
                <p className="mt-1 text-sm text-white">{ev.message}</p>
                {ev.details && Object.keys(ev.details).length > 0 && (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-[#0A0A0C] border border-[#1A1A1E] p-3 text-xs text-[#A1A1AA] font-mono">
                    {JSON.stringify(ev.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-[#52525B]">Run ID: {result.run_id}</p>
    </div>
  );
};
