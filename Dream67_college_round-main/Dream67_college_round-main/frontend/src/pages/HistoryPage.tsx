import React from 'react';
import { RefreshCw, Terminal, Inbox } from 'lucide-react';
import { RunSummary } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

interface HistoryPageProps {
  runs: RunSummary[];
  onRefresh: () => void;
  onInspect: (runId: string) => void;
  isLoading: boolean;
}

function formatTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  runs,
  onRefresh,
  onInspect,
  isLoading,
}) => {
  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-serif-display text-3xl text-white">Run history</h1>
          <p className="font-cursive-italic text-lg text-[#FFD444]">
            Every scan persisted to MongoDB, newest first.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="ab-btn-outline px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-[#FFD444] ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {runs.length === 0 ? (
        <div className="ab-card p-14 text-center space-y-2">
          <Inbox className="w-8 h-8 text-[#FFD444] mx-auto" />
          <div className="font-serif-display text-xl">No runs yet</div>
          <p className="text-sm text-[#A1A1AA]">
            Run a real scan and it will appear here.
          </p>
        </div>
      ) : (
        <div className="ab-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[#A1A1AA] border-b border-[#222226]">
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Mode</th>
                <th className="px-5 py-3 font-medium">Scenario</th>
                <th className="px-5 py-3 font-medium">Outcome</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr
                  key={r.run_id}
                  className="border-b border-[#17171A] last:border-0 hover:bg-[#101013] transition-colors"
                >
                  <td className="px-5 py-3 text-[#D4D4D8]">{formatTime(r.started_at)}</td>
                  <td className="px-5 py-3">
                    <span className={r.attack_success ? 'text-[#FFD444]' : 'text-white'}>
                      {r.agent_mode}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#D4D4D8]">{r.scenario}</td>
                  <td className="px-5 py-3 text-[#A1A1AA]">{r.outcome}</td>
                  <td className="px-5 py-3">
                    <SeverityBadge severity={r.finding.severity === 'high' ? 'High' : 'Low'} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => onInspect(r.run_id)}
                      className="ab-btn-outline px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                    >
                      <Terminal className="w-3.5 h-3.5 text-[#FFD444]" />
                      Trace
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
