"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, formatDate, shortId } from "@/lib/api";
import type { AgentIntegration, Campaign, PageResult } from "@/lib/types";
import { EmptyState, StatusBadge } from "@/components/ui";

export function CampaignsClient() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<AgentIntegration[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(5);
  const [mode, setMode] = useState<Campaign["control_mode"]>("vulnerable");

  const load = useCallback(async () => {
    try {
      const [integrationPage, campaignPage] = await Promise.all([
        api<PageResult<AgentIntegration>>("agents/integrations"),
        api<PageResult<Campaign>>("campaigns?limit=25"),
      ]);
      setIntegrations(integrationPage.items);
      setCampaigns(campaignPage.items);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Phase 2 data is unavailable.");
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function register(formData: FormData) {
    setBusy(true); setError(null);
    try {
      await api<AgentIntegration>("agents/integrations", {
        method: "POST",
        body: JSON.stringify({ name: formData.get("name"), endpoint: formData.get("endpoint") }),
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "External agent registration failed.");
    } finally { setBusy(false); }
  }

  async function launch(formData: FormData) {
    setBusy(true); setError(null);
    try {
      const result = await api<{ campaign_id: string }>("campaigns", {
        method: "POST",
        body: JSON.stringify({
          integration_id: formData.get("integration_id"),
          scenario_id: "document_injection_01",
          max_attempts: attempts,
          control_mode: mode,
        }),
      });
      router.push(`/campaigns/${result.campaign_id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Campaign could not be started.");
      setBusy(false);
    }
  }

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">PHASE 2 · EXTERNAL AGENT</p><h1>Adaptive campaigns</h1><p>Connect one allowlisted test agent, revise synthetic document injections from observed feedback, and verify outcomes from trusted tool telemetry.</p></div>
      <button className="button button-secondary" onClick={() => void load()}>↻ Refresh</button>
    </div>
    {error && <div className="alert alert-error" style={{ marginBottom:16 }}>⚠ {error}</div>}
    <div className="dashboard-grid">
      <div className="stack">
        <section className="panel">
          <div className="panel-header"><div><h2>Campaign history</h2><p>Persisted external-agent evaluations</p></div><span className="badge">{campaigns.length} campaigns</span></div>
          {campaigns.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Campaign</th><th>Control</th><th>Status</th><th>Attempts</th><th>Executed</th><th>Created</th></tr></thead><tbody>{campaigns.map((campaign) => <tr key={campaign.campaign_id}><td><Link className="primary-cell" href={`/campaigns/${campaign.campaign_id}`}><span className="row-icon">⌁</span><span><strong>{shortId(campaign.campaign_id)}</strong><small>{campaign.scenario_id}</small></span></Link></td><td><span className="tag">{campaign.control_mode}</span></td><td><StatusBadge status={campaign.status}/></td><td>{campaign.summary?.total_attempts ?? 0} / {campaign.max_attempts}</td><td>{campaign.summary?.executed_violations ?? 0}</td><td>{formatDate(campaign.created_at)}</td></tr>)}</tbody></table></div> : <EmptyState title="No Phase 2 campaigns" body="Register the local external test agent, then launch the bounded document-injection scenario." />}
        </section>
        <section className="panel"><div className="panel-header"><div><h2>Registered external agents</h2><p>Exact-endpoint allowlist and protocol validation</p></div></div>{integrations.length ? <div className="config-list">{integrations.map((integration) => <div className="config-row" key={integration.integration_id}><span><strong>{integration.name}</strong><br/><span className="mono">{integration.endpoint}</span></span><span className="badge badge-completed"><span className="badge-dot"/>{integration.health_status} · v{integration.protocol_version}</span></div>)}</div> : <div style={{ padding:18, color:"var(--muted)", fontSize:11 }}>No external agent has been registered yet.</div>}</section>
      </div>
      <aside className="stack">
        <section className="panel"><div className="panel-header"><div><h2>Register test agent</h2><p>Connectivity and capabilities are validated</p></div></div><form action={register} style={{ padding:18 }} className="form-grid"><div className="field field-full"><label htmlFor="name">Display name</label><input id="name" name="name" defaultValue="External DocuAssist" required /></div><div className="field field-full"><label htmlFor="endpoint">Allowlisted endpoint</label><input id="endpoint" name="endpoint" defaultValue="http://127.0.0.1:8090" required /></div><div className="field field-full form-note">The browser never receives the service credential. Redirects and endpoints outside the server allowlist are rejected.</div><div className="field field-full"><button className="button button-secondary" disabled={busy} type="submit">{busy ? "Validating…" : "Validate and register"}</button></div></form></section>
        <section className="panel"><div className="panel-header"><div><h2>Launch bounded campaign</h2><p>One document surface · maximum five attempts</p></div></div><form action={launch} className="config-list"><div className="config-row"><label htmlFor="integration_id">Target</label><select id="integration_id" name="integration_id" required>{integrations.map((integration) => <option value={integration.integration_id} key={integration.integration_id}>{integration.name}</option>)}</select></div><div className="config-row"><label htmlFor="control_mode">Control</label><select id="control_mode" value={mode} onChange={(event) => setMode(event.target.value as Campaign["control_mode"])}><option value="vulnerable">Vulnerable positive</option><option value="protected">Protected negative</option><option value="benign">Benign utility</option></select></div><div className="config-row"><label htmlFor="campaign_attempts">Attempt budget</label><input id="campaign_attempts" type="number" min={1} max={5} value={attempts} onChange={(event) => setAttempts(Number(event.target.value))}/></div><div className="config-row"><button style={{ width:"100%" }} className="button button-primary" type="submit" disabled={busy || !integrations.length}>{busy ? "Starting…" : "▶ Start adaptive campaign"}</button></div></form></section>
      </aside>
    </div>
  </>;
}
