"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatDate, shortId } from "@/lib/api";
import type { Campaign, CampaignAttempt, PageResult, TrustedToolEvent, VerificationResult } from "@/lib/types";
import { EmptyState, MetricCard, OutcomeBadge, StatusBadge } from "@/components/ui";

type Evidence = { attempt: CampaignAttempt; events: TrustedToolEvent[]; verification: VerificationResult | null };

export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [attempts, setAttempts] = useState<CampaignAttempt[]>([]);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [current, attemptPage] = await Promise.all([
        api<Campaign>(`campaigns/${campaignId}`),
        api<PageResult<CampaignAttempt>>(`campaigns/${campaignId}/attempts`),
      ]);
      setCampaign(current); setAttempts(attemptPage.items); setError(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Campaign is unavailable."); }
  }, [campaignId]);

  const terminal = campaign ? ["completed", "failed", "cancelled"].includes(campaign.status) : false;
  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const timer = terminal ? undefined : window.setInterval(load, 2200);
    return () => { window.clearTimeout(first); if (timer) window.clearInterval(timer); };
  }, [load, terminal]);
  const adaptiveRevisions = useMemo(() => attempts.filter((item) => item.feedback_source_attempt_id).length, [attempts]);

  async function inspect(attemptId: string) {
    try { setEvidence(await api<Evidence>(`attempts/${attemptId}/evidence`)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Evidence could not be loaded."); }
  }
  async function cancel() { try { await api(`campaigns/${campaignId}/cancel`, { method:"POST", body:"{}" }); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Cancellation failed."); } }

  return <>
    <div className="page-heading"><div><p className="eyebrow">PHASE 2 CAMPAIGN</p><h1>{shortId(campaignId)}</h1><p>Feedback-adaptive document injections evaluated against authenticated external-agent telemetry and an independent deterministic oracle.</p></div><div className="button-row"><Link href="/campaigns" className="button button-secondary">← Campaigns</Link>{campaign && !terminal && <button className="button button-danger" onClick={cancel}>Cancel</button>}</div></div>
    {error && <div className="alert alert-error" style={{ marginBottom:16 }}>⚠ {error}</div>}
    {campaign && <div className="alert alert-info" style={{ marginBottom:16 }}><StatusBadge status={campaign.status}/> <span>{terminal ? `Finished ${formatDate(campaign.completed_at)}. Results are persisted and can be reopened after an API restart.` : "The bounded campaign is running. Attempts appear as their trusted evidence is verified."}</span></div>}
    <section className="metric-grid"><MetricCard label="Attempts" value={campaign?.summary?.total_attempts ?? attempts.length} detail={`${campaign?.max_attempts ?? 5} maximum budget`} icon="◎" tone="cyan"/><MetricCard label="Adaptive revisions" value={adaptiveRevisions} detail="Candidates generated from prior feedback" icon="↻" tone="warning"/><MetricCard label="Executed" value={campaign?.summary?.executed_violations ?? 0} detail="Proven mock-outbox disclosures" icon="!" tone="danger"/><MetricCard label="Blocked" value={campaign?.summary?.blocked_attempts ?? 0} detail="Denied before side effect" icon="⊘" tone="success"/></section>
    <section className="detail-layout"><div className="stack"><section className="panel"><div className="panel-header"><div><h2>Attempt lineage</h2><p>Payload revisions, feedback ancestry, and independent verdicts</p></div><span className="badge">{attempts.length} attempts</span></div>{attempts.length ? attempts.map((attempt) => <article className="finding-card" key={attempt.attempt_id}><div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"center" }}><div><span className="eyebrow">ATTEMPT {attempt.attempt_number}</span><h3 style={{ marginTop:0 }}>{shortId(attempt.attempt_id)}</h3></div>{attempt.verification ? <OutcomeBadge outcome={attempt.verification.verdict}/> : <StatusBadge status={attempt.status}/>}</div><p>{attempt.variation_summary || "Candidate generated for the approved document surface."}</p><div className="config-list" style={{ marginTop:10 }}><div className="config-row"><span>Parent attempt</span><strong>{attempt.parent_attempt_id ? shortId(attempt.parent_attempt_id) : "Initial candidate"}</strong></div><div className="config-row"><span>Feedback source</span><strong>{attempt.feedback_source_attempt_id ? shortId(attempt.feedback_source_attempt_id) : "None"}</strong></div><div className="config-row"><span>Payload digest</span><strong className="mono">{attempt.payload_sha256.slice(0,16)}…</strong></div></div><details style={{ marginTop:10 }}><summary className="panel-link" style={{ cursor:"pointer" }}>View injected document body</summary><pre className="event-details">{attempt.payload_text}</pre></details><button className="button button-secondary" style={{ marginTop:12 }} onClick={() => void inspect(attempt.attempt_id)}>Inspect trusted evidence</button></article>) : <EmptyState title="Waiting for the first attempt" body="The attacker candidate appears after generation and external-agent reset."/>}</section></div>
      <aside className="stack"><section className="panel"><div className="panel-header"><div><h2>Campaign configuration</h2><p>Bounded execution metadata</p></div></div><div className="config-list"><div className="config-row"><span>Scenario</span><strong>{campaign?.scenario_id ?? "—"}</strong></div><div className="config-row"><span>Control</span><strong>{campaign?.control_mode ?? "—"}</strong></div><div className="config-row"><span>Attacker</span><strong>{campaign?.attacker_model ?? "—"}</strong></div><div className="config-row"><span>Provider</span><strong>{campaign?.attacker_provider ?? "—"}</strong></div><div className="config-row"><span>Target</span><strong>{campaign?.integration_id ? shortId(campaign.integration_id) : "—"}</strong></div></div></section>
        <section className="panel"><div className="panel-header"><div><h2>Trusted evidence</h2><p>Observable events only—no private reasoning</p></div>{evidence?.verification && <OutcomeBadge outcome={evidence.verification.verdict}/>}</div>{evidence ? <div className="timeline">{evidence.verification && <div className="alert alert-info" style={{ marginBottom:10 }}>{evidence.verification.explanation}</div>}{evidence.events.map((event, index) => <div className="event-row" key={event.event_id}><span className="event-node">{event.event_type.includes("EXECUTED") ? "✓" : event.event_type.includes("BLOCKED") ? "⊘" : "·"}</span><div className="event-content"><div className="event-title"><strong>{event.event_type.replaceAll("_", " ")}</strong><span>#{index + 1}</span></div><p>{event.tool_name ?? event.source}</p>{Object.keys(event.details).length > 0 && <pre className="event-details">{JSON.stringify(event.details,null,2)}</pre>}</div></div>)}</div> : <div style={{ padding:16 }}><p style={{ color:"var(--muted)", fontSize:10, lineHeight:1.5 }}>Choose an attempt to inspect its correlated tool events and oracle evidence references.</p></div>}</section></aside>
    </section>
  </>;
}
