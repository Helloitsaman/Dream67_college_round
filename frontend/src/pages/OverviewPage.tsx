import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  FileWarning,
  GitCompare,
  Lock,
  Play,
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import { CategoryVulnerabilityChart, SeverityDistributionChart } from '../charts/SecurityCharts';
import { OutcomeBadge, SeverityBadge } from '../components/SeverityBadge';
import { Finding, ReplayRun, TestRun } from '../types';
import { ActiveTab } from '../components/Navbar';

interface OverviewPageProps {
  runs: TestRun[];
  selectedRun: TestRun | null;
  onSelectRun: (runId: string) => void;
  findings: Finding[];
  replays: ReplayRun[];
  onNavigateTab: (tab: ActiveTab) => void;
  onInspectTrace: (runId: string, testCaseId: string) => void;
  onTriggerQuickReplay: (runId: string) => void;
  isReplaying: boolean;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  runs,
  selectedRun,
  onSelectRun,
  findings,
  replays,
  onNavigateTab,
  onInspectTrace,
  onTriggerQuickReplay,
  isReplaying,
}) => {
  if (runs.length === 0 || !selectedRun) {
    return (
      <div className="space-y-8">
        <div className="pb-6 border-b border-[#1F1F23]">
          <span className="font-cursive-italic text-lg text-[#FFD444]">
            Autonomous Red-Team Telemetry
          </span>
          <h1 className="font-serif-display text-2xl sm:text-3xl text-white font-normal mt-0.5">
            Security Evaluation Center
          </h1>
        </div>

        <div className="ab-card p-12 text-center space-y-5 max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-2xl border border-[#FFD444] bg-[#14120A] flex items-center justify-center mx-auto">
            <Activity className="w-6 h-6 text-[#FFD444]" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif-display text-2xl text-white">
              No Test Campaigns Recorded Yet
            </h2>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              The MongoDB workspace starts clean without pre-populated demo numbers. Launch an authorized security campaign to calculate real Attack Success Rates, traces, and findings.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-4">
            <button
              onClick={() => onNavigateTab('home')}
              className="ab-btn-outline px-5 py-2.5 text-xs"
            >
              Change Execution Mode
            </button>
            <button
              onClick={() => onNavigateTab('run')}
              className="ab-btn-solid px-5 py-2.5 text-xs flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 text-black" />
              <span>Configure & Run Campaign</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const metrics = selectedRun.metrics_summary;
  const runFindings = findings.filter((f) => f.run_id === selectedRun.id);
  const latestReplay = replays.find((r) => r.original_run_id === selectedRun.id);

  return (
    <div className="space-y-8">
      {/* Top Header Bar with Spacious Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#1F1F23]">
        <div>
          <span className="font-cursive-italic text-lg text-[#FFD444]">
            Autonomous Red-Team Telemetry
          </span>
          <h1 className="font-serif-display text-2xl sm:text-3xl text-white font-normal mt-0.5">
            {selectedRun.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          <select
            value={selectedRun.id}
            onChange={(e) => onSelectRun(e.target.value)}
            className="ab-input px-4 py-2.5 text-xs font-medium min-w-[240px]"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.metrics_summary?.attack_success_rate ?? 0}% ASR)
              </option>
            ))}
          </select>

          <button
            onClick={() => onNavigateTab('run')}
            className="ab-btn-primary px-4 py-2.5 text-xs flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 text-[#FFD444]" />
            <span>New Campaign</span>
          </button>

          <button
            onClick={() => onTriggerQuickReplay(selectedRun.id)}
            disabled={isReplaying}
            className="ab-btn-outline px-4 py-2.5 text-xs flex items-center gap-2"
          >
            <GitCompare className="w-3.5 h-3.5 text-[#FFD444]" />
            <span>{isReplaying ? 'Replaying...' : 'Apply Defenses & Replay'}</span>
          </button>
        </div>
      </div>

      {/* Executive Narrative Summary */}
      {metrics && (
        <div className="flex items-start gap-4 p-6 ab-card">
          <div className="w-9 h-9 rounded-full border border-[#FFD444] flex items-center justify-center shrink-0 text-[#FFD444] font-serif-display text-sm mt-0.5">
            A
          </div>
          <div className="space-y-2">
            <p className="font-serif-display text-lg sm:text-xl text-white leading-relaxed">
              Across {metrics.total_test_cases} completed sandbox evaluations on{' '}
              <span className="text-[#FFD444]">{selectedRun.agent_name}</span>, AgentBreak
              confirmed{' '}
              <span className="text-[#FFD444]">{metrics.confirmed_vulnerabilities} security findings</span>{' '}
              with an Attack Success Rate of{' '}
              <span className="text-[#FFD444]">{metrics.attack_success_rate}%</span> while
              legitimate summarization tasks passed at{' '}
              <span className="text-[#FFD444]">{metrics.benign_task_success_rate}%</span>.
            </p>
            <p className="font-cursive-italic text-base text-[#A1A1AA]">
              Execution Mode: {selectedRun.configuration.execution_mode} • Posture:{' '}
              {selectedRun.configuration.policy_snapshot?.profile_name}
            </p>
          </div>
        </div>
      )}

      {/* Primary KPI Metric Grid */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="ab-card p-6">
            <div className="flex items-center justify-between">
              <span className="font-cursive-italic text-base text-[#A1A1AA]">
                Confirmed vulnerabilities
              </span>
              <ShieldAlert className="w-4 h-4 text-[#FFD444]" />
            </div>
            <div className="text-3xl font-semibold text-white mt-3">
              {metrics.confirmed_vulnerabilities}
            </div>
            <div className="text-xs text-[#A1A1AA] mt-2">
              Verified boundary breaches in MongoDB
            </div>
          </div>

          <div className="ab-card p-6">
            <div className="flex items-center justify-between">
              <span className="font-cursive-italic text-base text-[#A1A1AA]">
                Test cases completed
              </span>
              <Activity className="w-4 h-4 text-[#FFD444]" />
            </div>
            <div className="text-3xl font-semibold text-white mt-3">
              {metrics.total_test_cases}
            </div>
            <div className="text-xs text-[#A1A1AA] mt-2">
              {metrics.completed_adversarial_tests} Adversarial • {metrics.completed_benign_tests} Benign
            </div>
          </div>

          <div className="ab-card p-6">
            <div className="flex items-center justify-between">
              <span className="font-cursive-italic text-base text-[#A1A1AA]">
                Attack success rate (ASR)
              </span>
              <AlertTriangle className="w-4 h-4 text-[#FFD444]" />
            </div>
            <div className="text-3xl font-semibold text-[#FFD444] mt-3">
              {metrics.attack_success_rate}%
            </div>
            <div className="text-xs text-[#A1A1AA] mt-2">
              {metrics.successful_attacks} of {metrics.completed_adversarial_tests} attacks succeeded
            </div>
          </div>

          <div className="ab-card p-6">
            <div className="flex items-center justify-between">
              <span className="font-cursive-italic text-base text-[#A1A1AA]">
                Benign tasks passed
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#FFD444]" />
            </div>
            <div className="text-3xl font-semibold text-white mt-3">
              {metrics.benign_task_success_rate}%
            </div>
            <div className="text-xs text-[#A1A1AA] mt-2">
              Legitimate task utility preserved
            </div>
          </div>
        </div>
      )}

      {/* Secondary Granular Security Telemetry Strip */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="ab-card p-4">
            <div className="font-cursive-italic text-sm text-[#A1A1AA]">Policy violation rate</div>
            <div className="text-lg font-semibold text-white mt-1">
              {metrics.policy_violation_rate}%
            </div>
          </div>
          <div className="ab-card p-4">
            <div className="font-cursive-italic text-sm text-[#A1A1AA]">Unauthorized tool exec</div>
            <div className="text-lg font-semibold text-white mt-1">
              {metrics.unauthorized_tool_execution_rate}%
            </div>
          </div>
          <div className="ab-card p-4">
            <div className="font-cursive-italic text-sm text-[#A1A1AA]">Canary data leakage</div>
            <div className="text-lg font-semibold text-[#FFD444] mt-1">
              {metrics.sensitive_data_leakage_rate}%
            </div>
          </div>
          <div className="ab-card p-4">
            <div className="font-cursive-italic text-sm text-[#A1A1AA]">False-positive rate</div>
            <div className="text-lg font-semibold text-white mt-1">
              {metrics.false_positive_rate}%
            </div>
          </div>
          <div className="ab-card p-4">
            <div className="font-cursive-italic text-sm text-[#A1A1AA]">Reproducibility rate</div>
            <div className="text-lg font-semibold text-white mt-1">
              {metrics.reproducibility_rate}%
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ab-card p-6">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#1F1F23]">
              <div>
                <span className="font-cursive-italic text-base text-[#FFD444]">
                  OWASP 2026 taxonomy
                </span>
                <h2 className="font-serif-display text-lg text-white">
                  Findings by Vulnerability Category
                </h2>
              </div>
              <FileWarning className="w-4 h-4 text-[#FFD444]" />
            </div>
            <CategoryVulnerabilityChart data={metrics.category_breakdown || []} />
          </div>

          <div className="ab-card p-6">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#1F1F23]">
              <div>
                <span className="font-cursive-italic text-base text-[#FFD444]">
                  Risk posture
                </span>
                <h2 className="font-serif-display text-lg text-white">
                  Severity Classification Distribution
                </h2>
              </div>
              <Lock className="w-4 h-4 text-[#FFD444]" />
            </div>
            <SeverityDistributionChart distribution={metrics.severity_distribution} />
          </div>
        </div>
      )}

      {/* Defense Replay Status Banner */}
      {latestReplay && (
        <div className="ab-card-active p-6 flex flex-wrap items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="font-cursive-italic text-base text-[#FFD444]">
              Defense & regression validation verified
            </div>
            <p className="text-sm text-white">
              Mitigated replay reduced Attack Success Rate from{' '}
              <span className="text-[#FFD444] font-semibold">
                {latestReplay.comparison_summary.original_asr}%
              </span>{' '}
              to{' '}
              <span className="text-[#FFD444] font-semibold">
                {latestReplay.comparison_summary.mitigated_asr}%
              </span>{' '}
              with a{' '}
              <span className="text-[#FFD444] font-semibold">
                {latestReplay.comparison_summary.defense_blocking_rate}%
              </span>{' '}
              defense blocking rate and{' '}
              <span className="text-[#FFD444] font-semibold">
                {latestReplay.comparison_summary.mitigated_benign_rate}%
              </span>{' '}
              benign task preservation.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('replay')}
            className="ab-btn-primary px-5 py-2.5 text-xs flex items-center gap-2.5"
          >
            <span>Compare Before vs. After</span>
            <ArrowRight className="w-4 h-4 text-[#FFD444]" />
          </button>
        </div>
      )}

      {/* Findings Table */}
      <div className="ab-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-[#1F1F23]">
          <div>
            <span className="font-cursive-italic text-base text-[#FFD444]">
              Recorded boundary violations
            </span>
            <h2 className="font-serif-display text-xl text-white">
              Security Findings ({runFindings.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('findings')}
            className="ab-btn-outline px-4 py-2 text-xs flex items-center gap-2"
          >
            <Eye className="w-3.5 h-3.5 text-[#FFD444]" />
            <span>Explore All Findings</span>
          </button>
        </div>

        {runFindings.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#A1A1AA] border border-dashed border-[#27272A] rounded-xl">
            Zero confirmed vulnerabilities in the selected campaign run. All security boundaries held.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#242429] text-[#A1A1AA] text-xs">
                  <th className="py-3.5 px-4 font-medium">Finding</th>
                  <th className="py-3.5 px-4 font-medium">OWASP Category</th>
                  <th className="py-3.5 px-4 font-medium">Severity</th>
                  <th className="py-3.5 px-4 font-medium">Outcome</th>
                  <th className="py-3.5 px-4 font-medium">Status</th>
                  <th className="py-3.5 px-4 font-medium text-right">Trace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C20]">
                {runFindings.map((f) => (
                  <tr key={f.id} className="hover:bg-[#121215] transition-colors">
                    <td className="py-4 px-4 text-white font-medium">
                      <div>{f.title}</div>
                      <div className="text-xs text-[#A1A1AA] mt-1">
                        {f.affected_component}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-white">
                      {f.category}{' '}
                      <span className="text-[#FFD444] font-mono text-xs">({f.owasp_id})</span>
                    </td>
                    <td className="py-4 px-4">
                      <SeverityBadge severity={f.severity} />
                    </td>
                    <td className="py-4 px-4">
                      <OutcomeBadge outcome={f.evidence?.outcome || 'EXPLOITED'} />
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 rounded-lg border border-[#2E2E34] text-white text-xs">
                        {f.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => onInspectTrace(f.run_id, f.test_case_id)}
                        className="ab-btn-outline px-3.5 py-2 text-xs inline-flex items-center gap-2"
                      >
                        <Terminal className="w-3.5 h-3.5 text-[#FFD444]" />
                        <span>Inspect Trace</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
