"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Agent, PageResult, PolicySet, TestSuite } from "@/lib/types";

export function ScanLauncher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [policies, setPolicies] = useState<PolicySet[]>([]);
  const [attempts, setAttempts] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<PageResult<Agent>>("agents"),
      api<PageResult<TestSuite>>("suites"),
      api<PageResult<PolicySet>>("policies"),
    ]).then(([a, s, p]) => { setAgents(a.items); setSuites(s.items); setPolicies(p.items); }).catch((reason: Error) => setError(reason.message));
  }, []);

  async function launch(formData: FormData) {
    setLoading(true); setError(null);
    try {
      const result = await api<{ run_id: string }>("runs", {
        method: "POST",
        body: JSON.stringify({
          agent_id: formData.get("agent_id"), suite_id: formData.get("suite_id"),
          policy_set_id: formData.get("policy_set_id"), max_attempts_per_case: attempts,
        }),
      });
      router.push(`/runs/${result.run_id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Scan could not be started."); setLoading(false); }
  }

  return (
    <form action={launch} className={compact ? "config-list" : "form-grid"}>
      <div className={compact ? "config-row" : "field"}>
        <label htmlFor="agent_id">Target agent</label>
        <select id="agent_id" name="agent_id" required>{agents.map((agent) => <option key={agent.agent_id} value={agent.agent_id}>{agent.name}</option>)}</select>
      </div>
      <div className={compact ? "config-row" : "field"}>
        <label htmlFor="suite_id">Test suite</label>
        <select id="suite_id" name="suite_id" required>{suites.map((suite) => <option key={suite.suite_id} value={suite.suite_id}>{suite.name}</option>)}</select>
      </div>
      <div className={compact ? "config-row" : "field"}>
        <label htmlFor="policy_set_id">Security policy</label>
        <select id="policy_set_id" name="policy_set_id" required>{policies.map((policy) => <option key={policy.policy_set_id} value={policy.policy_set_id}>{policy.name} v{policy.version}</option>)}</select>
      </div>
      <div className={compact ? "config-row" : "field"}>
        <label htmlFor="attempts">Attempts per attack</label>
        <input id="attempts" type="number" min={1} max={20} value={attempts} onChange={(event) => setAttempts(Number(event.target.value))} />
      </div>
      {!compact && <div className="field field-full form-note">Every attempt is reset into a private synthetic workspace. Email stays in a mock outbox, web access is fixture-only, and no host commands are available.</div>}
      {error && <div className={compact ? "alert alert-error" : "field field-full alert alert-error"}>⚠ {error}</div>}
      <div className={compact ? "config-row" : "field field-full"}>
        <button className="button button-primary" type="submit" disabled={loading || !agents.length || !suites.length || !policies.length}>{loading ? "Queuing scan…" : "▶ Launch controlled scan"}</button>
      </div>
    </form>
  );
}

