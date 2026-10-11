import React from 'react';
import { AlertOctagon, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface SeverityBadgeProps {
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  if (severity === 'Critical') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#FFD444] text-black border border-[#FFD444]">
        <AlertOctagon className="w-3.5 h-3.5 text-black" />
        Critical
      </span>
    );
  }
  if (severity === 'High') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#18150A] text-white border border-[#FFD444]">
        <ShieldAlert className="w-3.5 h-3.5 text-[#FFD444]" />
        High
      </span>
    );
  }
  if (severity === 'Medium') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#121215] text-white border border-[#FFD444]/60">
        <AlertTriangle className="w-3.5 h-3.5 text-[#FFD444]" />
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#121215] text-[#D4D4D8] border border-[#2E2E34]">
      <Info className="w-3.5 h-3.5 text-[#FFD444]" />
      Low
    </span>
  );
};

interface OutcomeBadgeProps {
  outcome: string;
}

export const OutcomeBadge: React.FC<OutcomeBadgeProps> = ({ outcome }) => {
  switch (outcome) {
    case 'EXPLOITED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#FFD444] text-black border border-[#FFD444]">
          Exploited (Breach)
        </span>
      );
    case 'BLOCKED_VIOLATION_ATTEMPT':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#14120A] text-white border border-[#FFD444]">
          Blocked by Guard
        </span>
      );
    case 'DEFENDED_SAFE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#121215] text-white border border-[#FFD444]/50">
          Defended Safe
        </span>
      );
    case 'BENIGN_PASSED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#121215] text-white border border-[#3F3F46]">
          Benign Passed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#121215] text-[#A1A1AA] border border-[#2E2E34]">
          {outcome}
        </span>
      );
  }
};
