/**
 * Plunder & Riffle MCP client (server-side only).
 *
 * Endpoint: https://bot.plunderandriffle.com/api/mcp
 * Transport: Streamable HTTP (one JSON-RPC message per POST).
 * Auth:      Authorization: Bearer <PLUNDER_RIFFLE_API_KEY>  (server-side env only)
 *
 * Live tool inventory verified 2026-10-29 (server: "meme-engine" v1.0.0):
 *  - list_ad_options, generate_ad_creative, generate_multilanguage_ads,
 *    export_ad_assets, request_mp4, create_funnel, create_one_minute,
 *    create_video_pack, localize_1minute, publish_clip, chat_with_brand,
 *    create_sitdown, create_phone_demo, create_ridiculous, create_news,
 *    create_best_of, get_best_of, shop, create_before_pitch, create_two_step,
 *    continue_two_step, find_leads, list_outreach_queue, mark_outreach,
 *    create_demo_pack, create_followup, get_job_status, get_usage, get_account
 */

import { resolveKey } from "@/lib/runtime-keys";

const MCP_URL =
  process.env.PLUNDER_RIFFLE_MCP_URL || "https://bot.plunderandriffle.com/api/mcp";

export type McpSuccess<T> = { ok: true; data: T };
export type McpFailure = { ok: false; error: string; code: McpErrorCode };
export type McpResult<T> = McpSuccess<T> | McpFailure;

export type McpErrorCode =
  | "no_key"
  | "auth_failed"
  | "timeout"
  | "network"
  | "tool_error"
  | "parse_error";

/**
 * Key resolution: runtime BYOK store first (pasted from the setup panel),
 * then the PLUNDER_RIFFLE_API_KEY env var. Both stay server-side only.
 */
export async function getMcpKey(): Promise<string | null> {
  return resolveKey("plunder_riffle");
}

export async function mcpKeyConfigured(): Promise<boolean> {
  const key = await getMcpKey();
  return typeof key === "string" && key.trim().length > 8;
}

export function mcpUrl(): string {
  return MCP_URL;
}

let rpcId = 1;

function extractText(result: unknown): string | null {
  if (result && typeof result === "object" && "content" in result) {
    const content = (result as { content?: unknown }).content;
    if (Array.isArray(content)) {
      const textBlock = content.find(
        (c) => c && typeof c === "object" && (c as { type?: string }).type === "text"
      ) as { text?: string } | undefined;
      if (textBlock && typeof textBlock.text === "string") return textBlock.text;
    }
  }
  return null;
}

/**
 * Call an MCP tool. Returns typed result with ok flag — never throws for
 * expected failures (auth, timeout, tool error) so routes can degrade
 * gracefully to labeled demonstration fallbacks.
 */
export async function callMcpTool<T = unknown>(
  toolName: string,
  args: Record<string, unknown> = {},
  timeoutMs = 90_000
): Promise<McpResult<T>> {
  const apiKey = await getMcpKey();
  if (!apiKey || apiKey.trim().length <= 8) {
    return {
      ok: false,
      code: "no_key",
      error:
        "P&R MCP API key is not configured on the server (BYOK setup panel or PLUNDER_RIFFLE_API_KEY). Running in demonstration mode.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: rpcId++,
        method: "tools/call",
        params: { name: toolName, arguments: args },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        code: "auth_failed",
        error: "P&R MCP rejected the API key (auth failed).",
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        code: "network",
        error: `P&R MCP returned HTTP ${res.status}.`,
      };
    }

    const payload = (await res.json()) as {
      jsonrpc?: string;
      id?: number | null;
      result?: unknown;
      error?: { code?: number; message?: string };
    };

    if (payload.error) {
      return {
        ok: false,
        code: "tool_error",
        error: payload.error.message || "MCP tool call failed.",
      };
    }

    const text = extractText(payload.result);
    if (text === null) {
      return { ok: true, data: (payload.result ?? {}) as T };
    }

    try {
      return { ok: true, data: JSON.parse(text) as T };
    } catch {
      // Tool returned plain text — wrap it.
      return { ok: true, data: { text } as unknown as T };
    }
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      code: isAbort ? "timeout" : "network",
      error: isAbort
        ? `P&R MCP call timed out after ${Math.round(timeoutMs / 1000)}s.`
        : err instanceof Error
          ? err.message
          : "Unknown network error calling P&R MCP.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Lightweight connection probe (tools/list) with in-memory caching.  */
/* ------------------------------------------------------------------ */

export type McpStatus = {
  keyConfigured: boolean;
  connected: boolean;
  serverName: string | null;
  serverVersion: string | null;
  error: string | null;
  checkedAt: number;
};

let statusCache: McpStatus | null = null;
const STATUS_TTL_MS = 60_000;

export async function probeMcpStatus(force = false): Promise<McpStatus> {
  if (!force && statusCache && Date.now() - statusCache.checkedAt < STATUS_TTL_MS) {
    return statusCache;
  }

  const apiKey = await getMcpKey();
  const keyConfigured = typeof apiKey === "string" && apiKey.trim().length > 8;
  const base: McpStatus = {
    keyConfigured,
    connected: false,
    serverName: null,
    serverVersion: null,
    error: null,
    checkedAt: Date.now(),
  };

  if (!base.keyConfigured) {
    base.error = "API key not configured";
    statusCache = base;
    return base;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 0,
        method: "tools/list",
        params: {},
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      base.error = `HTTP ${res.status}`;
      statusCache = base;
      return base;
    }
    const payload = (await res.json()) as {
      result?: { serverInfo?: { name?: string; version?: string } };
      error?: { message?: string };
    };
    if (payload.error) {
      base.error = payload.error.message || "tools/list failed";
      statusCache = base;
      return base;
    }
    base.connected = true;
    base.serverName = payload.result?.serverInfo?.name ?? "unknown";
    base.serverVersion = payload.result?.serverInfo?.version ?? null;
    statusCache = base;
    return base;
  } catch (err) {
    base.error =
      err instanceof Error
        ? err.name === "AbortError"
          ? "probe timed out"
          : err.message
        : "probe failed";
    statusCache = base;
    return base;
  } finally {
    clearTimeout(timer);
  }
}
