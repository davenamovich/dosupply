import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
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

/**
 * POST /api/research — live web research for content grounding.
 * Provider order: Exa (BYOK key) → built-in SDK web_search.
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
      // 401/403 → report honestly, fall through to SDK search.
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
      // fall through to SDK search
    }
  }

  // --- Provider 2: built-in SDK web_search (always available in this sandbox) ---
  try {
    const zai = await ZAI.create();
    const result = await zai.functions.invoke("web_search", { query, num });
    const results: ResearchResult[] = (result || [])
      .slice(0, num)
      .map((r) => ({
        title: r.name || r.url,
        url: r.url,
        snippet: (r.snippet || "").trim(),
        host: r.host_name || safeHost(r.url),
        date: r.date || undefined,
      }))
      .filter((r) => r.url);
    return NextResponse.json({ provider: "sdk_web_search", query, results });
  } catch (err) {
    console.error("[research] sdk web_search failed:", err);
    return NextResponse.json(
      {
        provider: "none",
        error:
          "Both Exa (BYOK) and the built-in web search failed. No research grounding is available right now.",
        results: [],
      },
      { status: 502 }
    );
  }
}

/** GET — which provider is currently active (for the UI badge). */
export async function GET() {
  const exa = await keyStatus("exa");
  return NextResponse.json({
    provider: exa.configured ? "exa" : "sdk_web_search",
    exaConfigured: exa.configured,
  });
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
