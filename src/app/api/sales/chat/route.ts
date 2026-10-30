import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ai";
import { alertMode, loadOrStart, processMessage } from "@/lib/sales/conversation";
import { inventoryMode } from "@/lib/sales/inventory";
import { STARTERS } from "@/lib/sales/engine";

export const dynamic = "force-dynamic";

const MAX_LEN = 1500;
const modes = () => ({ inventory: inventoryMode(), alerts: alertMode() });

/** Start a session (or restore one) and return the transcript so far. */
export async function GET(req: NextRequest) {
  const session = await loadOrStart(req.nextUrl.searchParams.get("sessionId") || undefined);
  return NextResponse.json({
    sessionId: session.id,
    messages: session.messages,
    starters: STARTERS,
    leadId: session.leadId,
    mode: modes(),
  });
}

/** One customer message in, the assistant's replies out. */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!rateLimit(`sales:${ip}`, 40, 60_000)) {
    return NextResponse.json({ error: "Too many messages. Please wait a moment." }, { status: 429 });
  }
  let body: { sessionId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });
  if (message.length > MAX_LEN) {
    return NextResponse.json({ error: `Messages are limited to ${MAX_LEN} characters.` }, { status: 400 });
  }
  try {
    const out = await processMessage(typeof body.sessionId === "string" ? body.sessionId : undefined, message);
    return NextResponse.json({ ...out, mode: modes() });
  } catch (err) {
    console.error("[sales/chat] failed:", err);
    return NextResponse.json({ error: "Something went wrong on our side. Please try again." }, { status: 500 });
  }
}
