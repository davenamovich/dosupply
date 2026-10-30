import { NextRequest, NextResponse } from "next/server";
import { BUSY_RESPONSE, clientIp, globalLimit, rateLimit } from "@/lib/ai";
import { callMcpTool, mcpKeyConfigured } from "@/lib/mcp/client";
import { pickVerticalCreative } from "@/lib/vertical-creative";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/mcp/assets  { pageUrl }
 *
 * Single creatives are generated page-only, which is much faster. When the
 * PNGs are wanted, this renders them from the page that already exists using
 * the engine's export_ad_assets tool (the PNGs are free). Returns the 9:16 cut.
 */
function enginePage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.hostname === "bot.plunderandriffle.com" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`assets:${ip}`, 12, 60_000) || !globalLimit("assets", 120)) {
    return NextResponse.json(BUSY_RESPONSE, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { pageUrl?: string };
  const pageUrl = enginePage(body.pageUrl);
  if (!pageUrl) {
    return NextResponse.json({ error: "pageUrl must be a bot.plunderandriffle.com page.", code: "bad_page" }, { status: 400 });
  }
  if (!(await mcpKeyConfigured())) {
    return NextResponse.json({ error: "No P&R key is configured on the server.", code: "no_key" }, { status: 503 });
  }

  const result = await callMcpTool<Record<string, unknown>>(
    "export_ad_assets",
    { pageUrl, includeAssets: true, sizes: ["story"] },
    120_000
  );
  if (!result.ok) {
    console.error("[mcp/assets] failed:", result.code, result.error);
    return NextResponse.json({ error: result.error, code: result.code }, { status: 502 });
  }
  return NextResponse.json({
    mode: "live",
    // export_ad_assets names the list `assets`; generate_ad_creative calls it `adAssets`.
    adAssets: result.data.assets ?? result.data.adAssets ?? null,
    vertical: pickVerticalCreative(result.data),
  });
}
