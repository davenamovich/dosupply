import { NextRequest, NextResponse } from "next/server";
import { handleUpdate, webhookSecretValid } from "@/lib/sales/telegram-connect";

export const dynamic = "force-dynamic";

/**
 * Telegram webhook for the sales-alert bot. Telegram sends the secret set with
 * setWebhook in a header; anything without it is rejected.
 */
export async function POST(req: NextRequest) {
  if (!webhookSecretValid(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  try {
    const result = await handleUpdate(await req.json());
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    // Always 200 so Telegram does not retry a poisoned update forever.
    console.error("[telegram/webhook] update failed:", err);
    return NextResponse.json({ ok: false });
  }
}
