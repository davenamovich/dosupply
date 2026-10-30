import { NextRequest, NextResponse } from "next/server";
import { callMcpTool, mcpKeyConfigured, mcpUrl } from "@/lib/mcp/client";
import { rateLimit } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

/* ------------------------------------------------------------------ */
/* Real P&R MCP results — expected shapes (verified tool schemas)      */
/* ------------------------------------------------------------------ */

export type McpAdAsset = {
  url?: string;
  size?: string;
  [k: string]: unknown;
};

export type CreativeResult = {
  pageUrl?: string;
  post_copy?: unknown;
  adAssets?: McpAdAsset[] | Record<string, unknown>;
  media_url?: string;
  referralUrl?: string;
  creatives?: unknown[];
  copy?: unknown;
  hooks?: unknown;
  hashtags?: unknown;
  [k: string]: unknown;
};

/**
 * POST /api/mcp/creative
 * body: { input: string, direction?: string, kind: "creative" | "shop", format?: "image"|"carousel"|"hottake"|"hybrid"|"confession" }
 *
 * kind=creative → generate_ad_creative (one creative, returns pageUrl + PNGs + post_copy)
 * kind=shop     → shop (product input → researched copy + up to 3 creatives)
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  if (!rateLimit(ip, 10, 60_000)) {
    return NextResponse.json(
      { error: "Creative generation rate limit reached — the engine is busy.", code: "rate" },
      { status: 429 }
    );
  }

  let body: { input?: string; direction?: string; kind?: string; format?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = (body.input || "").trim().slice(0, 800);
  if (!input) {
    return NextResponse.json({ error: "Input is required." }, { status: 400 });
  }

  const kind = body.kind === "shop" ? "shop" : "creative";
  const format = body.format || "carousel";

  if (!mcpKeyConfigured()) {
    return NextResponse.json(
      {
        mode: "unavailable",
        code: "no_key",
        error:
          "P&R MCP is reachable but this deployment has no PLUNDER_RIFFLE_API_KEY configured server-side, so live multimedia generation is disabled. Demonstration fallbacks below are clearly labeled.",
      },
      { status: 503 }
    );
  }

  const brief = `DO Supply industrial marketing. Product/topic: ${input}. Audience: plant managers, maintenance engineers, controls engineers. Voice: expert, fast, plain-spoken ("need-it-now" industrial automation parts supplier). No invented specs or availability claims.`;
  const offer = "Explore tested industrial automation parts at dosupply.com";

  const result =
    kind === "shop"
      ? await callMcpTool<CreativeResult>("shop", {
          input,
          direction:
            body.direction ||
            "for maintenance teams and plant managers who need parts NOW",
          creatives: [format],
          includeAssets: true,
        })
      : await callMcpTool<CreativeResult>("generate_ad_creative", {
          brief,
          offer,
          format,
          includeAssets: true,
        });

  if (!result.ok) {
    console.error("[mcp/creative] failed:", result.code, result.error);
    return NextResponse.json(
      { mode: "error", code: result.code, error: result.error },
      { status: 502 }
    );
  }

  const data = result.data;
  return NextResponse.json({
    mode: "live",
    tool: kind === "shop" ? "shop" : "generate_ad_creative",
    server: "meme-engine (bot.plunderandriffle.com/api/mcp)",
    pageUrl: data.pageUrl ?? null,
    mediaUrl: typeof data.media_url === "string" ? data.media_url : null,
    adAssets: data.adAssets ?? null,
    postCopy: data.post_copy ?? null,
    creatives: Array.isArray(data.creatives) ? data.creatives : null,
    copy: data.copy ?? null,
    hooks: data.hooks ?? null,
    hashtags: data.hashtags ?? null,
    referralUrl: data.referralUrl ?? null,
    generatedAt: new Date().toISOString(),
  });
}

export async function GET() {
  return NextResponse.json({
    endpoint: mcpUrl(),
    keyConfigured: mcpKeyConfigured(),
    tools: ["generate_ad_creative", "shop", "create_one_minute", "get_job_status"],
  });
}
