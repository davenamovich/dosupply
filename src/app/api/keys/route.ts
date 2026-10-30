import { NextRequest, NextResponse } from "next/server";
import { callMcpTool } from "@/lib/mcp/client";
import { clientIp, guessesBlocked, recordFailedGuess } from "@/lib/ai";
import {
  allKeyStatuses,
  clearRuntimeKey,
  passcodeValid,
  setRuntimeKey,
  ServiceKey,
} from "@/lib/runtime-keys";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/* GET — masked key status only (raw keys NEVER leave the server)      */
/* ------------------------------------------------------------------ */
export async function GET() {
  const keys = await allKeyStatuses();
  return NextResponse.json({ keys });
}

/* ------------------------------------------------------------------ */
/* POST — set BYOK keys (passcode-gated). Probes P&R before storing.   */
/* body: { passcode, keys: { plunder_riffle?, exa? } }                 */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  let body: {
    passcode?: string;
    keys?: Partial<Record<ServiceKey, string>>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ip = clientIp(req);
  if (guessesBlocked(ip)) {
    return NextResponse.json({ error: "Too many wrong passcodes. Try again in a few minutes." }, { status: 429 });
  }
  if (!passcodeValid(body.passcode)) {
    recordFailedGuess(ip);
    return NextResponse.json(
      { error: "Invalid setup passcode." },
      { status: 401 }
    );
  }

  const keys = body.keys || {};
  const results: Record<string, unknown> = {};

  // --- Plunder & Riffle: verify with a real auth-gated tools/call before saving ---
  if (typeof keys.plunder_riffle === "string" && keys.plunder_riffle.trim().length > 8) {
    const key = keys.plunder_riffle.trim();
    const probe = await probePrKey(key);
    if (!probe.valid) {
      return NextResponse.json(
        {
          error: `P&R key rejected by bot.plunderandriffle.com: ${probe.detail}. Nothing was saved.`,
        },
        { status: 400 }
      );
    }
    await setRuntimeKey("plunder_riffle", key);
    results.plunder_riffle = { saved: true, probe: "ok", account: probe.detail };
  }

  // --- Exa: shape check only (a live probe costs a search call) ---
  if (typeof keys.exa === "string" && keys.exa.trim().length > 8) {
    const key = keys.exa.trim();
    const probe = await probeExaKey(key);
    await setRuntimeKey("exa", key);
    results.exa = {
      saved: true,
      probe: probe.valid ? "ok" : `warning: ${probe.detail}`,
    };
  }

  const updated = await allKeyStatuses();
  return NextResponse.json({ saved: results, keys: updated });
}

/* ------------------------------------------------------------------ */
/* DELETE — clear runtime keys (passcode-gated)                        */
/* body or query: passcode, service ("plunder_riffle" | "exa" | "all") */
/* ------------------------------------------------------------------ */
export async function DELETE(req: NextRequest) {
  let passcode: string | null = null;
  let service: string | null = null;

  try {
    const body = (await req.json()) as { passcode?: string; service?: string };
    passcode = body.passcode ?? null;
    service = body.service ?? null;
  } catch {
    passcode = req.nextUrl.searchParams.get("passcode");
    service = req.nextUrl.searchParams.get("service");
  }

  const ip = clientIp(req);
  if (guessesBlocked(ip)) {
    return NextResponse.json({ error: "Too many wrong passcodes. Try again in a few minutes." }, { status: 429 });
  }
  if (!passcodeValid(passcode)) {
    recordFailedGuess(ip);
    return NextResponse.json({ error: "Invalid setup passcode." }, { status: 401 });
  }

  const target = service || "all";
  if (target === "all" || target === "plunder_riffle") await clearRuntimeKey("plunder_riffle");
  if (target === "all" || target === "exa") await clearRuntimeKey("exa");

  const updated = await allKeyStatuses();
  return NextResponse.json({ cleared: target, keys: updated });
}

/* ------------------------------------------------------------------ */
/* Probe helpers                                                       */
/* ------------------------------------------------------------------ */

async function probePrKey(
  key: string
): Promise<{ valid: boolean; detail: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    // tools/list is anonymous-friendly, so it can't verify a key. get_account
    // IS auth-gated: a bad key returns an isError text block, a good key
    // returns the account's remaining credits.
    const res = await fetch(
      process.env.PLUNDER_RIFFLE_MCP_URL || "https://bot.plunderandriffle.com/api/mcp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 0,
          method: "tools/call",
          params: { name: "get_account", arguments: {} },
        }),
        signal: controller.signal,
        cache: "no-store",
      }
    );
    const payload = (await res.json().catch(() => null)) as {
      result?: {
        isError?: boolean;
        content?: { type?: string; text?: string; isError?: boolean }[];
      };
      error?: { message?: string };
    } | null;
    if (!res.ok) return { valid: false, detail: `HTTP ${res.status}` };
    if (payload?.error) return { valid: false, detail: payload.error.message || "MCP error" };
    const block = payload?.result?.content?.find((c) => typeof c.text === "string");
    const text = block?.text ?? "";
    // The engine flags bad keys with result.isError = true (not a JSON-RPC error).
    if (payload?.result?.isError || block?.isError || !text) {
      return { valid: false, detail: text || "key not recognised by the engine" };
    }
    return { valid: true, detail: text.slice(0, 220) };
  } catch (err) {
    return {
      valid: false,
      detail: err instanceof Error ? err.message : "probe failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function probeExaKey(
  key: string
): Promise<{ valid: boolean; detail: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    // Minimal 1-result search — verifies the key without meaningfully using quota.
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({ query: "DO Supply industrial automation parts", numResults: 1 }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (res.ok) return { valid: true, detail: "search ok" };
    const text = (await res.text()).slice(0, 200);
    return { valid: res.status === 401 ? false : true, detail: `HTTP ${res.status}: ${text}` };
  } catch (err) {
    return { valid: true, detail: err instanceof Error ? err.message : "probe failed" };
  } finally {
    clearTimeout(timer);
  }
}

// keep callMcpTool referenced for future server flows (avoids tree-shake lint complaints in some configs)
void callMcpTool;
