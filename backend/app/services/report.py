from __future__ import annotations

from typing import Any

from app.db.store import DocumentStore


async def build_json_report(store: DocumentStore, run_id: str) -> dict[str, Any] | None:
    run = await store.get("runs", {"run_id": run_id})
    if not run:
        return None
    findings = await store.list("findings", {"run_id": run_id}, limit=1_000)
    attempts = await store.list("attempts", {"run_id": run_id}, limit=10_000)
    events = await store.list("trace_events", {"run_id": run_id}, sort=[("timestamp", 1)], limit=10_000)
    return {
        "schema_version": "1.0",
        "title": "AgentBreak controlled agent security assessment",
        "scope": "One synthetic Workplace Assistant, three controlled injection surfaces, and explicit deterministic policies.",
        "run": run,
        "metrics": run.get("summary", {}),
        "findings": findings,
        "attempts": attempts,
        "evidence": events,
        "limitations": [
            "This is not an exhaustive agent-security certification.",
            "No real email, host shell, production credential, or arbitrary public URL was used.",
            "Unsuccessful attempts are not proof of safety.",
        ],
    }


def build_markdown_report(report: dict[str, Any]) -> str:
    run = report["run"]
    metrics = report["metrics"]
    lines = [
        "# AgentBreak controlled agent security assessment",
        "",
        f"- Run: `{run['run_id']}`",
        f"- Status: **{run['status']}**",
        f"- Agent: `{run['agent_id']}`",
        f"- Suite: `{run['suite_id']}`",
        f"- Defense: `{run.get('defense_id') or 'baseline (not enforced)'}`",
        f"- Attempts: {metrics.get('total_attempts', 0)}",
        f"- Verified executed violations: {metrics.get('verified_executed_violations', 0)}",
        f"- Blocked attempts: {metrics.get('blocked_attempts', 0)}",
        f"- Inconclusive: {metrics.get('inconclusive_attempts', 0)}",
        "",
        "## Findings",
        "",
    ]
    if not report["findings"]:
        lines.append("No policy finding was recorded within the configured budget.")
    for finding in report["findings"]:
        lines.extend(
            [
                f"### {finding['title']}",
                "",
                f"- Policy: `{finding['policy_id']}`",
                f"- Outcome: **{finding['outcome']}**",
                f"- Severity: **{finding['severity']}**",
                f"- Trust boundary: `{finding['trust_boundary']}`",
                f"- Verification: {finding['actual_effect']}",
                f"- Mitigation: {finding['suggested_mitigation']}",
                "",
            ]
        )
    lines.extend(["## Limitations", ""])
    lines.extend(f"- {item}" for item in report["limitations"])
    return "\n".join(lines) + "\n"

