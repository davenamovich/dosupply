import { NextRequest, NextResponse } from "next/server";
import { callMcpTool, mcpKeyConfigured } from "@/lib/mcp/client";
import { BUSY_RESPONSE, clientIp, globalLimit, rateLimit } from "@/lib/ai";
import { bumpStat } from "@/lib/session-stats";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

type OneMinuteStart = {
  jobId?: string;
  status?: string;
  pageUrl?: string;
  [k: string]: unknown;
};

/**
 * POST /api/mcp/audio
 * body: { topic: string }
 * Calls P&R MCP create_one_minute — writes + voices a ~60s captioned take.
 * Returns a jobId for polling via /api/mcp/job (kind "one_minute").
 * Per the tool schema: the result is a page preview. This app does not
 * render MP4s.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`audio:${ip}`, 8, 60_000)) {
    return NextResponse.json(
      { error: "Narration generation rate limit reached.", code: "rate" },
      { status: 429 }
    );
  }
  if (!globalLimit("audio", 20)) {
    return NextResponse.json(BUSY_RESPONSE, { status: 429 });
  }

  let body: { topic?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const topic = (body.topic || "").trim().slice(0, 600);
  if (!topic) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  if (!(await mcpKeyConfigured())) {
    return NextResponse.json(
      {
        mode: "unavailable",
        code: "no_key",
        error:
          "P&R MCP audio generation requires a server-side PLUNDER_RIFFLE_API_KEY which is not configured in this deployment. The narration script is still AI-drafted below.",
      },
      { status: 503 }
    );
  }

  const result = await callMcpTool<OneMinuteStart>(
    "create_one_minute",
    {
      topic: `DO Supply industrial marketing take: ${topic}. Angle: need-it-now industrial automation replacement parts, honest and technical, no hype.`,
      title: (body.title || "DO Supply × Plunder & Riffle").slice(0, 120),
    },
    120_000
  );

  if (!result.ok) {
    console.error("[mcp/audio] create_one_minute failed:", result.code, result.error);
    return NextResponse.json(
      { mode: "error", code: result.code, error: result.error },
      { status: 502 }
    );
  }

  const d = result.data;
  bumpStat("audio");
  return NextResponse.json({
    mode: "live",
    tool: "create_one_minute",
    jobId: d.jobId ?? null,
    status: d.status ?? "queued",
    pageUrl: d.pageUrl ?? null,
    startedAt: new Date().toISOString(),
  });
}
