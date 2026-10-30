"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* MCP status (single source of truth, polled)                         */
/* ------------------------------------------------------------------ */

export type McpStatusData = {
  mcp: {
    keyConfigured: boolean;
    connected: boolean;
    serverName: string | null;
    serverVersion: string | null;
    error: string | null;
  };
  checkedAt: number;
};

export function useMcpStatus() {
  const [status, setStatus] = useState<McpStatusData | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: McpStatusData) => alive && setStatus(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return status;
}

export function McpStatusPill({ className }: { className?: string }) {
  const status = useMcpStatus();
  const live = status?.mcp.connected;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] tracking-widest uppercase",
        live
          ? "border-teal-400/40 bg-teal-400/10 text-teal-300"
          : "border-amber-400/40 bg-amber-400/10 text-amber-300",
        className
      )}
      title={
        live
          ? `P&R MCP connected: ${status?.mcp.serverName ?? ""}`
          : status?.mcp.error ?? "Checking P&R MCP…"
      }
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-teal-400" : "bg-amber-400 amber-dot")} />
      {status === null
        ? "P&R MCP: …"
        : live
          ? `P&R MCP: Live · ${status.mcp.serverName ?? "connected"}`
          : "P&R MCP: Demo mode"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Provenance labels — the honesty system                              */
/* ------------------------------------------------------------------ */

export type Provenance = "pnr" | "ai" | "demo" | "simulated";

const PROV_MAP: Record<Provenance, { label: string; cls: string }> = {
  pnr: {
    label: "Generated via P&R MCP",
    cls: "border-teal-400/40 bg-teal-400/10 text-teal-300",
  },
  ai: {
    label: "AI-drafted",
    cls: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  },
  demo: {
    label: "Demonstration data",
    cls: "border-white/15 bg-white/5 text-zinc-400",
  },
  simulated: {
    label: "Simulated stream",
    cls: "border-white/15 bg-white/5 text-zinc-500",
  },
};

export function ProvenanceBadge({
  kind,
  className,
}: {
  kind: Provenance;
  className?: string;
}) {
  const p = PROV_MAP[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase whitespace-nowrap",
        p.cls,
        className
      )}
    >
      {kind === "pnr" ? "◈ " : kind === "ai" ? "✦ " : "◇ "}
      {p.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Shared fetch helper                                                 */
/* ------------------------------------------------------------------ */

export async function postJson<T>(
  url: string,
  body: unknown
): Promise<{ ok: boolean; status: number; data: T & { error?: string; code?: string } }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: { error: err instanceof Error ? err.message : "Network error" } as T & {
        error?: string;
      },
    };
  }
}
