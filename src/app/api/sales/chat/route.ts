import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/ai";
import { alertMode, startSession, processMessage } from "@/lib/sales/conversation";
import { getSession } from "@/lib/sales/store";
import { inventoryMode } from "@/lib/sales/inventory";
import { STARTERS } from "@/lib/sales/engine";

export const dynamic = "force-dynamic";

const MAX_LEN = 1500;
const modes = async () => ({ inventory: inventoryMode(), alerts: await alertMode() });

/** Start a session (or restore one) and return the transcript so far. */
export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`sales-get:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }
  const wanted = req.nextUrl.searchParams.get("sessionId");
  const existing = wanted ? await getSession(wanted) : null;
  // Opening a chat writes a session to disk, so cap how many one address can start.
  if (!existing && !rateLimit(`sales-new:${ip}`, 40, 3_600_000)) {
    return NextResponse.json({ error: "Too many new chats from this connection. Please try again later." }, { status: 429 });
  }
  const session = existing ?? (await startSession()).session;
  return NextResponse.json({
    sessionId: session.id,
    messages: session.messages,
    starters: STARTERS,
    leadId: session.leadId,
    mode: await modes(),
  });
}

/** One customer message in, the assistant's replies out. */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
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
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
    if (!(sessionId && (await getSession(sessionId))) && !rateLimit(`sales-new:${ip}`, 40, 3_600_000)) {
      return NextResponse.json({ error: "Too many new chats from this connection. Please try again later." }, { status: 429 });
    }
    const out = await processMessage(sessionId, message, ip);
    return NextResponse.json({ ...out, mode: await modes() });
  } catch (err) {
    console.error("[sales/chat] failed:", err);
    return NextResponse.json({ error: "Something went wrong on our side. Please try again." }, { status: 500 });
  }
}
