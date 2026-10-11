import React from 'react';
import {
  Activity,
  Beaker,
  Database,
  FileWarning,
  GitCompare,
  Home,
  LayoutDashboard,
  Plus,
  Trash2,
  Terminal,
} from 'lucide-react';
import { SystemStatus, TestRun } from '../types';

export type ActiveTab = 'home' | 'overview' | 'run' | 'scan' | 'findings' | 'traces' | 'replay';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  systemStatus: SystemStatus | null;
  onClearRuns: () => void;
  isClearing: boolean;
  runs?: TestRun[];
  selectedRunId?: string;
  onSelectRun?: (runId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  systemStatus,
  onClearRuns,
  isClearing,
  runs = [],
  selectedRunId = '',
  onSelectRun,
}) => {
  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'Execution Mode (Home)', icon: <Home className="w-4 h-4 text-[#FFD444]" /> },
    { id: 'run', label: 'Configure & Run Campaign', icon: <Plus className="w-4 h-4 text-[#FFD444]" /> },
    { id: 'scan', label: 'Live Document Scan', icon: <Beaker className="w-4 h-4 text-[#FFD444]" /> },
    { id: 'overview', label: 'Security Evaluation Center', icon: <LayoutDashboard className="w-4 h-4 text-[#FFD444]" /> },
    { id: 'findings', label: 'Vulnerability Findings', icon: <FileWarning className="w-4 h-4 text-[#FFD444]" /> },
    { id: 'traces', label: 'Attack Trace Timeline', icon: <Terminal className="w-4 h-4 text-[#FFD444]" /> },
    { id: 'replay', label: 'Defense & Replay Lab', icon: <GitCompare className="w-4 h-4 text-[#FFD444]" /> },
  ];

  return (
    <aside className="w-full lg:w-72 shrink-0 bg-[#070707] border-b lg:border-b-0 lg:border-r border-[#1F1F23] p-6 flex flex-col justify-between select-none">
      <div className="space-y-8">
        {/* Top Spaced Brand Title */}
        <div
          onClick={() => onSelectTab('home')}
          className="pt-1 cursor-pointer"
        >
          <div className="font-serif-display text-lg tracking-[0.26em] text-[#FFD444] font-semibold uppercase">
            AGENTBREAK
          </div>
          <p className="font-cursive-italic text-base text-[#A1A1AA] mt-1">
            Autonomous AI Red Team
          </p>
        </div>

        {/* Primary Outlined "+ New directive" Button */}
        <div>
          <button
            onClick={() => onSelectTab('run')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-transparent border border-[#FFD444] text-white text-sm font-medium hover:bg-[#FFD444] hover:text-black transition-all group"
          >
            <Plus className="w-4 h-4 text-[#FFD444] group-hover:text-black transition-colors" />
            <span>New security directive</span>
          </button>
        </div>

        {/* Navigation Section with Cursive Header */}
        <div className="space-y-2.5">
          <div className="font-cursive-italic text-base text-[#A1A1AA] px-2">
            Workspace views
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all text-left ${
                    active
                      ? 'bg-[#1C1C20] text-white font-medium border border-[#2E2E34]'
                      : 'text-[#D4D4D8] hover:bg-[#121215] hover:text-white border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Recorded Campaigns History (Only shown when real runs exist in MongoDB) */}
        {runs.length > 0 && (
          <div className="space-y-2.5">
            <div className="font-cursive-italic text-base text-[#A1A1AA] px-2">
              Recorded campaigns
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {runs.slice(0, 6).map((r) => {
                const isCurrent = r.id === selectedRunId;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      if (onSelectRun) onSelectRun(r.id);
                    }}
                    className={`w-full text-left px-3.5 py-2 rounded-xl text-xs transition-all truncate border ${
                      isCurrent
                        ? 'bg-[#161619] text-white border-[#2E2E34] font-medium'
                        : 'text-[#A1A1AA] border-transparent hover:bg-[#121215] hover:text-white'
                    }`}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom System Telemetry & Clear Controls */}
      <div className="pt-8 mt-8 border-t border-[#1F1F23] space-y-3">
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0E0E11] border border-[#222226] text-xs text-white">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-[#FFD444]" />
            <span>MongoDB</span>
          </div>
          <span className="text-[#FFD444] font-mono text-[11px]">
            {systemStatus?.mongodb_db_name || 'agentbreak'}
          </span>
        </div>

        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0E0E11] border border-[#222226] text-xs text-white">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#FFD444]" />
            <span>Active Mode</span>
          </div>
          <span className="text-[#FFD444] font-mono text-[11px] uppercase">
            {systemStatus?.execution_mode || 'deterministic'}
          </span>
        </div>

        {runs.length > 0 && (
          <button
            onClick={onClearRuns}
            disabled={isClearing}
            className="w-full ab-btn-outline px-3.5 py-2.5 text-xs flex items-center justify-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#FFD444]" />
            <span>{isClearing ? 'Clearing Runs...' : 'Clear Recorded Runs'}</span>
          </button>
        )}
      </div>
    </aside>
  );
};
