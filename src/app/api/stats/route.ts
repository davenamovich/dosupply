import { NextResponse } from "next/server";
import { getStats } from "@/lib/session-stats";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats — real, live-call session counters for the Growth Stats
 * section. Only successful P&R MCP calls are counted (see session-stats.ts);
 * the UI shows these alongside clearly-labeled demonstration projections.
 */
export async function GET() {
  return NextResponse.json(getStats());
}
