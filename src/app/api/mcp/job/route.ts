import { NextRequest, NextResponse } from "next/server";
import { callMcpTool } from "@/lib/mcp/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type JobStatus = {
  status?: string;
  progress?: number | string;
  mp4Url?: string;
  pageUrl?: string;
  error?: string;
  [k: string]: unknown;
};

/**
 * POST /api/mcp/job — poll an async P&R MCP job via get_job_status.
 * body: { kind: "one_minute"|"mp4"|"sitdown"|"funnel"|..., jobId: string }
 * Free per the tool schema. Statuses: rendering | done | failed.
 */
export async function POST(req: NextRequest) {
  let body: { kind?: string; jobId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const kind = (body.kind || "").trim();
  const jobId = (body.jobId || "").trim();

  if (!kind || !jobId) {
    return NextResponse.json(
      { error: "kind and jobId are required." },
      { status: 400 }
    );
  }

  const allowed = ["one_minute", "mp4", "sitdown", "funnel", "localize", "demo_pack", "audioscript"];
  if (!allowed.includes(kind)) {
    return NextResponse.json(
      { error: `Unsupported job kind "${kind}".` },
      { status: 400 }
    );
  }

  const result = await callMcpTool<JobStatus>("get_job_status", { kind, jobId }, 25_000);
  if (!result.ok) {
    return NextResponse.json(
      { mode: "error", code: result.code, error: result.error },
      { status: 502 }
    );
  }

  const d = result.data;
  return NextResponse.json({
    mode: "live",
    kind,
    jobId,
    status: d.status ?? "unknown",
    progress: d.progress ?? null,
    pageUrl: d.pageUrl ?? null,
    mp4Url: d.mp4Url ?? null,
    error: d.error ?? null,
    raw: d,
  });
}
