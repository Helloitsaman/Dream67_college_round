import React, { useState } from 'react';
import {
  CheckCircle,
  Filter,
  GitCompare,
  KeyRound,
  ShieldAlert,
  Terminal,
  Wrench,
} from 'lucide-react';
import { Finding, TestRun } from '../types';
import { OutcomeBadge, SeverityBadge } from '../components/SeverityBadge';

interface FindingsPageProps {
  runs: TestRun[];
  selectedRunId: string;
  onSelectRun: (runId: string) => void;
  findings: Finding[];
  onInspectTrace: (runId: string, testCaseId: string) => void;
  onUpdateStatus: (findingId: string, status: Finding['status']) => Promise<void>;
  onTriggerReplay: (runId: string) => Promise<void>;
  isReplaying: boolean;
}

export const FindingsPage: React.FC<FindingsPageProps> = ({
  runs,
  selectedRunId,
  onSelectRun,
  findings,
  onInspectTrace,
  onUpdateStatus,
  onTriggerReplay,
  isReplaying,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const runFindings = findings.filter((f) => {
    if (selectedRunId && f.run_id !== selectedRunId) return false;
    if (severityFilter !== 'ALL' && f.severity !== severityFilter) return false;
    if (categoryFilter !== 'ALL' && f.category !== categoryFilter) return false;
    return true;
  });

  const categories = Array.from(new Set(findings.map((f) => f.category)));

  return (
    <div className="space-y-8">
      {/* Top Editorial Header & Spacious Filter Controls */}
      <div className="space-y-6 pb-6 border-b border-[#1F1F23]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-cursive-italic text-lg text-[#FFD444]">
              Deterministic Policy Evidence & Remediation
            </span>
            <h1 className="font-serif-display text-2xl sm:text-3xl text-white font-normal mt-0.5">
              Confirmed Security Findings ({runFindings.length})
            </h1>
          </div>

          {selectedRunId && (
            <button
              onClick={() => onTriggerReplay(selectedRunId)}
              disabled={isReplaying}
              className="ab-btn-primary px-5 py-2.5 text-xs flex items-center gap-2.5"
            >
              <GitCompare className="w-4 h-4 text-[#FFD444]" />
              <span>{isReplaying ? 'Validating Defenses...' : 'Mitigate All & Replay'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block font-cursive-italic text-base text-[#A1A1AA]">
              Campaign run
            </label>
            <select
              value={selectedRunId}
              onChange={(e) => onSelectRun(e.target.value)}
              className="ab-input w-full px-4 py-2.5 text-xs"
            >
              {runs.length === 0 ? (
                <option value="">No campaigns recorded yet</option>
              ) : (
                runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.metrics_summary?.confirmed_vulnerabilities ?? 0} findings)
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-cursive-italic text-base text-[#A1A1AA]">
              Severity tier
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="ab-input w-full px-4 py-2.5 text-xs"
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-cursive-italic text-base text-[#A1A1AA]">
              OWASP 2026 category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="ab-input w-full px-4 py-2.5 text-xs"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Findings List */}
      {runFindings.length === 0 ? (
        <div className="ab-card p-12 text-center space-y-3">
          <CheckCircle className="w-8 h-8 text-[#FFD444] mx-auto" />
          <div className="font-serif-display text-xl text-white">
            No Confirmed Findings
          </div>
          <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
            {runs.length === 0
              ? 'Run a campaign first to evaluate target security boundaries and record findings.'
              : 'All adversarial test scenarios in this campaign were intercepted at the sandbox policy boundary.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {runFindings.map((finding) => {
            const ev = finding.evidence;
            return (
              <div key={finding.id} className="ab-card p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1F1F23] pb-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <SeverityBadge severity={finding.severity} />
                      <span className="px-3 py-1 rounded-lg text-xs font-mono bg-[#141418] text-[#FFD444] border border-[#2B2B32]">
                        {finding.owasp_id} • {finding.category}
                      </span>
                      <OutcomeBadge outcome={ev.outcome} />
                    </div>
                    <h2 className="font-serif-display text-xl text-white pt-1">
                      {finding.title}
                    </h2>
                    <div className="text-xs text-[#A1A1AA]">
                      Affected Component:{' '}
                      <span className="text-white font-medium">{finding.affected_component}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={finding.status}
                      onChange={(e) =>
                        onUpdateStatus(finding.id, e.target.value as Finding['status'])
                      }
                      className="ab-input px-3.5 py-2 text-xs"
                    >
                      <option value="Open">Status: Open</option>
                      <option value="Reproduced">Status: Reproduced</option>
                      <option value="Mitigated">Status: Mitigated</option>
                      <option value="Accepted">Status: Accepted</option>
                    </select>

                    <button
                      onClick={() => onInspectTrace(finding.run_id, finding.test_case_id)}
                      className="ab-btn-primary px-4 py-2 text-xs flex items-center gap-2"
                    >
                      <Terminal className="w-3.5 h-3.5 text-[#FFD444]" />
                      <span>Open Exploit Trace</span>
                    </button>
                  </div>
                </div>

                {/* Evidence & Remediation Split */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="p-5 rounded-xl bg-[#111114] border border-[#242429] space-y-3.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#FFD444]">
                      <ShieldAlert className="w-4 h-4" />
                      <span className="font-cursive-italic text-base">
                        Deterministic boundary evidence
                      </span>
                    </div>
                    <p className="text-xs text-white leading-relaxed">{ev.impact_rationale}</p>

                    {ev.leaked_canaries && ev.leaked_canaries.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-[#18150A] border border-[#FFD444] text-xs text-white flex items-center gap-2.5">
                        <KeyRound className="w-4 h-4 text-[#FFD444] shrink-0" />
                        <span>
                          Exposed Canary Secrets:{' '}
                          <strong className="text-[#FFD444] font-mono">
                            {ev.leaked_canaries.join(', ')}
                          </strong>
                        </span>
                      </div>
                    )}

                    {ev.executed_unauthorized_actions && ev.executed_unauthorized_actions.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-[#A1A1AA]">
                          Unauthorized Tool Calls Executed ({ev.executed_unauthorized_actions.length}):
                        </div>
                        {ev.executed_unauthorized_actions.map((act, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-[#0B0B0D] border border-[#242429] text-xs text-white"
                          >
                            <span className="text-[#FFD444] font-mono font-medium">
                              {String(act.tool_name)}
                            </span>
                            : {String(act.reason)}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-[#A1A1AA] pt-1">
                      Verification: <span className="text-white">{ev.evidence_confidence}</span>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-[#111114] border border-[#242429] space-y-3.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#FFD444]">
                      <Wrench className="w-4 h-4" />
                      <span className="font-cursive-italic text-base">
                        Remediation & safe reproduction
                      </span>
                    </div>
                    <p className="text-xs text-white leading-relaxed">
                      {finding.remediation}
                    </p>

                    <div className="pt-3 border-t border-[#1F1F23] space-y-2">
                      <div className="text-xs text-[#FFD444] flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5" />
                        <span>Reproducible Lab Steps:</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-[#D4D4D8]">
                        {(ev.reproduction_steps || []).map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
