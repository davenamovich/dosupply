import { NextResponse } from "next/server";
import { probeMcpStatus, mcpUrl } from "@/lib/mcp/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await probeMcpStatus();
  return NextResponse.json({
    mcp: {
      keyConfigured: status.keyConfigured,
      connected: status.connected,
      serverName: status.serverName,
      serverVersion: status.serverVersion,
      error: status.error,
    },
    endpoint: mcpUrl(),
    checkedAt: status.checkedAt,
  });
}
