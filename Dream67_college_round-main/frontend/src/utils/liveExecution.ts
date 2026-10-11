import { ExecutionEvent, TestCase } from '../types';

export interface TraceBundle {
  test_case: TestCase;
  events: ExecutionEvent[];
}

export interface ScenarioLiveState {
  traceIndex: number;
  testCaseId: string;
  status: 'queued' | 'executing' | 'completed';
  visibleEventCount: number;
  activeEventIndex: number; // -1 if header or verdict or not executing
  verdictReady: boolean;
}

export interface LiveExecutionSnapshot {
  totalSteps: number;
  visibleSteps: number;
  isComplete: boolean;
  activeTraceIndex: number;
  activeTestCaseId: string;
  scenarios: ScenarioLiveState[];
}

/**
 * Total nodes in the ReactFlow graph for a given set of traces:
 * 1 (root START node) + for each trace: 1 (scenario header) + events.length + 1 (verdict node)
 */
export function computeTotalFlowSteps(traces: Array<{ events?: unknown[] }>): number {
  if (!traces || traces.length === 0) return 0;
  return (
    1 +
    traces.reduce((acc, tr) => {
      const evLen = Array.isArray(tr.events) ? tr.events.length : 0;
      return acc + 2 + evLen;
    }, 0)
  );
}

/**
 * Given `traces` and the current `visibleSteps` (1 .. totalSteps),
 * computes the exact synchronized state for both the ReactFlow graph
 * and the Chronological Execution Trace page.
 */
export function computeLiveExecutionSnapshot(
  traces: TraceBundle[],
  visibleSteps: number
): LiveExecutionSnapshot {
  const totalSteps = computeTotalFlowSteps(traces);
  if (traces.length === 0 || totalSteps === 0) {
    return {
      totalSteps: 0,
      visibleSteps: 0,
      isComplete: true,
      activeTraceIndex: 0,
      activeTestCaseId: '',
      scenarios: [],
    };
  }

  const clampedVisible = Math.max(0, Math.min(visibleSteps, totalSteps));
  const isComplete = clampedVisible >= totalSteps;

  let cursor = 1; // index 0 is the root START node
  let activeTraceIndex = 0;
  const scenarios: ScenarioLiveState[] = [];

  traces.forEach((tr, idx) => {
    const evCount = tr.events?.length || 0;
    const branchNodeCount = 1 + evCount + 1; // header + events + verdict
    const branchStart = cursor;
    const branchEnd = branchStart + branchNodeCount;
    const tcId = tr.test_case?.id || `tc-${idx}`;

    if (clampedVisible <= branchStart) {
      scenarios.push({
        traceIndex: idx,
        testCaseId: tcId,
        status: 'queued',
        visibleEventCount: 0,
        activeEventIndex: -1,
        verdictReady: false,
      });
    } else if (clampedVisible >= branchEnd) {
      scenarios.push({
        traceIndex: idx,
        testCaseId: tcId,
        status: 'completed',
        visibleEventCount: evCount,
        activeEventIndex: -1,
        verdictReady: true,
      });
      activeTraceIndex = idx;
    } else {
      const stepsIntoBranch = clampedVisible - branchStart;
      // stepsIntoBranch === 1 -> header node just revealed
      // 2 <= stepsIntoBranch <= 1 + evCount -> event (stepsIntoBranch - 2) just revealed
      // stepsIntoBranch === 2 + evCount -> verdict node just revealed
      const visibleEventCount = Math.max(0, Math.min(evCount, stepsIntoBranch - 1));
      const activeEventIndex =
        stepsIntoBranch >= 2 && stepsIntoBranch <= 1 + evCount ? stepsIntoBranch - 2 : -1;
      const verdictReady = stepsIntoBranch >= 2 + evCount;

      scenarios.push({
        traceIndex: idx,
        testCaseId: tcId,
        status: 'executing',
        visibleEventCount,
        activeEventIndex,
        verdictReady,
      });
      activeTraceIndex = idx;
    }

    cursor = branchEnd;
  });

  const activeTestCaseId = traces[activeTraceIndex]?.test_case?.id || traces[0]?.test_case?.id || '';

  return {
    totalSteps,
    visibleSteps: clampedVisible,
    isComplete,
    activeTraceIndex,
    activeTestCaseId,
    scenarios,
  };
}
