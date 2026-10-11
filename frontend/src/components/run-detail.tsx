"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatDate, shortId } from "@/lib/api";
import type { Finding, PageResult, Run, TraceEvent } from "@/lib/types";
import { EmptyState, MetricCard, OutcomeBadge, StatusBadge } from "@/components/ui";

const eventIcons: Record<string, string> = { attempt_started: "↻", payload_injected: "◇", benign_input: "○", model_response: "◎", tool_requested: "⌁", policy_decision: "⬡", tool_result: "□", state_diff: "Δ", oracle_result: "✓" };

export function RunDetail({ runId }: { runId: string }) {
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null); const [events, setEvents] = useState<TraceEvent[]>([]); const [findings, setFindings] = useState<Finding[]>([]); const [error, setError] = useState<string | null>(null); const [expanded, setExpanded] = useState<string | null>(null); const [retrying, setRetrying] = useState(false);
  const load = useCallback(async () => { try { const current = await api<Run>(`runs/${runId}`); setRun(current); if (["completed", "failed", "cancelled"].includes(current.status)) { const [eventPage, findingPage] = await Promise.all([api<PageResult<TraceEvent>>(`runs/${runId}/events?limit=500`), api<PageResult<Finding>>(`runs/${runId}/findings`)]); setEvents(eventPage.items); setFindings(findingPage.items); } setError(null); } catch (reason) { setError(reason instanceof Error ? reason.message : "Run unavailable."); } }, [runId]);
  useEffect(() => { const initial = window.setTimeout(() => void load(), 0); const timer = window.setInterval(load, 2200); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, [load]);
  const attempts = useMemo(() => new Set(events.map((event) => event.attempt_id)).size, [events]);
  const metricsUnavailable = run?.status === "failed" && (run.summary?.total_attempts ?? 0) === 0;
  const statusMessage = run?.status === "queued" || run?.status === "running"
    ? "The isolated runner is executing bounded attempts. This page refreshes automatically."
    : run?.status === "failed"
      ? "The scan stopped before the evaluation could complete. No unavailable result is counted as zero."
      : run?.status === "cancelled"
        ? "The scan was cancelled before all configured attempts completed."
        : `Completed ${formatDate(run?.completed_at)} using ${run?.model_config_snapshot?.model ?? run?.model ?? "the configured target"}.`;
  async function cancel() { try { await api(`runs/${runId}/cancel`, { method: "POST", body: "{}" }); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Cancellation failed."); } }
  async function retry() {
    if (!run?.agent_id || !run.suite_id || !run.policy_set_id) return;
    setRetrying(true); setError(null);
    try {
      const result = await api<{ run_id: string }>("runs", {
        method: "POST",
        body: JSON.stringify({
          agent_id: run.agent_id,
          suite_id: run.suite_id,
          policy_set_id: run.policy_set_id,
          max_attempts_per_case: Number(run.model_config_snapshot?.attempt_budget ?? 1),
        }),
      });
      router.push(`/runs/${result.run_id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The scan could not be retried.");
      setRetrying(false);
    }
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">RUN DETAIL</p><h1>{shortId(runId)}</h1><p>Observable execution evidence from injected input through authorization, synthetic tool effects, and deterministic oracle classification.</p></div><div className="button-row"><Link href="/runs" className="button button-secondary">← All runs</Link>{run && ["queued", "running"].includes(run.status) && <button className="button button-danger" onClick={cancel}>Cancel</button>}{run?.status === "failed" && run.agent_id && run.suite_id && run.policy_set_id && <button className="button button-primary" onClick={retry} disabled={retrying}>{retrying ? "Retrying…" : "↻ Retry scan"}</button>}<a className="button button-secondary" href={`/api/reports/${runId}?format=json`}>↓ JSON</a><a className="button button-primary" href={`/api/reports/${runId}?format=markdown`}>↓ Report</a></div></div>
    {error && <div className="alert alert-error" style={{ marginBottom:16 }}>⚠ {error}</div>}
    {run && <div className={run.status === "failed" ? "alert alert-error" : "alert alert-info"} style={{ marginBottom:16 }}><StatusBadge status={run.status} /> <span>{statusMessage}</span></div>}
    {run?.status === "failed" && <section className="panel run-failure" aria-labelledby="run-failure-title"><div><p className="eyebrow">EVALUATION INTERRUPTED</p><h2 id="run-failure-title">No security conclusion was produced</h2><p>The run stopped before all evidence and attempts could be recorded. Retry the same configuration after the underlying problem is resolved.</p></div><details><summary>Technical details</summary><pre>{run.error ?? "No additional error details were recorded."}</pre></details></section>}
    <section className="metric-grid"><MetricCard label="Attempts" value={metricsUnavailable ? "—" : (run?.summary?.total_attempts ?? attempts)} detail={metricsUnavailable ? "Unavailable — run failed" : `${run?.summary?.valid_attempts ?? 0} valid denominator`} icon="◎" tone="cyan"/><MetricCard label="Executed" value={metricsUnavailable ? "—" : (run?.summary?.verified_executed_violations ?? 0)} detail={metricsUnavailable ? "No conclusion produced" : "Verified prohibited effects"} icon="!" tone="danger"/><MetricCard label="Blocked" value={metricsUnavailable ? "—" : (run?.summary?.blocked_attempts ?? 0)} detail={metricsUnavailable ? "No conclusion produced" : "Stopped before state change"} icon="⊘" tone="warning"/><MetricCard label="Success rate" value={metricsUnavailable ? "—" : `${Math.round((run?.summary?.attack_success_rate ?? 0)*100)}%`} detail={metricsUnavailable ? "Not calculated" : "Executed / valid attempts"} icon="↗" tone="success"/></section>
    <section className="detail-layout"><div className="panel"><div className="panel-header"><div><h2>Execution trace</h2><p>Click an event to inspect redacted arguments and results</p></div><span className="badge">{events.length} events</span></div><div className="trace-filter"><span className="filter-chip active">All evidence</span><span className="filter-chip">Tool calls</span><span className="filter-chip">Policy decisions</span><span className="filter-chip">State changes</span></div>{events.length ? <div className="timeline">{events.map((event) => { const details = { ...(event.arguments_redacted ?? {}), ...(event.result_redacted ?? {}) }; const hasDetails = Object.keys(details).length > 0; return <div className="event-row" key={event.event_id}><span className="event-node">{eventIcons[event.type] ?? "·"}</span><button className="event-content" style={{ textAlign:"left", cursor:hasDetails?"pointer":"default" }} onClick={() => hasDetails && setExpanded(expanded === event.event_id ? null : event.event_id)}><div className="event-title"><strong>{event.type.replaceAll("_", " ")} · {event.source}</strong><span>#{event.sequence} {formatDate(event.timestamp)}</span></div><p>{event.message}</p>{event.policy_ids.length > 0 && <div className="tag-list" style={{ marginTop:6 }}>{event.policy_ids.map((id) => <span className="tag mono" key={id}>{id}</span>)}</div>}{expanded === event.event_id && <pre className="event-details">{JSON.stringify(details,null,2)}</pre>}</button></div>; })}</div> : <EmptyState icon="⌁" title={run?.status === "failed" ? "No evidence captured" : run?.status === "completed" ? "No trace events recorded" : "Waiting for evidence"} body={run?.status === "failed" ? "This run stopped before trace evidence could be stored. Retry the scan to generate a fresh evaluation." : "Events appear after the controlled run reaches a terminal state."} />}</div>
      <aside className="stack"><div className="panel"><div className="panel-header"><div><h2>Run configuration</h2><p>Reproducibility metadata</p></div></div><div className="config-list"><div className="config-row"><span>Agent</span><strong>{run?.agent_id ?? "—"}</strong></div><div className="config-row"><span>Suite</span><strong>{run?.suite_id ?? run?.scenario ?? "—"}</strong></div><div className="config-row"><span>Policy</span><strong>{run?.policy_set_id ?? "—"}</strong></div><div className="config-row"><span>Defense</span><strong>{run?.defense_id ?? "baseline / observe"}</strong></div><div className="config-row"><span>Network</span><strong>{String(run?.model_config_snapshot?.network_mode ?? "offline")}</strong></div><div className="config-row"><span>Budget</span><strong>{String(run?.model_config_snapshot?.attempt_budget ?? "—")} / case</strong></div></div></div>
        <div className="panel"><div className="panel-header"><div><h2>Verified findings</h2><p>Deduplicated by case and policy</p></div><span className="badge">{findings.length}</span></div>{findings.length ? findings.map((finding) => <article className="finding-card" key={finding.finding_id}><div style={{ display:"flex",justifyContent:"space-between",gap:8 }}><span className="severity">{finding.severity}</span><OutcomeBadge outcome={finding.outcome}/></div><h3>{finding.title}</h3><p>{finding.actual_effect}</p><div className="tag-list" style={{ marginTop:9 }}><span className="tag mono">{finding.policy_id}</span><span className="tag">{finding.trust_boundary}</span></div></article>) : <div style={{ padding:16 }}><p style={{ color:"var(--muted)",fontSize:10,lineHeight:1.5 }}>No policy finding has been recorded. An inconclusive or clean attempt is not proof of universal safety.</p></div>}</div>
      </aside></section>
  </>;
}
