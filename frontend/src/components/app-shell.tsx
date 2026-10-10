"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Overview", icon: "◫" },
  { href: "/agents", label: "Agents", icon: "◎" },
  { href: "/suites", label: "Test suites", icon: "◇" },
  { href: "/runs", label: "Runs", icon: "▶" },
  { href: "/defenses", label: "Defenses", icon: "⬡" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="AgentBreak overview">
          <span className="brand-mark"><span /></span>
          <span><b>Agent</b>Break</span>
        </Link>
        <div className="workspace-label">SECURITY WORKSPACE</div>
        <nav className="nav-list" aria-label="Primary navigation">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`}>
                <span className="nav-icon" aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="isolation-card">
            <span className="status-dot" />
            <div><strong>Sandbox isolated</strong><small>No public side effects</small></div>
          </div>
          <div className="version-row"><span>AgentBreak MVP</span><span>v0.1</span></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-context">
            <span className="mobile-brand">AB</span>
            <span>Controlled AI security evaluation</span>
          </div>
          <div className="topbar-meta">
            <span className="offline-pill"><span className="status-dot" /> OFFLINE SIMULATOR</span>
            <span className="avatar">YK</span>
          </div>
        </header>
        <div className="content-wrap">{children}</div>
      </main>
    </div>
  );
}

