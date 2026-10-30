import { NextRequest, NextResponse } from "next/server";
import { callMcpTool, mcpKeyConfigured } from "@/lib/mcp/client";
import { BUSY_RESPONSE, clientIp, globalLimit, rateLimit } from "@/lib/ai";
import { bumpStat } from "@/lib/session-stats";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

type Mp4Start = {
  jobId?: string;
  status?: string;
  mp4Url?: string;
  [k: string]: unknown;
};

/**
 * POST /api/mcp/mp4
 * body: { pageUrl: string } — the preview page URL the human just watched
 * and approved. The click on "Request MP4" IS the human approval the
 * request_mp4 tool requires; we never render unapproved previews.
 * No wait_seconds hold — we return the jobId and the client polls
 * /api/mcp/job (kind "mp4") until done carries mp4Url.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`mp4:${ip}`, 6, 60_000)) {
    return NextResponse.json(
      { error: "MP4 render rate limit reached.", code: "rate" },
      { status: 429 }
    );
  }
  if (!globalLimit("mp4", 10)) {
    return NextResponse.json(BUSY_RESPONSE, { status: 429 });
  }

  let body: { pageUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const pageUrl = (body.pageUrl || "").trim();
  if (!/^https:\/\//i.test(pageUrl)) {
    return NextResponse.json(
      { error: "A https pageUrl from a finished preview is required." },
      { status: 400 }
    );
  }

  if (!(await mcpKeyConfigured())) {
    return NextResponse.json(
      {
        mode: "unavailable",
        code: "no_key",
        error:
          "MP4 rendering requires a server-side Plunder & Riffle key (BYOK Setup panel or PLUNDER_RIFFLE_API_KEY).",
      },
      { status: 503 }
    );
  }

  const result = await callMcpTool<Mp4Start>("request_mp4", { pageUrl }, 120_000);

  if (!result.ok) {
    console.error("[mcp/mp4] request_mp4 failed:", result.code, result.error);
    return NextResponse.json(
      { mode: "error", code: result.code, error: result.error },
      { status: 502 }
    );
  }

  const d = result.data;
  bumpStat("mp4");
  return NextResponse.json({
    mode: "live",
    tool: "request_mp4",
    jobId: d.jobId ?? null,
    status: d.status ?? "queued",
    mp4Url: d.mp4Url ?? null,
  });
}
