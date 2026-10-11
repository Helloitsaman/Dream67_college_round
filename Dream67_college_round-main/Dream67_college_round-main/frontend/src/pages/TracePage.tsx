import React from 'react';
import { Terminal, Loader2 } from 'lucide-react';
import { ScanResult } from '../types';
import { ScanResultCard } from './ScanResultCard';

interface TracePageProps {
  run: ScanResult | null;
  isLoading: boolean;
}

// Events whose presence signals a boundary crossing / violation get a
// brighter marker.
const HOT_EVENTS = new Set(['tool_executed', 'tool_attempt']);

export const TracePage: React.FC<TracePageProps> = ({ run, isLoading }) => {
  if (isLoading) {
    return (
      <div className="ab-card p-14 text-center space-y-3">
        <Loader2 className="w-6 h-6 text-[#FFD444] mx-auto animate-spin" />
        <div className="font-cursive-italic text-lg text-[#FFD444]">
          Loading trace...
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="ab-card p-14 text-center space-y-2">
        <Terminal className="w-8 h-8 text-[#FFD444] mx-auto" />
        <div className="font-serif-display text-xl">No run selected</div>
        <p className="text-sm text-[#A1A1AA]">
          Run a scan or pick one from History to see its trace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif-display text-3xl text-white">
          Attack trace timeline
        </h1>
        <p className="font-cursive-italic text-lg text-[#FFD444]">
          Step-by-step execution recorded by the oracle.
        </p>
      </header>

      <ScanResultCard result={run} />

      <section className="ab-card p-6">
        <h2 className="font-serif-display text-xl mb-5">Execution trace</h2>
        <div className="space-y-4">
          {run.events.map((event) => {
            const hot = HOT_EVENTS.has(event.type);
            return (
              <div
                key={event.step}
                className={`border-l-2 pl-4 ${hot ? 'border-[#FFD444]' : 'border-[#2E2E34]'}`}
              >
                <p className="text-xs font-mono text-[#FFD444]">
                  Step {event.step} · {event.type}
                </p>
                <p className="mt-1 text-sm">{event.message}</p>
                {Object.keys(event.details || {}).length > 0 && (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-[#0A0A0C] border border-[#1A1A1E] p-3 text-xs text-[#A1A1AA] font-mono">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
