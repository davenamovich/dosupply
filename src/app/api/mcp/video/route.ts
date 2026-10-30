import { NextRequest, NextResponse } from "next/server";
import { callMcpTool, mcpKeyConfigured } from "@/lib/mcp/client";
import { videoLook } from "@/lib/mcp/brand";
import { BUSY_RESPONSE, clientIp, globalLimit, rateLimit } from "@/lib/ai";
import { bumpStat } from "@/lib/session-stats";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

type PhoneDemoStart = {
  jobId?: string;
  status?: string;
  pageUrl?: string;
  [k: string]: unknown;
};

/**
 * POST /api/mcp/video
 * body: { topic: string, shape?: "mixed"|"ranked", title?: string }
 * Calls P&R MCP create_phone_demo — a ~60s sit-down video where the
 * generated posts land on the host's phone. Returns a jobId for polling
 * via /api/mcp/job (kind "sitdown"), usually 1–2 min.
 * Per the tool schema: done carries pageUrl (a preview, no MP4). This app
 * does not render MP4s.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`video:${ip}`, 8, 60_000)) {
    return NextResponse.json(
      { error: "Video generation rate limit reached.", code: "rate" },
      { status: 429 }
    );
  }
  if (!globalLimit("video", 20)) {
    return NextResponse.json(BUSY_RESPONSE, { status: 429 });
  }

  let body: { topic?: string; shape?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const topic = (body.topic || "").trim().slice(0, 400);
  if (!topic) {
    return NextResponse.json(
      { error: "Topic is required (≤400 chars)." },
      { status: 400 }
    );
  }

  const shape =
    body.shape === "ranked" || body.shape === "mixed" ? body.shape : "mixed";

  if (!(await mcpKeyConfigured())) {
    return NextResponse.json(
      {
        mode: "unavailable",
        code: "no_key",
        error:
          "P&R MCP video generation requires a server-side Plunder & Riffle key (paste one in BYOK Setup, or set PLUNDER_RIFFLE_API_KEY). No video was generated — nothing is pretending otherwise.",
      },
      { status: 503 }
    );
  }

  const result = await callMcpTool<PhoneDemoStart>(
    "create_phone_demo",
    {
      topic,
      shape,
      ...videoLook(topic),
      title: (body.title || "DO Supply × Plunder & Riffle").slice(0, 120),
    },
    120_000
  );

  if (!result.ok) {
    console.error("[mcp/video] create_phone_demo failed:", result.code, result.error);
    return NextResponse.json(
      { mode: "error", code: result.code, error: result.error },
      { status: 502 }
    );
  }

  const d = result.data;
  bumpStat("video");
  return NextResponse.json({
    mode: "live",
    tool: "create_phone_demo",
    jobId: d.jobId ?? null,
    status: d.status ?? "queued",
    pageUrl: d.pageUrl ?? null,
    startedAt: new Date().toISOString(),
  });
}
