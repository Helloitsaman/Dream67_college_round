import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  Clock,
  Cpu,
  Database,
  FastForward,
  FileText,
  Lock,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Terminal,
  Wrench,
} from 'lucide-react';
import { ActiveTab } from '../components/Navbar';
import { ExecutionEvent, TestCase, TestRun } from '../types';
import { OutcomeBadge } from '../components/SeverityBadge';
import { computeLiveExecutionSnapshot } from '../utils/liveExecution';

interface AttackTracePageProps {
  runs: TestRun[];
  selectedRunId: string;
  onSelectRun: (runId: string) => void;
  traces: Array<{ test_case: TestCase; events: ExecutionEvent[] }>;
  selectedTestCaseId: string;
  onSelectTestCase: (testCaseId: string) => void;
  liveVisibleSteps?: number;
  isLivePlaying?: boolean;
  liveSpeedMs?: number;
  onChangeLiveSpeed?: (ms: number) => void;
  onToggleLivePause?: () => void;
  onRestartLive?: () => void;
  onSkipLiveToEnd?: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
}

export const AttackTracePage: React.FC<AttackTracePageProps> = ({
  runs,
  selectedRunId,
  onSelectRun,
  traces,
  selectedTestCaseId,
  onSelectTestCase,
  liveVisibleSteps,
  isLivePlaying = false,
  liveSpeedMs = 450,
  onChangeLiveSpeed,
  onToggleLivePause,
  onRestartLive,
  onSkipLiveToEnd,
  onNavigateTab,
}) => {
  const [manualFollowOverride, setManualFollowOverride] = useState<boolean>(false);

  const snapshot = useMemo(() => {
    const effectiveSteps =
      typeof liveVisibleSteps === 'number' && liveVisibleSteps > 0
        ? liveVisibleSteps
        : Number.MAX_SAFE_INTEGER;
    return computeLiveExecutionSnapshot(traces, effectiveSteps);
  }, [traces, liveVisibleSteps]);

  // Reset manual override when a new live playback starts
  useEffect(() => {
    if (isLivePlaying && snapshot.visibleSteps <= 2) {
      setManualFollowOverride(false);
    }
  }, [isLivePlaying, snapshot.visibleSteps]);

  // Auto-follow the currently executing scenario while live playback is running
  useEffect(() => {
    if (
      isLivePlaying &&
      !manualFollowOverride &&
      snapshot.activeTestCaseId &&
      snapshot.activeTestCaseId !== selectedTestCaseId
    ) {
      onSelectTestCase(snapshot.activeTestCaseId);
    }
  }, [
    isLivePlaying,
    manualFollowOverride,
    snapshot.activeTestCaseId,
    selectedTestCaseId,
    onSelectTestCase,
  ]);

  const activeBundleIndex = useMemo(() => {
    const idx = traces.findIndex((t) => t.test_case.id === selectedTestCaseId);
    return idx >= 0 ? idx : 0;
  }, [traces, selectedTestCaseId]);

  const activeBundle = traces[activeBundleIndex] || null;
  const activeScenarioLive = snapshot.scenarios[activeBundleIndex] || null;

  const visibleEvents = useMemo(() => {
    if (!activeBundle) return [];
    if (snapshot.isComplete || !activeScenarioLive) return activeBundle.events;
    return activeBundle.events.slice(0, activeScenarioLive.visibleEventCount);
  }, [activeBundle, snapshot.isComplete, activeScenarioLive]);

  const getEventIcon = (eventType: string, isViolation: boolean) => {
    const colorClass = isViolation ? 'text-black' : 'text-[#FFD444]';
    switch (eventType) {
      case 'USER_INPUT':
        return <MessageSquare className={`w-4 h-4 ${colorClass}`} />;
      case 'DOCUMENT_RETRIEVED':
        return <FileText className={`w-4 h-4 ${colorClass}`} />;
      case 'UNTRUSTED_CONTENT_FILTER':
        return <Lock className={`w-4 h-4 ${colorClass}`} />;
      case 'AGENT_REASONING':
        return <Cpu className={`w-4 h-4 ${colorClass}`} />;
      case 'TOOL_CALL_PROPOSED':
      case 'TOOL_EXECUTED':
        return <Wrench className={`w-4 h-4 ${colorClass}`} />;
      case 'SANDBOX_POLICY_DECISION':
        return <Lock className={`w-4 h-4 ${colorClass}`} />;
      case 'BOUNDARY_VIOLATION':
        return <AlertOctagon className={`w-4 h-4 ${colorClass}`} />;
      case 'MEMORY_ACCESS':
        return <Database className={`w-4 h-4 ${colorClass}`} />;
      default:
        return <Terminal className={`w-4 h-4 ${colorClass}`} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#1F1F23]">
        <div>
          <span className="font-cursive-italic text-lg text-[#FFD444]">
            Multi-Stage Attack Reconstruction
          </span>
          <h1 className="font-serif-display text-2xl sm:text-3xl text-white font-normal mt-0.5">
            Chronological Execution Trace
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('flow')}
              className="ab-btn-outline px-3.5 py-2.5 text-xs flex items-center gap-2"
            >
              <Activity className="w-3.5 h-3.5 text-[#FFD444]" />
              <span>View Simultaneous Live Flow</span>
            </button>
          )}
          <div className="w-full sm:w-72">
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
                    {r.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Synchronized Live Execution Control Strip */}
      {traces.length > 0 && (
        <div
          className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 transition-all ${
            !snapshot.isComplete
              ? 'bg-[#14120A] border-[#FFD444]'
              : 'bg-[#0F0F12] border-[#242429]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isLivePlaying
                  ? 'bg-[#FFD444] animate-ping'
                  : !snapshot.isComplete
                  ? 'bg-[#FFD444]'
                  : 'bg-[#4ADE80]'
              }`}
            />
            <div className="text-xs">
              <div className="font-medium text-white flex flex-wrap items-center gap-2">
                <span>
                  {!snapshot.isComplete
                    ? isLivePlaying
                      ? 'Live Campaign Executing Simultaneously with Live Flow'
                      : 'Live Campaign Paused'
                    : 'Execution Complete — All Trace Steps Synchronized'}
                </span>
                <span className="font-mono text-[#FFD444]">
                  ({snapshot.visibleSteps} / {snapshot.totalSteps} steps)
                </span>
              </div>
              <div className="text-[11px] text-[#A1A1AA] mt-0.5">
                {!snapshot.isComplete && traces[snapshot.activeTraceIndex]
                  ? `Currently executing Scenario #${snapshot.activeTraceIndex + 1}: ${
                      traces[snapshot.activeTraceIndex].test_case.scenario_code
                    } — ${traces[snapshot.activeTraceIndex].test_case.scenario_name}`
                  : 'Click Replay Live to watch scenarios and events stream step-by-step.'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onChangeLiveSpeed && (
              <select
                value={liveSpeedMs}
                onChange={(e) => onChangeLiveSpeed(Number(e.target.value))}
                className="ab-input px-3 py-1.5 text-xs"
              >
                <option value={800}>Slow (800ms)</option>
                <option value={450}>Normal (450ms)</option>
                <option value={220}>Fast (220ms)</option>
              </select>
            )}

            {!snapshot.isComplete && onToggleLivePause && (
              <button
                type="button"
                onClick={onToggleLivePause}
                className="ab-btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                {isLivePlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-[#FFD444]" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-[#FFD444]" />
                    <span>Resume</span>
                  </>
                )}
              </button>
            )}

            {!snapshot.isComplete && onSkipLiveToEnd && (
              <button
                type="button"
                onClick={onSkipLiveToEnd}
                className="ab-btn-outline px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                <FastForward className="w-3.5 h-3.5 text-[#FFD444]" />
                <span>Skip to End</span>
              </button>
            )}

            {onRestartLive && (
              <button
                type="button"
                onClick={() => {
                  setManualFollowOverride(false);
                  onRestartLive();
                }}
                className="ab-btn-outline px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#FFD444]" />
                <span>Replay Live</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left Column: Test Case Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="ab-card p-5 space-y-4">
            <div className="border-b border-[#1F1F23] pb-3 flex items-center justify-between">
              <div>
                <span className="font-cursive-italic text-base text-[#FFD444]">
                  Recorded scenarios
                </span>
                <h2 className="font-serif-display text-lg text-white">
                  Test Cases ({traces.length})
                </h2>
              </div>
              {!snapshot.isComplete && manualFollowOverride && (
                <button
                  type="button"
                  onClick={() => setManualFollowOverride(false)}
                  className="text-[11px] font-mono text-[#FFD444] underline"
                >
                  Auto-follow live
                </button>
              )}
            </div>

            {traces.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#A1A1AA]">
                No execution traces recorded yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                {traces.map(({ test_case, events }, idx) => {
                  const isSelected = activeBundle?.test_case.id === test_case.id;
                  const scenLive = snapshot.scenarios[idx];
                  const isExecuting = !snapshot.isComplete && scenLive?.status === 'executing';
                  const isQueued = !snapshot.isComplete && scenLive?.status === 'queued';
                  const tok =
                    test_case.token_usage?.total_tokens ??
                    (test_case.category === 'Benign Baseline' ? 320 : 540);
                  return (
                    <div
                      key={test_case.id}
                      onClick={() => {
                        setManualFollowOverride(true);
                        onSelectTestCase(test_case.id);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isExecuting
                          ? 'bg-[#18150A] border-[#FFD444] shadow-[0_0_20px_rgba(255,212,68,0.15)]'
                          : isSelected
                          ? 'bg-[#16140C] border-[#FFD444]'
                          : isQueued
                          ? 'bg-[#0C0C0E] border-[#1E1E22] opacity-60 hover:opacity-90'
                          : 'bg-[#111114] border-[#242429] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-[#FFD444]">
                          #{test_case.sequence_order} • {test_case.scenario_code}
                        </span>
                        {isExecuting ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#FFD444] text-black animate-pulse">
                            LIVE ({scenLive.visibleEventCount}/{events.length})
                          </span>
                        ) : isQueued ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-[#1A1A1E] text-[#A1A1AA] border border-[#2E2E34]">
                            QUEUED
                          </span>
                        ) : (
                          <OutcomeBadge outcome={test_case.outcome} />
                        )}
                      </div>
                      <div className="text-sm font-medium text-white mt-2">
                        {test_case.scenario_name}
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#A1A1AA] mt-2.5">
                        <span>{test_case.category}</span>
                        <span className="font-mono text-[#FFD444]">
                          {tok.toLocaleString()} tok • {test_case.duration_ms || 260}ms
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chronological Event Timeline */}
        <div className="lg:col-span-8 space-y-5">
          {!activeBundle ? (
            <div className="ab-card p-12 text-center text-sm text-[#A1A1AA]">
              Launch a campaign or select a test case on the left to inspect its chronological execution trace.
            </div>
          ) : (
            <div className="ab-card p-6 space-y-6">
              {/* Selected Test Case Metadata Header */}
              <div className="p-5 rounded-xl bg-[#111114] border border-[#2B2B32] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-[#FFD444] text-black">
                      {activeBundle.test_case.scenario_code}
                    </span>
                    <span className="text-xs text-[#FFD444] font-mono">
                      {activeBundle.test_case.owasp_id} • {activeBundle.test_case.category}
                    </span>
                  </div>
                  {snapshot.isComplete || activeScenarioLive?.verdictReady ? (
                    <OutcomeBadge outcome={activeBundle.test_case.outcome} />
                  ) : (
                    <span className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-[#1A180D] border border-[#FFD444] text-[#FFD444] animate-pulse">
                      {activeScenarioLive?.status === 'executing'
                        ? 'EVALUATING IN SANDBOX...'
                        : 'QUEUED FOR EXECUTION'}
                    </span>
                  )}
                </div>

                <h2 className="font-serif-display text-xl text-white">
                  {activeBundle.test_case.scenario_name}
                </h2>

                <div className="text-xs text-[#D4D4D8] leading-relaxed">
                  <span className="font-cursive-italic text-base text-[#FFD444] mr-2">
                    Directive input:
                  </span>
                  "{String(activeBundle.test_case.input_payload?.user_prompt || '')}"
                </div>

                {(() => {
                  const pTok = activeBundle.test_case.token_usage?.prompt_tokens ?? 390;
                  const cTok = activeBundle.test_case.token_usage?.completion_tokens ?? 150;
                  const tTok = activeBundle.test_case.token_usage?.total_tokens ?? pTok + cTok;
                  return (
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded-lg bg-[#0D0D0F] border border-[#242429] text-[#FFD444]">
                        Total Tokens: {tTok.toLocaleString()}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#0D0D0F] border border-[#242429] text-[#D4D4D8]">
                        Prompt: {pTok.toLocaleString()} tok
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#0D0D0F] border border-[#242429] text-[#D4D4D8]">
                        Completion: {cTok.toLocaleString()} tok
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#0D0D0F] border border-[#242429] text-[#A1A1AA]">
                        Latency: {activeBundle.test_case.duration_ms || 260}ms
                      </span>
                    </div>
                  );
                })()}

                {(snapshot.isComplete || activeScenarioLive?.verdictReady) &&
                  activeBundle.test_case.leaked_tokens?.length > 0 && (
                    <div className="p-3 rounded-xl bg-[#18150A] border border-[#FFD444] text-xs text-white flex items-center gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-[#FFD444] shrink-0" />
                      <span>
                        Confirmed Canary Secret Leakage:{' '}
                        <strong className="text-[#FFD444] font-mono">
                          {activeBundle.test_case.leaked_tokens.join(', ')}
                        </strong>
                      </span>
                    </div>
                  )}
              </div>

              {/* Vertical Event Timeline */}
              {visibleEvents.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#0D0D0F] border border-[#242429] text-center text-xs text-[#A1A1AA] font-mono">
                  Waiting for scenario branch to begin execution...
                </div>
              ) : (
                <div className="space-y-5 relative before:absolute before:top-4 before:bottom-4 before:left-5 before:w-px before:bg-[#2E2E34]">
                  {visibleEvents.map((ev, evIdx) => {
                    const isViolation =
                      ev.boundary_crossed || ev.event_type === 'BOUNDARY_VIOLATION';
                    const isActiveStep =
                      !snapshot.isComplete &&
                      activeScenarioLive?.status === 'executing' &&
                      activeScenarioLive?.activeEventIndex === evIdx;
                    return (
                      <div key={ev.id || evIdx} className="relative pl-14">
                        {/* Circular Monogram/Icon Node */}
                        <div
                          className={`absolute left-1.5 top-3 w-8 h-8 rounded-full flex items-center justify-center border ${
                            isViolation
                              ? 'bg-[#FFD444] text-black border-[#FFD444]'
                              : isActiveStep
                              ? 'bg-[#FFD444] text-black border-[#FFD444] animate-pulse'
                              : 'bg-[#0D0D0F] text-[#FFD444] border-[#FFD444]'
                          }`}
                        >
                          {getEventIcon(ev.event_type, isViolation || isActiveStep)}
                        </div>

                        <div
                          className={`p-4 rounded-xl border transition-all ${
                            isActiveStep
                              ? 'bg-[#18150A] border-[#FFD444] shadow-[0_0_24px_rgba(255,212,68,0.18)]'
                              : isViolation
                              ? 'bg-[#16130A] border-[#FFD444]'
                              : 'bg-[#111114] border-[#242429]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F1F23] pb-2.5 mb-3">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="text-xs font-mono font-semibold text-white">
                                Step {ev.sequence} • {ev.event_type}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-md text-[11px] bg-[#1A1A1E] text-[#D4D4D8] border border-[#2E2E34]">
                                Actor: {ev.actor}
                              </span>
                              {isActiveStep && (
                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#FFD444] text-black animate-pulse">
                                  EXECUTING NOW
                                </span>
                              )}
                              {isViolation && (
                                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFD444] text-black">
                                  Security Boundary Crossed
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
                              <Clock className="w-3.5 h-3.5 text-[#FFD444]" />
                              <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>

                          <pre className="text-xs font-mono text-[#E4E4E7] whitespace-pre-wrap break-words bg-[#09090B] p-3.5 rounded-lg border border-[#1E1E22] overflow-x-auto">
                            {JSON.stringify(ev.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
