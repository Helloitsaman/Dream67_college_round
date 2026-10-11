import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  Lock,
  Play,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { ReplayRun, TestRun } from '../types';
import { OutcomeBadge } from '../components/SeverityBadge';
import { api } from '../services/api';

interface DefenseComparisonPageProps {
  runs: TestRun[];
  replays: ReplayRun[];
  selectedRunId: string;
  onSelectRun: (runId: string) => void;
  onExecuteReplay: (
    originalRunId: string,
    defenses: Record<string, boolean>,
    permanent: boolean
  ) => Promise<void>;
  onInspectTrace: (runId: string, testCaseId: string) => void;
  isReplaying: boolean;
}

export const DefenseComparisonPage: React.FC<DefenseComparisonPageProps> = ({
  runs,
  replays,
  selectedRunId,
  onSelectRun,
  onExecuteReplay,
  onInspectTrace,
  isReplaying,
}) => {
  const [defenses, setDefenses] = useState<Record<string, boolean>>({
    untrusted_content_delimiter: true,
    enforce_tool_rbac: true,
    least_privilege_records: true,
    isolate_session_memory: true,
    require_human_approval: true,
    enforce_call_budget_and_trust: true,
  });
  const [persistPolicy, setPersistPolicy] = useState<boolean>(false);
  const [markdownReport, setMarkdownReport] = useState<string | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);

  const activeReplay =
    replays.find((r) => r.original_run_id === selectedRunId) ||
    replays.find((r) => r.mitigated_run_id === selectedRunId) ||
    replays[0] ||
    null;

  const toggleDefense = (key: string) => {
    setDefenses((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLoadReport = async (runId: string) => {
    if (!runId) return;
    setIsLoadingReport(true);
    try {
      const res = await api.getReport(runId);
      setMarkdownReport(res.markdown_report);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const comp = activeReplay?.comparison_summary;

  return (
    <div className="space-y-8">
      {/* Top Editorial Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#1F1F23]">
        <div>
          <span className="font-cursive-italic text-lg text-[#FFD444]">
            Defense Validation & Regression Replay
          </span>
          <h1 className="font-serif-display text-2xl sm:text-3xl text-white font-normal mt-0.5">
            Before vs. After Mitigation Comparison
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          <select
            value={selectedRunId}
            onChange={(e) => onSelectRun(e.target.value)}
            className="ab-input px-4 py-2.5 text-xs min-w-[240px]"
          >
            {runs.length === 0 ? (
              <option value="">No campaigns recorded yet</option>
            ) : (
              runs
                .filter((r) => !r.name.startsWith('[Mitigated Replay]'))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.metrics_summary?.attack_success_rate ?? 0}% ASR)
                  </option>
                ))
            )}
          </select>

          {selectedRunId && (
            <button
              onClick={() => handleLoadReport(activeReplay?.mitigated_run_id || selectedRunId)}
              disabled={isLoadingReport}
              className="ab-btn-outline px-4 py-2.5 text-xs flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5 text-[#FFD444]" />
              <span>{isLoadingReport ? 'Generating...' : 'Export Markdown Report'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Defense Control Matrix */}
      <div className="ab-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F1F23] pb-4">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-[#FFD444]" />
            <div>
              <span className="font-cursive-italic text-base text-[#FFD444] block">
                Mitigation policy configuration
              </span>
              <h2 className="font-serif-display text-lg text-white">
                Select Security Controls to Apply & Replay
              </h2>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer">
            <input
              type="checkbox"
              checked={persistPolicy}
              onChange={(e) => setPersistPolicy(e.target.checked)}
              className="accent-[#FFD444] w-4 h-4"
            />
            <span>Persist hardened policy to target agent in MongoDB</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              key: 'untrusted_content_delimiter',
              title: 'Untrusted Data Delimiter & Directive Strip',
              sub: 'Neutralizes indirect prompt injections in external documents',
            },
            {
              key: 'enforce_tool_rbac',
              title: 'Sandbox Tool-Level RBAC',
              sub: 'Blocks delete_file_mock, run_command_mock, and external emails',
            },
            {
              key: 'least_privilege_records',
              title: 'Least-Privilege Record ACL & DLP',
              sub: 'Protects restricted admin records and confidential tokens',
            },
            {
              key: 'isolate_session_memory',
              title: 'Cross-Session Memory Partitioning',
              sub: 'Prevents Session A rules from contaminating Session B',
            },
            {
              key: 'require_human_approval',
              title: 'Human-in-the-Loop Approval Gate',
              sub: 'Requires verified approval token for high-impact actions',
            },
            {
              key: 'enforce_call_budget_and_trust',
              title: 'Call Budget & Signed Manifest Guard',
              sub: 'Stops recursive tool loops and unverified peer/plugin calls',
            },
          ].map((item) => {
            const on = Boolean(defenses[item.key]);
            return (
              <div
                key={item.key}
                onClick={() => toggleDefense(item.key)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  on
                    ? 'bg-[#14120A] border-[#FFD444]'
                    : 'bg-[#111114] border-[#242429] hover:border-[#3F3F46]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-white">{item.title}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium ${
                      on ? 'bg-[#FFD444] text-black' : 'bg-[#1C1C20] text-[#A1A1AA]'
                    }`}
                  >
                    {on ? 'Enabled' : 'Off'}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] mt-1.5 leading-relaxed">{item.sub}</p>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => onExecuteReplay(selectedRunId, defenses, persistPolicy)}
            disabled={isReplaying || !selectedRunId}
            className="ab-btn-solid px-6 py-3 text-xs flex items-center gap-2.5 disabled:opacity-40"
          >
            <Play className="w-4 h-4 text-black" />
            <span>
              {isReplaying
                ? 'Replaying Campaign Against Hardened Sandbox...'
                : 'Execute Defense Validation Replay'}
            </span>
          </button>
        </div>
      </div>

      {/* Before vs After Summary KPI Cards */}
      {comp ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="ab-card p-6">
              <div className="font-cursive-italic text-base text-[#A1A1AA]">
                Attack success rate (Before vs. After)
              </div>
              <div className="flex items-baseline gap-3 mt-3">
                <span className="text-lg text-[#A1A1AA] line-through">{comp.original_asr}%</span>
                <span className="text-3xl font-semibold text-[#FFD444]">
                  {comp.mitigated_asr}%
                </span>
              </div>
              <div className="text-xs text-[#A1A1AA] mt-2">
                Reduced ASR by {comp.asr_reduction_points} percentage points
              </div>
            </div>

            <div className="ab-card p-6">
              <div className="font-cursive-italic text-base text-[#A1A1AA]">
                Defense blocking rate
              </div>
              <div className="text-3xl font-semibold text-white mt-3">
                {comp.defense_blocking_rate}%
              </div>
              <div className="text-xs text-[#A1A1AA] mt-2">
                Previously exploited attacks neutralized
              </div>
            </div>

            <div className="ab-card p-6">
              <div className="font-cursive-italic text-base text-[#A1A1AA]">
                Regression pass rate
              </div>
              <div className="text-3xl font-semibold text-white mt-3">
                {comp.regression_pass_rate}%
              </div>
              <div className="text-xs text-[#A1A1AA] mt-2">
                Vulnerabilities resolved ({comp.original_vulnerabilities} to{' '}
                {comp.mitigated_vulnerabilities})
              </div>
            </div>

            <div className="ab-card p-6">
              <div className="font-cursive-italic text-base text-[#A1A1AA]">
                Benign task preservation
              </div>
              <div className="text-3xl font-semibold text-[#FFD444] mt-3">
                {comp.mitigated_benign_rate}%
              </div>
              <div className="text-xs text-[#A1A1AA] mt-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FFD444]" />
                <span>Legitimate Q3 summaries still pass</span>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="ab-card p-6">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#1F1F23]">
              <div>
                <span className="font-cursive-italic text-base text-[#FFD444]">
                  Side-by-side outcome verification
                </span>
                <h2 className="font-serif-display text-xl text-white">
                  Scenario Replay Matrix
                </h2>
              </div>
              <CheckCircle2 className="w-4 h-4 text-[#FFD444]" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#242429] text-[#A1A1AA] text-xs">
                    <th className="py-3.5 px-4 font-medium">Scenario</th>
                    <th className="py-3.5 px-4 font-medium">Category</th>
                    <th className="py-3.5 px-4 font-medium">Original Outcome</th>
                    <th className="py-3.5 px-4 font-medium">Mitigated Outcome</th>
                    <th className="py-3.5 px-4 font-medium">Canary Status</th>
                    <th className="py-3.5 px-4 font-medium text-right">Traces</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C20]">
                  {comp.scenario_comparisons.map((row) => (
                    <tr key={row.scenario_code} className="hover:bg-[#121215] transition-colors">
                      <td className="py-4 px-4 text-white font-medium">
                        <span className="text-[#FFD444] font-mono text-xs mr-2">
                          {row.scenario_code}
                        </span>
                        {row.scenario_name}
                      </td>
                      <td className="py-4 px-4 text-[#D4D4D8]">
                        {row.category}{' '}
                        <span className="text-[#A1A1AA] text-xs">({row.owasp_id})</span>
                      </td>
                      <td className="py-4 px-4">
                        <OutcomeBadge outcome={row.original_outcome} />
                      </td>
                      <td className="py-4 px-4">
                        <OutcomeBadge outcome={row.mitigated_outcome} />
                      </td>
                      <td className="py-4 px-4 text-xs">
                        {row.original_data_leaked && !row.mitigated_data_leaked ? (
                          <span className="text-[#FFD444] font-medium">
                            Leak Blocked
                          </span>
                        ) : row.mitigated_data_leaked ? (
                          <span className="px-2.5 py-1 rounded-md bg-[#FFD444] text-black font-semibold">
                            Still Leaking
                          </span>
                        ) : (
                          <span className="text-[#A1A1AA]">No Leak</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center gap-2.5">
                          <button
                            onClick={() =>
                              onInspectTrace(
                                activeReplay.original_run_id,
                                row.original_test_case_id
                              )
                            }
                            className="ab-btn-outline px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                          >
                            <Terminal className="w-3 h-3 text-[#FFD444]" />
                            <span>Before</span>
                          </button>
                          <button
                            onClick={() =>
                              onInspectTrace(
                                activeReplay.mitigated_run_id,
                                row.mitigated_test_case_id
                              )
                            }
                            className="ab-btn-primary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                          >
                            <Terminal className="w-3 h-3 text-[#FFD444]" />
                            <span>After</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="ab-card p-10 text-center text-xs text-[#A1A1AA]">
          Select a completed campaign run above and click "Execute Defense Validation Replay" to compare before and after mitigation outcomes.
        </div>
      )}

      {/* Markdown Security Report Viewer */}
      {markdownReport && (
        <div className="ab-card-active p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#2B2B32] pb-3">
            <div className="flex items-center gap-2.5 text-sm font-medium text-white">
              <Download className="w-4 h-4 text-[#FFD444]" />
              <span>Generated Security Evaluation Report (Markdown)</span>
            </div>
            <button
              onClick={() => setMarkdownReport(null)}
              className="ab-btn-outline px-3.5 py-1.5 text-xs"
            >
              Close Report
            </button>
          </div>
          <pre className="p-5 rounded-xl bg-[#09090B] border border-[#242429] text-xs font-mono text-white whitespace-pre-wrap overflow-x-auto max-h-96">
            {markdownReport}
          </pre>
        </div>
      )}
    </div>
  );
};
