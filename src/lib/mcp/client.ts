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
      // Read the body even on failure so proxies' HTML error pages don't
      // matter — we report the status code cleanly.
      return {
        ok: false,
        code: "network",
        error: `P&R MCP returned HTTP ${res.status}.`,
      };
    }

    const rawBody = await res.text();
    let payload: {
      jsonrpc?: string;
      id?: number | null;
      result?: unknown;
      error?: { code?: number; message?: string };
    } | null = null;
    try {
      payload = JSON.parse(rawBody) as typeof payload;
    } catch {
      payload = null;
    }
    if (!payload) {
      // 2xx but the body isn't JSON-RPC — e.g. an HTML page slipped through a
      // proxy. Report it honestly instead of leaking a JSON parse error.
      const looksHtml = /^\s*<(?:!doctype|html)/i.test(rawBody);
      return {
        ok: false,
        code: "parse_error",
        error: looksHtml
          ? `P&R MCP returned an HTML page (HTTP ${res.status}) instead of a JSON-RPC response — likely a temporary gateway error. Nothing was generated; please retry.`
          : `P&R MCP returned a non-JSON response (HTTP ${res.status}). Nothing was generated; please retry.`,
      };
    }

    if (payload.error) {
      return {
        ok: false,
        code: "tool_error",
        error: payload.error.message || "MCP tool call failed.",
      };
    }

    const result = (payload.result ?? {}) as Record<string, unknown>;

    // 1) MCP structuredContent, when the server provides it.
    const structured = result.structuredContent;
    if (structured && typeof structured === "object") {
      return { ok: true, data: structured as T };
    }

    // 2) First text block, JSON-parsed (this engine packs its payload as a
    //    JSON string inside content[0].text).
    const text = extractText(result);
    if (text !== null) {
      try {
        return { ok: true, data: JSON.parse(text) as T };
      } catch {
        // The engine replied with plain text instead of a JSON payload —
        // usually a human-readable status/error (credits, scope, queue…).
        // Surface the engine's actual words instead of pretending success
        // with an empty object.
        console.error("[mcp/client] non-JSON text result:", text.slice(0, 240));
        return {
          ok: false,
          code: "tool_error",
          error: `P&R engine replied with plain text instead of a JSON payload: “${text.slice(0, 280)}”`,
        };
      }
    }

    // 3) No text and no structuredContent — log for diagnosis and hand back
    //    the raw envelope so callers see an honestly empty result.
    console.error(
      "[mcp/client] result had neither text nor structuredContent:",
      JSON.stringify(result).slice(0, 240)
    );
    return { ok: true, data: result as T };
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
    const rawBody = await res.text();
    let payload: {
      result?: { serverInfo?: { name?: string; version?: string } };
      error?: { message?: string };
    } | null = null;
    try {
      payload = JSON.parse(rawBody) as typeof payload;
    } catch {
      payload = null;
    }
    if (!payload) {
      base.error = `non-JSON probe response (HTTP ${res.status})`;
      statusCache = base;
      return base;
    }
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
