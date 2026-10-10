import type { ReactNode } from "react";
import type { OracleOutcome, RunStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: RunStatus | string }) {
  return <span className={`badge badge-${status.toLowerCase()}`}><span className="badge-dot" />{status}</span>;
}

export function OutcomeBadge({ outcome }: { outcome: OracleOutcome | string }) {
  const label = outcome.replaceAll("_", " ").replace("POLICY VIOLATION ", "");
  return <span className={`outcome outcome-${outcome.toLowerCase()}`}>{label}</span>;
}

export function MetricCard({ label, value, detail, tone = "neutral", icon }: { label: string; value: string | number; detail: string; tone?: "neutral" | "danger" | "warning" | "success" | "cyan"; icon: string }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-head"><span>{label}</span><span className="metric-icon">{icon}</span></div>
      <strong className="metric-value">{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function EmptyState({ icon = "◇", title, body, action }: { icon?: string; title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{body}</p>{action}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden />;
}

