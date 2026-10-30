import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/ai";
import { searchInventory } from "@/lib/sales/inventory";

export const dynamic = "force-dynamic";

/** GET /api/sales/inventory?pn=1756-L83E&manufacturer=Allen-Bradley&q=plc */
export async function GET(req: NextRequest) {
  if (!rateLimit(`sales-inventory:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const p = req.nextUrl.searchParams;
  const q = {
    partNumber: p.get("pn")?.slice(0, 60) || undefined,
    manufacturer: p.get("manufacturer")?.slice(0, 60) || undefined,
    text: p.get("q")?.slice(0, 120) || undefined,
  };
  if (!q.partNumber && !q.manufacturer && !q.text) {
    return NextResponse.json({ error: "Provide pn, manufacturer or q." }, { status: 400 });
  }
  return NextResponse.json(await searchInventory(q));
}
