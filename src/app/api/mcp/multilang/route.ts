import { NextRequest, NextResponse } from "next/server";
import { callMcpTool } from "@/lib/mcp/client";
import { rateLimit } from "@/lib/ai";
import { bumpStat } from "@/lib/session-stats";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/mcp/multilang — P&R MCP generate_multilanguage_ads.
 * body: { input, languages: string[] (max 6), format? }
 *
 * Verified tool contract (tools/list, 2026-10):
 *  - languages: string[], e.g. ["Spanish","Japanese"], up to 6 per call,
 *    generated natively (not machine-translated), billed per language.
 *  - formats: image | carousel | confession | hottake | hybrid
 *  - Returns one result per language; failures reported per language.
 * The raw payload is passed through so the UI shows exactly what the
 * engine produced (pageUrl previews, PNG assets, post_copy) — no fabrication.
 */

export const SUPPORTED_LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Russian", "Japanese", "Korean", "Chinese", "Arabic", "Hindi",
  "Dutch", "Turkish", "Polish", "Indonesian", "Thai", "Vietnamese",
  "Filipino", "Bengali", "Urdu", "Swedish", "Ukrainian",
] as const;

type MultilangPayload = {
  [k: string]: unknown;
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  if (!rateLimit(ip, 6, 60_000)) {
    return NextResponse.json(
      { error: "Multilanguage rate limit reached — max 6 calls/min.", code: "rate" },
      { status: 429 }
    );
  }

  let body: { input?: string; languages?: string[]; format?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = (body.input || "").trim().slice(0, 800);
  if (!input) {
    return NextResponse.json({ error: "Input is required." }, { status: 400 });
  }

  const languages = (Array.isArray(body.languages) ? body.languages : [])
    .map((l) => String(l).trim())
    .filter((l) => (SUPPORTED_LANGUAGES as readonly string[]).includes(l))
    .slice(0, 6);

  if (languages.length === 0) {
    return NextResponse.json(
      { error: `Pick 1–6 supported languages (max 6 per MCP call).` },
      { status: 400 }
    );
  }

  const format = ["image", "carousel", "confession", "hottake", "hybrid"].includes(
    body.format || ""
  )
    ? body.format!
    : "image";

  const brief = `DO Supply industrial marketing. Product/topic: ${input}. Audience: plant managers, maintenance engineers, controls engineers. Voice: expert, fast, plain-spoken ("need-it-now" industrial automation replacement parts supplier). No invented specs, prices or availability claims.`;
  const offer = "Explore tested industrial automation parts at dosupply.com";

  const result = await callMcpTool<MultilangPayload>(
    "generate_multilanguage_ads",
    {
      brief,
      languages,
      format,
      offer,
      includeAssets: true,
    },
    240_000
  );

  if (!result.ok) {
    console.error("[mcp/multilang] failed:", result.code, result.error);
    return NextResponse.json(
      { mode: "error", code: result.code, error: result.error },
      { status: result.code === "no_key" ? 503 : 502 }
    );
  }

  bumpStat("multilang");
  return NextResponse.json({
    mode: "live",
    tool: "generate_multilanguage_ads",
    server: "meme-engine (bot.plunderandriffle.com/api/mcp)",
    languages,
    format,
    payload: result.data,
    generatedAt: new Date().toISOString(),
  });
}

export async function GET() {
  return NextResponse.json({
    tool: "generate_multilanguage_ads",
    maxLanguagesPerCall: 6,
    formats: ["image", "carousel", "confession", "hottake", "hybrid"],
    languages: SUPPORTED_LANGUAGES,
  });
}
