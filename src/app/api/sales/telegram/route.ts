import { NextRequest, NextResponse } from "next/server";
import { dashboardAllowed } from "@/lib/sales/auth";
import { removeChat } from "@/lib/sales/store";
import { connectionState, setupWebhook } from "@/lib/sales/telegram-connect";

export const dynamic = "force-dynamic";

/** Public origin of this deployment, honoring the proxy headers Railway sets. */
function originOf(req: NextRequest): string {
  const fromEnv = process.env.PUBLIC_URL?.trim();
  if (fromEnv) return fromEnv;
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  return `${proto}://${host}`;
}

/** Connection state: bot, connected chats, webhook status and the connect links. */
export async function GET(req: NextRequest) {
  if (!dashboardAllowed(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json(await connectionState());
}

/** body: { action: "setup-webhook" } or { action: "remove", chatId } */
export async function POST(req: NextRequest) {
  if (!dashboardAllowed(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; chatId?: string };
  if (body.action === "setup-webhook") return NextResponse.json(await setupWebhook(originOf(req)));
  if (body.action === "remove" && body.chatId) return NextResponse.json({ ok: await removeChat(String(body.chatId)) });
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
