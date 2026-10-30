#!/usr/bin/env bun
/**
 * One-command smoke test for the DO Supply engine.
 *
 *   bun run smoke                                          # localhost:3000
 *   bun run smoke https://dosupply-production.up.railway.app
 *   SMOKE_BASE_URL=https://... bun run smoke
 *
 * Checks, in order:
 *   1. GET  /api/status    — server up, MCP/keys visible, a research provider exists
 *   2. POST /api/research  — live search returns real, linkable results
 *   3. POST /api/generate  — the LLM produces actual social copy (not an error, not placeholders)
 *
 * Exits 0 when every check passes and 1 otherwise, so it can gate a deploy.
 * Generation costs one model call and research costs one search; both are cheap.
 */

const baseUrl = (process.argv[2] || process.env.SMOKE_BASE_URL || "http://localhost:3000")
  .trim()
  .replace(/\/+$/, "");

const SEARCH_QUERY =
  process.env.SMOKE_QUERY || "Allen-Bradley PowerFlex 525 variable frequency drive";
const GEN_INPUT =
  process.env.SMOKE_INPUT || "Allen-Bradley PowerFlex 525 variable frequency drives";
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 120_000);

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];

function record(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n        ${detail}` : ""}`);
}

function describe(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return `request timed out after ${TIMEOUT_MS}ms`;
    }
    return err.message;
  }
  return String(err);
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const raw = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  return { status: res.status, body, raw };
}

console.log(`smoke: ${baseUrl}\n`);

/* ------------------------------------------------------------------ */
/* 1. /api/status                                                      */
/* ------------------------------------------------------------------ */
try {
  const st = await call("/api/status");
  if (st.status !== 200) {
    record("GET /api/status", false, `HTTP ${st.status}: ${st.raw.slice(0, 200)}`);
  } else {
    const b = st.body ?? {};
    const shaped =
      typeof b.researchProvider === "string" && !!b.mcp && !!b.keys?.exa && !!b.keys?.plunder_riffle;
    record(
      "GET /api/status -> 200 with mcp, keys and researchProvider",
      shaped,
      `mcp.connected=${b.mcp?.connected} | exa=${b.keys?.exa?.source ?? "unset"} | ` +
        `plunder_riffle=${b.keys?.plunder_riffle?.source ?? "unset"}`
    );
    record(
      "research provider is configured",
      b.researchProvider !== "none",
      `researchProvider=${b.researchProvider}`
    );
  }
} catch (err) {
  record("GET /api/status", false, describe(err));
}

/* ------------------------------------------------------------------ */
/* 2. /api/research                                                    */
/* ------------------------------------------------------------------ */
try {
  const r = await call("/api/research", {
    method: "POST",
    body: JSON.stringify({ query: SEARCH_QUERY, num: 3 }),
  });
  if (r.status !== 200) {
    record("POST /api/research", false, `HTTP ${r.status}: ${r.body?.error ?? r.raw.slice(0, 200)}`);
  } else {
    const items: any[] = Array.isArray(r.body?.results) ? r.body.results : [];
    const provider = r.body?.provider;
    record("POST /api/research -> 200", true, `provider=${provider} | results=${items.length}`);
    record(
      "research returned linkable results",
      provider !== "none" &&
        items.length > 0 &&
        items.every((i) => typeof i.url === "string" && /^https?:\/\//.test(i.url)) &&
        items.some((i) => typeof i.title === "string" && i.title.trim().length > 0),
      items[0] ? `first: ${items[0].host ?? "?"} — ${String(items[0].title).slice(0, 60)}` : "no results"
    );
  }
} catch (err) {
  record("POST /api/research", false, describe(err));
}

/* ------------------------------------------------------------------ */
/* 3. live generation                                                  */
/* ------------------------------------------------------------------ */
try {
  const g = await call("/api/generate", {
    method: "POST",
    body: JSON.stringify({
      mode: "social",
      input: GEN_INPUT,
      platform: "LinkedIn",
      theme: "downtime reduction",
    }),
  });
  if (g.status !== 200) {
    const err = g.body?.error ?? g.raw.slice(0, 300);
    const hint = /LLM provider is not configured/.test(err)
      ? "\n        hint: set LLM_BASE_URL, LLM_API_KEY and LLM_MODEL on the server"
      : "";
    record("POST /api/generate", false, `HTTP ${g.status}: ${err}${hint}`);
  } else {
    const d = g.body?.data ?? {};
    const hasCopy =
      typeof d.headline === "string" &&
      d.headline.trim().length > 15 &&
      typeof d.caption === "string" &&
      d.caption.trim().length > 80 &&
      Array.isArray(d.hashtags) &&
      d.hashtags.length > 0;
    record(
      "POST /api/generate -> 200 with real social copy",
      hasCopy,
      `headline: ${JSON.stringify(String(d.headline ?? "").slice(0, 70))} | ` +
        `caption ${String(d.caption ?? "").length} chars | hashtags: ${d.hashtags?.length ?? 0}`
    );
  }
} catch (err) {
  record("POST /api/generate", false, describe(err));
}

/* ------------------------------------------------------------------ */
/* summary                                                             */
/* ------------------------------------------------------------------ */
const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed against ${baseUrl}`
);
if (failed.length > 0) {
  console.log(`failed: ${failed.map((f) => f.name).join(", ")}`);
  process.exit(1);
}
console.log("smoke test passed");
