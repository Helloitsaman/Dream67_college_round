import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentBreak — AI Agent Security Lab",
  description: "Controlled, evidence-backed security evaluation for AI agents.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><Suspense fallback={<div className="app-loading">Loading AgentBreak…</div>}><AppShell>{children}</AppShell></Suspense></body>
    </html>
  );
}
