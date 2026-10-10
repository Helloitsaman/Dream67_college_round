"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatDate, shortId } from "@/lib/api";
import type { Agent, Health, PageResult, Run, TestSuite } from "@/lib/types";
import { EmptyState, MetricCard, StatusBadge } from "@/components/ui";
import { ScanLauncher } from "@/components/scan-launcher";

export function DashboardClient() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLauncher, setShowLauncher] = useState(false);

  const load = useCallback(async () => {
    try {
      const [runPage, agentPage, suitePage, healthResult] = await Promise.all([
        api<PageResult<Run>>("runs?limit=8"), api<PageResult<Agent>>("agents"),
        api<PageResult<TestSuite>>("suites"), api<Health>("health"),
      ]);
      setRuns(runPage.items); setAgent(agentPage.items[0] ?? null); setSuite(suitePage.items[0] ?? null); setHealth(healthResult); setError(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Dashboard data is unavailable."); }
  }, []);
  useEffect(() => { const initial = window.setTimeout(() => void load(), 0); const timer = window.setInterval(load, 4000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, [load]);

  const metrics = useMemo(() => runs.reduce((acc, run) => ({
    violations: acc.violations + run.summary.verified_executed_violations,
    blocked: acc.blocked + run.summary.blocked_attempts,
    attempts: acc.attempts + run.summary.total_attempts,
  }), { violations: 0, blocked: 0, attempts: 0 }), [runs]);
  const completed = runs.filter((run) => run.status === "completed");
  const attackRate = completed.length ? Math.round((completed.reduce((sum, run) => sum + run.summary.attack_success_rate, 0) / completed.length) * 100) : 0;

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">OVERVIEW</p><h1>Security posture at a glance</h1><p>Test an authorized AI agent against controlled prompt-injection surfaces, inspect observable evidence, and verify real policy enforcement.</p></div>
        <div className="button-row"><button className="button button-secondary" onClick={() => void load()}>↻ Refresh</button><button className="button button-primary" onClick={() => setShowLauncher((value) => !value)}>＋ New scan</button></div>
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {error}</div>}
      {health?.warning && <div className="alert alert-info" style={{ marginBottom: 16 }}>ⓘ {health.warning}</div>}
      {showLauncher && <section className="panel" style={{ marginBottom: 18 }}><div className="panel-header"><div><h2>Launch controlled evaluation</h2><p>Review the target, suite, policy, and bounded test budget.</p></div></div><div style={{ padding: 18 }}><ScanLauncher /></div></section>}
      <section className="metric-grid">
        <MetricCard label="Total runs" value={runs.length} detail={`${runs.filter((run) => run.status === "running").length} currently active`} icon="▶" tone="cyan" />
        <MetricCard label="Verified violations" value={metrics.violations} detail="Confirmed synthetic side effects" icon="!" tone="danger" />
        <MetricCard label="Blocked attempts" value={metrics.blocked} detail="Denied before execution" icon="⊘" tone="warning" />
        <MetricCard label="Observed success rate" value={`${attackRate}%`} detail={`${metrics.attempts} total attempts in view`} icon="↗" tone="success" />
      </section>
      <section className="dashboard-grid">
        <div className="stack">
          <div className="panel">
            <div className="panel-header"><div><h2>Recent evaluation runs</h2><p>Live scan status and evidence-backed outcomes</p></div><Link className="panel-link" href="/runs">View all →</Link></div>
            {runs.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Run</th><th>Status</th><th>Attempts</th><th>Executed</th><th>Blocked</th><th>Started</th></tr></thead><tbody>{runs.map((run) => <tr key={run.run_id}><td><Link className="primary-cell" href={`/runs/${run.run_id}`}><span className="row-icon">⌁</span><span><strong>{shortId(run.run_id)}</strong><small>{run.defense_id ? "defended replay" : "baseline evaluation"}</small></span></Link></td><td><StatusBadge status={run.status} /></td><td>{run.summary.total_attempts}</td><td>{run.summary.verified_executed_violations}</td><td>{run.summary.blocked_attempts}</td><td>{formatDate(run.created_at)}</td></tr>)}</tbody></table></div> : <EmptyState title="No scans yet" body="Launch the built-in controlled suite to produce your first evidence-backed assessment." action={<button className="button button-primary" onClick={() => setShowLauncher(true)}>Start first scan</button>} />}
          </div>
          <div className="panel"><div className="panel-header"><div><h2>Evaluation coverage</h2><p>Current built-in suite by attack surface</p></div></div><div style={{ padding: 18 }}><div className="risk-bar"><div className="risk-fill" style={{ width: suite ? "100%" : "0%" }} /></div><div className="risk-scale"><span>Email injection</span><span>RAG poisoning</span><span>Tool output</span></div><div className="config-list" style={{ marginTop: 12 }}>{suite?.cases.map((testCase) => <div className="config-row" key={testCase.case_id}><span>{testCase.name}</span><strong>{testCase.attack_surface.replace("_", " ")}</strong></div>)}</div></div></div>
        </div>
        <div className="stack">
          <div className="panel"><div className="panel-header"><div><h2>Active target</h2><p>Controlled execution environment</p></div><Link href="/agents" className="panel-link">Details →</Link></div>{agent ? <div className="config-list"><div className="config-row"><span>Agent</span><strong>{agent.name}</strong></div><div className="config-row"><span>Runtime</span><strong>{agent.model}</strong></div><div className="config-row"><span>Tools</span><strong>{agent.tool_ids.length} simulated</strong></div><div className="config-row"><span>Policy</span><strong>{agent.policy_set_id}</strong></div><div className="config-row"><span>Storage</span><strong>{health?.storage ?? "checking…"}</strong></div></div> : <div style={{ padding: 18 }}><span className="skeleton" /></div>}</div>
          <div className="panel"><div className="panel-header"><div><h2>Quick scan</h2><p>Deterministic mock mode</p></div></div><div style={{ padding: 4 }}><ScanLauncher compact /></div></div>
          <div className="alert alert-info">ⓘ Results distinguish model proposals from actual side effects. Injection detection alone is never counted as a successful exploit.</div>
        </div>
      </section>
    </>
  );
}
