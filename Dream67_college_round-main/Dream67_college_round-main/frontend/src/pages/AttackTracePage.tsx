import React from 'react';
import {
  AlertOctagon,
  Clock,
  Cpu,
  Database,
  FileText,
  Lock,
  MessageSquare,
  ShieldAlert,
  Terminal,
  Wrench,
} from 'lucide-react';
import { ExecutionEvent, TestCase, TestRun } from '../types';
import { OutcomeBadge } from '../components/SeverityBadge';

interface AttackTracePageProps {
  runs: TestRun[];
  selectedRunId: string;
  onSelectRun: (runId: string) => void;
  traces: Array<{ test_case: TestCase; events: ExecutionEvent[] }>;
  selectedTestCaseId: string;
  onSelectTestCase: (testCaseId: string) => void;
}

export const AttackTracePage: React.FC<AttackTracePageProps> = ({
  runs,
  selectedRunId,
  onSelectRun,
  traces,
  selectedTestCaseId,
  onSelectTestCase,
}) => {
  const activeBundle =
    traces.find((t) => t.test_case.id === selectedTestCaseId) || traces[0] || null;

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
    <div className="space-y-8">
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

        <div className="w-full sm:w-80">
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

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left Column: Test Case Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="ab-card p-5 space-y-4">
            <div className="border-b border-[#1F1F23] pb-3">
              <span className="font-cursive-italic text-base text-[#FFD444]">
                Recorded scenarios
              </span>
              <h2 className="font-serif-display text-lg text-white">
                Test Cases ({traces.length})
              </h2>
            </div>

            {traces.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#A1A1AA]">
                No execution traces recorded yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                {traces.map(({ test_case }) => {
                  const isSelected = activeBundle?.test_case.id === test_case.id;
                  return (
                    <div
                      key={test_case.id}
                      onClick={() => onSelectTestCase(test_case.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#16140C] border-[#FFD444]'
                          : 'bg-[#111114] border-[#242429] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-[#FFD444]">
                          #{test_case.sequence_order} • {test_case.scenario_code}
                        </span>
                        <OutcomeBadge outcome={test_case.outcome} />
                      </div>
                      <div className="text-sm font-medium text-white mt-2">
                        {test_case.scenario_name}
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#A1A1AA] mt-2.5">
                        <span>{test_case.category}</span>
                        <span>{test_case.event_count} steps</span>
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
                  <OutcomeBadge outcome={activeBundle.test_case.outcome} />
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

                {activeBundle.test_case.leaked_tokens?.length > 0 && (
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
              <div className="space-y-5 relative before:absolute before:top-4 before:bottom-4 before:left-5 before:w-px before:bg-[#2E2E34]">
                {activeBundle.events.map((ev) => {
                  const isViolation = ev.boundary_crossed || ev.event_type === 'BOUNDARY_VIOLATION';
                  return (
                    <div key={ev.id} className="relative pl-14">
                      {/* Circular Monogram/Icon Node */}
                      <div
                        className={`absolute left-1.5 top-3 w-8 h-8 rounded-full flex items-center justify-center border ${
                          isViolation
                            ? 'bg-[#FFD444] text-black border-[#FFD444]'
                            : 'bg-[#0D0D0F] text-[#FFD444] border-[#FFD444]'
                        }`}
                      >
                        {getEventIcon(ev.event_type, isViolation)}
                      </div>

                      <div
                        className={`p-4 rounded-xl border ${
                          isViolation
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
