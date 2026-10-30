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
    const raw = await res.text();
    let data: (T & { error?: string; code?: string }) | null = null;
    if (raw) {
      try {
        data = JSON.parse(raw) as T & { error?: string; code?: string };
      } catch {
        data = null;
      }
    }
    if (!data) {
      // Non-JSON body — almost always an HTML error page from a gateway/proxy
      // (timeout on a long generation) or a crashed upstream. Never leak the
      // raw "Unexpected token '<'" parse error into the UI.
      const looksHtml = /^\s*<(?:!doctype|html)/i.test(raw);
      data = {
        error: looksHtml
          ? `The server returned an HTML error page (HTTP ${res.status}) instead of JSON — usually a temporary gateway timeout on a long generation, or a transient proxy error. Nothing was generated; please try again in a moment.`
          : `The server returned a non-JSON response (HTTP ${res.status}). Nothing was generated; please try again.`,
        code: "non_json_response",
      } as T & { error?: string; code?: string };
    }
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
