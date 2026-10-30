import { NextRequest, NextResponse } from "next/server";
import { dashboardAllowed } from "@/lib/sales/auth";
import { checkTelegram } from "@/lib/sales/telegram";

export const dynamic = "force-dynamic";

/** POST { send?: boolean }: report what is wrong with the Telegram setup, optionally sending a test alert. */
export async function POST(req: NextRequest) {
  if (!dashboardAllowed(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { send?: boolean };
  return NextResponse.json(await checkTelegram(Boolean(body.send)));
}
