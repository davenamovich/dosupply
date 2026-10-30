import { NextRequest, NextResponse } from "next/server";
import { resolveKey, keyStatus } from "@/lib/runtime-keys";
import { rateLimit } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type ResearchResult = {
  title: string;
  url: string;
  snippet: string;
  host: string;
  date?: string;
};

type ExaResponse = {
  results?: {
    title?: string;
    url?: string;
    text?: string;
    summary?: string;
    publishedDate?: string;
  }[];
};

type TinyFishResponse = {
  results?: {
    title?: string;
    url?: string;
    snippet?: string;
    site_name?: string;
  }[];
};

/** Env-configured fallback search endpoint (TinyFish: free tier, REST + X-API-Key). */
function tinyfishConfig(): { endpoint: string; apiKey: string } | null {
  const apiKey = (process.env.TINYFISH_API_KEY || "").trim();
  if (!apiKey) return null;
  const endpoint = (process.env.TINYFISH_SEARCH_URL || "").trim() || "https://api.search.tinyfish.ai";
  return { endpoint, apiKey };
}

/**
 * POST /api/research — live web research for content grounding.
 * Provider order: Exa (BYOK key) → TinyFish (TINYFISH_API_KEY).
 * The response names the provider that actually ran, so the UI can label
 * provenance honestly.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  if (!rateLimit(ip, 20, 60_000)) {
    return NextResponse.json(
      { error: "Research rate limit reached." },
      { status: 429 }
    );
  }

  let body: { query?: string; num?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const query = (body.query || "").trim().slice(0, 300);
  const num = Math.min(8, Math.max(2, Number(body.num) || 5));
  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  // --- Provider 1: Exa (BYOK) ---
  const exaKey = await resolveKey("exa");
  if (exaKey) {
    try {
      const res = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": exaKey },
        body: JSON.stringify({
          query,
          numResults: num,
          type: "auto",
          contents: { text: { maxCharacters: 600 } },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) {
        const payload = (await res.json()) as ExaResponse;
        const results: ResearchResult[] = (payload.results || [])
          .slice(0, num)
          .map((r) => ({
            title: r.title || r.url || "Untitled result",
            url: r.url || "",
            snippet: (r.text || r.summary || "").trim().slice(0, 600),
            host: safeHost(r.url || ""),
            date: r.publishedDate || undefined,
          }))
          .filter((r) => r.url);
        return NextResponse.json({ provider: "exa", query, results });
      }
      // 401/403 → report honestly, fall through to the fallback provider.
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          {
            provider: "exa",
            error:
              "Exa rejected the stored API key (401). Re-paste it in the P&R Studio setup panel.",
            results: [],
          },
          { status: 502 }
        );
      }
    } catch (err) {
      console.error("[research] exa failed:", err);
      // fall through to the fallback provider
    }
  }

  // --- Provider 2: TinyFish search (env TINYFISH_API_KEY) ---
  const fallback = tinyfishConfig();
  if (!fallback) {
    return NextResponse.json(
      {
        provider: "none",
        error:
          "No research provider is configured. Paste an Exa key in the setup panel or set TINYFISH_API_KEY.",
        results: [],
      },
      { status: 502 }
    );
  }

  try {
    const endpoint = new URL(fallback.endpoint);
    endpoint.searchParams.set("query", query);
    const res = await fetch(endpoint.toString(), {
      method: "GET",
      headers: { "X-API-Key": fallback.apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).trim().slice(0, 200);
      throw new Error(
        `TinyFish search failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`
      );
    }
    const payload = (await res.json()) as TinyFishResponse;
    const results: ResearchResult[] = (payload.results || [])
      .slice(0, num)
      .map((r) => ({
        title: r.title || r.url || "Untitled result",
        url: r.url || "",
        snippet: (r.snippet || "").trim().slice(0, 600),
        host: r.site_name || safeHost(r.url || ""),
      }))
      .filter((r) => r.url);
    return NextResponse.json({ provider: "tinyfish", query, results });
  } catch (err) {
    console.error("[research] tinyfish search failed:", err);
    return NextResponse.json(
      {
        provider: "none",
        error:
          "Both Exa (BYOK) and the fallback web search failed. No research grounding is available right now.",
        results: [],
      },
      { status: 502 }
    );
  }
}

/** GET — which provider is currently active (for the UI badge). */
export async function GET() {
  const exa = await keyStatus("exa");
  const provider = exa.configured ? "exa" : tinyfishConfig() ? "tinyfish" : "none";
  return NextResponse.json({
    provider,
    exaConfigured: exa.configured,
    fallbackConfigured: tinyfishConfig() !== null,
  });
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
