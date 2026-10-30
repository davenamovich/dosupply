#!/usr/bin/env bun
/**
 * Test for self-service Telegram connection and multi-chat alerts, against a
 * local fake of the Telegram Bot API (no network, no real bot).
 *
 *   bun run tests/telegram-connect.ts
 */
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const scratch = mkdtempSync(path.join(tmpdir(), "tg-connect-"));
process.chdir(scratch);

/* ---- fake Telegram ---- */
const TOKEN = "123456:TEST-TOKEN";
const sent: { chat_id: string; text: string }[] = [];
const webhooks: { url?: string; secret_token?: string }[] = [];
const deadChats = new Set<string>(["-999"]);
const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/bot([^/]+)\/(\w+)$/);
    if (!m || m[1] !== TOKEN) return Response.json({ ok: false, description: "Unauthorized" }, { status: 401 });
    const body = (await req.json().catch(() => ({}))) as Record<string, string>;
    switch (m[2]) {
      case "getMe":
        return Response.json({ ok: true, result: { username: "dosupply_alert_bot" } });
      case "getWebhookInfo":
        return Response.json({ ok: true, result: { url: webhooks.at(-1)?.url ?? "", pending_update_count: 0 } });
      case "setWebhook":
        webhooks.push(body);
        return Response.json({ ok: true, result: true });
      case "getChat":
        return deadChats.has(String(body.chat_id))
          ? Response.json({ ok: false, description: "Bad Request: chat not found" }, { status: 400 })
          : Response.json({ ok: true, result: { id: Number(body.chat_id), type: "group", title: "Sales" } });
      case "sendMessage":
        if (deadChats.has(String(body.chat_id))) return Response.json({ ok: false, description: "Bad Request: chat not found" }, { status: 400 });
        sent.push({ chat_id: String(body.chat_id), text: body.text });
        return Response.json({ ok: true, result: {} });
    }
    return Response.json({ ok: false, description: "unknown method" }, { status: 404 });
  },
});
process.env.TELEGRAM_API_BASE = `http://localhost:${server.port}`;
process.env.TELEGRAM_BOT_TOKEN = TOKEN;
delete process.env.TELEGRAM_CHAT_ID;
process.env.ADMIN_PASSCODE = "pass";

const { handleUpdate, connectCode, webhookSecret, webhookSecretValid, setupWebhook, connectionState } = await import("../src/lib/sales/telegram-connect");
const { listChats } = await import("../src/lib/sales/store");
const { processMessage } = await import("../src/lib/sales/conversation");
const { listLeads } = await import("../src/lib/sales/store");
const { checkTelegram } = await import("../src/lib/sales/telegram");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `\n        ${detail}` : ""}`);
}
const msg = (chatId: number, text: string, type = "group") => ({ message: { text, chat: { id: chatId, type, title: "Sales" } } });

// Webhook secret
check("webhook accepts the right secret", webhookSecretValid(webhookSecret()));
check("webhook rejects a wrong or missing secret", !webhookSecretValid("nope") && !webhookSecretValid(null));

// Connect
check("wrong code is rejected and nothing is stored", (await handleUpdate(msg(-100, "/start WRONG"))) === "rejected" && (await listChats()).length === 0);
check("no code is rejected", (await handleUpdate(msg(-100, "/start"))) === "rejected");
check("rejected chat gets a generic reply, not the code", sent.at(-1)?.text.includes("Connect link") === true && !sent.at(-1)!.text.includes(connectCode()));
check("right code connects the chat", (await handleUpdate(msg(-100, `/start ${connectCode()}`))) === "connected" && (await listChats()).some((c) => c.id === "-100"));
check("group form /start@bot CODE connects too", (await handleUpdate(msg(-200, `/start@dosupply_alert_bot ${connectCode()}`))) === "connected");
check("connection confirmation was sent", sent.some((s) => s.chat_id === "-200" && s.text.startsWith("✅ Connected")));

// Alerts reach every connected chat
const a = await (async () => {
  let sid: string | undefined;
  let last;
  for (const line of ["I need 1 of 1756-L83E", "new", "a@b.com", "Al B, BCo"]) {
    last = await processMessage(sid, line);
    sid = last.sessionId;
  }
  return last!;
})();
const lead = (await listLeads())[0];
const alertChats = sent.filter((s) => s.text.startsWith("🚨")).map((s) => s.chat_id).sort();
check("lead alert delivered to both connected chats", lead?.telegram.status === "sent" && alertChats.join() === "-100,-200", `${lead?.telegram.status} ${alertChats}`);
check("customer is told the alert went out only because it did", a.messages.some((m) => m.text.includes("I'm sending this to our sales team now")));

// A dead chat does not block delivery to the others
process.env.TELEGRAM_CHAT_ID = "-999";
sent.length = 0;
let sid: string | undefined;
for (const line of ["I need 2 of 1756-IB16", "new", "c@d.com", "Cy D, DCo"]) sid = (await processMessage(sid, line)).sessionId;
const lead2 = (await listLeads()).find((l) => l.customer.email === "c@d.com");
check("one dead chat does not stop delivery to the rest", lead2?.telegram.status === "sent" && sent.filter((s) => s.text.startsWith("🚨")).length === 2, `${lead2?.telegram.status}`);
check("the dead chat is reported on the lead", (lead2?.telegram.error || "").includes("-999"));
delete process.env.TELEGRAM_CHAT_ID;

// Check report
const rep = await checkTelegram(true);
check("test alert reports each chat", rep.chats?.length === 2 && rep.chats.every((c) => c.ok && c.sent) && rep.sent === true);

// Stop, kicked, migrated
check("/stop unsubscribes", (await handleUpdate(msg(-200, "/stop"))) === "disconnected" && !(await listChats()).some((c) => c.id === "-200"));
check("being kicked removes the chat", (await handleUpdate({ my_chat_member: { chat: { id: -100, type: "group" }, new_chat_member: { status: "kicked" } } })).startsWith("removed") && (await listChats()).length === 0);
await handleUpdate(msg(-300, `/start ${connectCode()}`));
await handleUpdate({ message: { chat: { id: -300, type: "group" }, migrate_to_chat_id: -1003000 } });
check("a group upgraded to a supergroup keeps its subscription", (await listChats()).some((c) => c.id === "-1003000") && !(await listChats()).some((c) => c.id === "-300"));

// No chats connected: honest report
await handleUpdate({ my_chat_member: { chat: { id: -1003000, type: "supergroup" }, new_chat_member: { status: "left" } } });
const none = await checkTelegram(false);
check("with nothing connected the report says so", none.problem === "No chat is connected to receive alerts.");

// Webhook setup
const st = await connectionState();
check("connection state gives group and private links with the code", st.links?.group.includes(`startgroup=${connectCode()}`) === true && st.links?.private.includes(`start=${connectCode()}`) === true);
const setup = await setupWebhook("https://example.com");
check("webhook setup registers the URL and secret", setup.ok && webhooks.at(-1)?.url === "https://example.com/api/telegram/webhook" && webhooks.at(-1)?.secret_token === webhookSecret());
check("webhook setup refuses non-https", (await setupWebhook("http://localhost:3000")).ok === false);
check("no secret appears in the connection state", !JSON.stringify(st).includes(TOKEN));

server.stop();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
