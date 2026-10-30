import { NextRequest, NextResponse } from "next/server";
import { BUSY_RESPONSE, clientIp, rateLimit } from "@/lib/ai";
import { probeMcpStatus, mcpUrl } from "@/lib/mcp/client";
import { keyStatus } from "@/lib/runtime-keys";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Each call probes the P&R engine, so keep it cheap.
  if (!rateLimit(`status:${clientIp(req)}`, 30, 60_000)) return NextResponse.json(BUSY_RESPONSE, { status: 429 });
  const status = await probeMcpStatus();
  const [prKey, exaKey] = await Promise.all([
    keyStatus("plunder_riffle"),
    keyStatus("exa"),
  ]);
  const fallbackResearchConfigured = Boolean(
    (process.env.TINYFISH_API_KEY || "").trim()
  );
  return NextResponse.json({
    mcp: {
      keyConfigured: status.keyConfigured,
      connected: status.connected,
      serverName: status.serverName,
      serverVersion: status.serverVersion,
      error: status.error,
    },
    keys: {
      plunder_riffle: {
        configured: prKey.configured,
        masked: prKey.masked,
        source: prKey.source,
      },
      exa: {
        configured: exaKey.configured,
        masked: exaKey.masked,
        source: exaKey.source,
      },
    },
    researchProvider: exaKey.configured
      ? "exa"
      : fallbackResearchConfigured
        ? "tinyfish"
        : "none",
    endpoint: mcpUrl(),
    checkedAt: status.checkedAt,
  });
}
