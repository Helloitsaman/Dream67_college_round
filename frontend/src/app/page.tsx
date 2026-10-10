
"use client";

import { useState } from "react";

type ScanEvent = {
  step: number;
  type: string;
  message: string;
  details: Record<string, unknown>;
};

type ScanResult = {
  run_id: string;
  scenario: string;
  agent_mode: "vulnerable" | "protected";
  status: string;
  attack_success: boolean;
  outcome: string;
  finding: {
    title: string;
    severity: string;
    evidence: string;
  };
  events: ScanEvent[];
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function Home() {
  const [mode, setMode] = useState<
    "vulnerable" | "protected"
  >("vulnerable");

  const [result, setResult] = useState<ScanResult | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runScan() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `${API_URL}/api/demo/scan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agent_mode: mode,
          }),
        }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `API error ${response.status}: ${body}`
        );
      }

      const data: ScanResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Scan request failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <p className="text-cyan-400 text-sm font-semibold">
            AGENTBREAK / SECURITY LAB
          </p>
          <h1 className="text-4xl font-bold">
            AI Agent Security Testing
          </h1>
          <p className="text-slate-400">
            Execute a controlled security scenario,
            examine evidence, and compare agent behavior.
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <h2 className="text-xl font-semibold">
            New Security Scan
          </h2>

          <div className="space-y-2">
            <label
              htmlFor="agent-mode"
              className="block text-sm text-slate-300"
            >
              Target agent configuration
            </label>

            <select
              id="agent-mode"
              value={mode}
              onChange={(e) =>
                setMode(
                  e.target.value as
                  | "vulnerable"
                  | "protected"
                )
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
            >
              <option value="vulnerable">
                Vulnerable Demo Agent
              </option>
              <option value="protected">
                Protected Demo Agent
              </option>
            </select>
          </div>

          <button
            onClick={runScan}
            disabled={loading}
            className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "Running Scan..." : "Run Security Scan"}
          </button>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-700 bg-red-950 p-4 text-red-200"
            >
              {error}
            </div>
          )}
        </section>

        {result && (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
                  Scan Status
                </p>
                <p className="mt-2 text-xl font-bold capitalize">
                  {result.status}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
                  Simulated Attack
                </p>
                <p
                  className={`mt-2 text-xl font-bold ${result.attack_success
                      ? "text-red-400"
                      : "text-emerald-400"
                    }`}
                >
                  {result.attack_success
                    ? "Succeeded"
                    : "Not Observed"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
                  Finding Severity
                </p>
                <p className="mt-2 text-xl font-bold uppercase">
                  {result.finding.severity}
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">
                Security Finding
              </h2>

              <p className="mt-3 font-medium">
                {result.finding.title}
              </p>

              <p className="mt-2 text-slate-400">
                {result.finding.evidence}
              </p>

              <p className="mt-3 text-sm text-slate-500">
                Outcome: {result.outcome}
              </p>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-5 text-xl font-semibold">
                Execution Trace
              </h2>

              <div className="space-y-4">
                {result.events.map((event) => (
                  <div
                    key={event.step}
                    className="border-l-2 border-cyan-500 pl-4"
                  >
                    <p className="text-sm text-cyan-400">
                      Step {event.step} — {event.type}
                    </p>

                    <p className="mt-1">
                      {event.message}
                    </p>

                    {Object.keys(event.details).length > 0 && (
                      <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-400">
                        {JSON.stringify(
                          event.details,
                          null,
                          2
                        )}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <p className="text-xs text-slate-500">
              Run ID: {result.run_id}
              <br />
              This demonstration uses scripted agent
              behavior and simulated tools. It does not
              execute real attacks.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
