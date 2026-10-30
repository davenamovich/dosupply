import { listChats, readOnly, removeChat, transact } from "./store";
import type { Lead, LookupResult } from "./types";

/**
 * Telegram lead alerts. Credentials come from TELEGRAM_BOT_TOKEN and
 * TELEGRAM_CHAT_ID and are only ever read here, on the server.
 *
 * Without credentials the service runs in simulated mode: the exact message is
 * generated and stored for the dashboard, and the lead is marked "simulated"
 * rather than "sent", so the customer is never told an alert was delivered.
 */

const MAX_ATTEMPTS_PER_RUN = 3;
const MAX_TOTAL_ATTEMPTS = 8;
const RETRY_AFTER_MS = 60_000;
const inFlight = new Set<string>();

/** Chats that receive alerts: those connected from the dashboard, plus TELEGRAM_CHAT_ID if set. */
export async function destinations(): Promise<string[]> {
  const ids = (await listChats()).map((c) => c.id);
  const env = (process.env.TELEGRAM_CHAT_ID || "").trim();
  if (env && !ids.includes(env)) ids.push(env);
  return ids;
}

export async function telegramConfigured(): Promise<boolean> {
  if (!(process.env.TELEGRAM_BOT_TOKEN || "").trim()) return false;
  return (await destinations()).length > 0;
}

const dash = (v?: string | number) => (v === undefined || v === "" ? "Not provided" : String(v));

function submittedStamp(iso: string): string {
  return (
    new Date(iso).toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) + " ET"
  );
}

function inventoryLines(lookup?: LookupResult): { match: string; availability: string } {
  if (!lookup || lookup.matchType === "none") {
    return { match: "Not found", availability: "Needs confirmation" };
  }
  const best = lookup.products[0];
  const match = lookup.matchType === "exact" ? "Exact match" : "Possible match";
  if (lookup.verified) return { match, availability: `Verified: ${best.availability}` };
  const tag = best.demo ? "DEMO DATA" : "unverified import";
  return { match, availability: `Needs confirmation (${tag} shows: ${best.availability})` };
}

export function formatLeadMessage(lead: Lead): string {
  const blocks: string[] = [];
  blocks.push(
    "🚨 NEW DO SUPPLY SALES LEAD",
    "",
    "👤 CUSTOMER",
    `Name: ${dash(lead.customer.name)}`,
    `Company: ${dash(lead.customer.company)}`,
    `Email: ${dash(lead.customer.email)}`,
    `Phone: ${dash(lead.customer.phone)}`
  );
  if (lead.customer.shipping) blocks.push(`Ship to: ${lead.customer.shipping}`);

  const items = lead.items.length ? lead.items : [undefined];
  items.forEach((item, i) => {
    const inv = inventoryLines(item?.lookup);
    const top = item?.lookup?.products[0];
    blocks.push("", `🔧 PRODUCT REQUEST${items.length > 1 ? ` (${i + 1} of ${items.length})` : ""}`);
    blocks.push(
      `Manufacturer: ${dash(item?.manufacturer || top?.manufacturer)}`,
      `Part Number: ${dash(item?.partNumber)}`,
      `Description: ${dash(item?.description || top?.name)}`,
      `Quantity: ${dash(item?.quantity)}`,
      `Condition: ${dash(item?.condition)}`,
      "",
      "📦 INVENTORY",
      `Match: ${inv.match}`,
      `Availability: ${inv.availability}`
    );
  });

  blocks.push("", "💬 CUSTOMER CONVERSATION", lead.summary, "", "🎯 LEAD STATUS", lead.kind);
  blocks.push("", `🕒 Submitted: ${submittedStamp(lead.createdAt)}`, `Lead ID: ${lead.id}`, `Source: ${lead.source}`);
  const text = blocks.join("\n");
  return text.length > 4000 ? text.slice(0, 3990) + "\n…" : text;
}

/** TELEGRAM_API_BASE exists so tests can point at a local fake; production uses Telegram. */
function apiBase(): string {
  return process.env.TELEGRAM_API_BASE?.trim() || "https://api.telegram.org";
}

function scrub(message: string): string {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  return token ? message.split(token).join("[token]") : message;
}

async function sendOnce(chatId: string, text: string): Promise<{ ok: boolean; error?: string; retryAfterMs?: number }> {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  try {
    const res = await fetch(`${apiBase()}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
      parameters?: { retry_after?: number };
    };
    if (res.ok && body.ok) return { ok: true };
    return {
      ok: false,
      error: scrub(`HTTP ${res.status}${body.description ? `: ${body.description}` : ""}`),
      retryAfterMs: body.parameters?.retry_after ? body.parameters.retry_after * 1000 : undefined,
    };
  } catch (err) {
    return { ok: false, error: scrub(err instanceof Error ? err.message : String(err)) };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Deliver (or simulate) the alert for a lead. Idempotent: a lead that is already
 * sent/simulated, or currently being delivered, is left alone.
 */
export async function notifyLead(leadId: string, opts: { force?: boolean } = {}): Promise<Lead | null> {
  if (inFlight.has(leadId)) return null;
  inFlight.add(leadId);
  try {
    const lead = await transact((d) => {
      const l = d.leads.find((x) => x.id === leadId);
      if (!l) return null;
      if (l.telegram.status === "sent" || l.telegram.status === "simulated") return null;
      if (!opts.force && l.telegram.attempts >= MAX_TOTAL_ATTEMPTS) return null;
      return structuredClone(l);
    });
    if (!lead) return null;

    const text = lead.telegram.message || formatLeadMessage(lead);

    const chats = await destinations();
    if (!(process.env.TELEGRAM_BOT_TOKEN || "").trim() || chats.length === 0) {
      return await transact((d) => {
        const l = d.leads.find((x) => x.id === leadId)!;
        l.telegram = { ...l.telegram, status: "simulated", message: text, lastAttemptAt: new Date().toISOString() };
        l.updatedAt = new Date().toISOString();
        return structuredClone(l);
      });
    }

    // Send to every connected chat. The lead counts as delivered once at least one chat has it.
    let delivered = 0;
    const failures: string[] = [];
    let attempts = lead.telegram.attempts;
    for (const chatId of chats) {
      let ok = false;
      let error: string | undefined;
      for (let i = 0; i < MAX_ATTEMPTS_PER_RUN && !ok; i++) {
        attempts += 1;
        const r = await sendOnce(chatId, text);
        ok = r.ok;
        error = r.error;
        if (!ok) {
          console.error(`[sales/telegram] lead ${leadId} to chat ${chatId} attempt ${i + 1} failed: ${error}`);
          if (i < MAX_ATTEMPTS_PER_RUN - 1) await sleep(Math.min(r.retryAfterMs ?? 1_000 * (i + 1) ** 2, 10_000));
        }
      }
      if (ok) delivered += 1;
      else failures.push(`${chatId}: ${error}`);
    }
    const ok = delivered > 0;
    const error = failures.length ? failures.join("; ") : undefined;

    return await transact((d) => {
      const l = d.leads.find((x) => x.id === leadId)!;
      const now = new Date().toISOString();
      l.telegram = {
        ...l.telegram,
        status: ok ? "sent" : "failed",
        attempts,
        lastAttemptAt: now,
        sentAt: ok ? now : l.telegram.sentAt,
        // On success, keep any per-chat failures visible so a dead chat is noticed.
        error,
        message: text,
      };
      if (ok && l.status === "New") l.status = "Notified";
      l.updatedAt = now;
      return structuredClone(l);
    });
  } finally {
    inFlight.delete(leadId);
  }
}

/** Retry alerts that previously failed. Safe to call often; it rate-limits itself. */
export async function retryFailedAlerts(): Promise<void> {
  if (!(await telegramConfigured())) return;
  const due = await readOnly((d) =>
    d.leads
      .filter(
        (l) =>
          (l.telegram.status === "failed" || l.telegram.status === "pending") &&
          l.telegram.attempts < MAX_TOTAL_ATTEMPTS &&
          Date.now() - new Date(l.telegram.lastAttemptAt || l.createdAt).getTime() > RETRY_AFTER_MS
      )
      .map((l) => l.id)
  );
  for (const id of due) await notifyLead(id);
}

/* ------------------------------------------------------------------ */
/* Bot API helper and configuration check (no secrets in results)      */
/* ------------------------------------------------------------------ */

export async function tg<T>(
  method: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; result?: T; description?: string; migrateTo?: number }> {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  try {
    const res = await fetch(`${apiBase()}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: T;
      description?: string;
      parameters?: { migrate_to_chat_id?: number };
    };
    return {
      ok: Boolean(json.ok),
      result: json.result,
      description: scrub(json.description || `HTTP ${res.status}`),
      migrateTo: json.parameters?.migrate_to_chat_id,
    };
  } catch (err) {
    return { ok: false, description: scrub(err instanceof Error ? err.message : String(err)) };
  }
}

export type ChatCheck = { id: string; type?: string; title?: string; ok: boolean; error?: string; sent?: boolean };
export type TelegramCheck = {
  configured: boolean;
  bot?: string;
  chats?: ChatCheck[];
  sent?: boolean;
  problem?: string;
  hint?: string;
};

/** Tell the owner exactly what is wrong with the Telegram setup, and optionally send a test message. */
export async function checkTelegram(sendTest: boolean): Promise<TelegramCheck> {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!token) {
    return { configured: false, problem: "TELEGRAM_BOT_TOKEN is not set on this server.", hint: "Set it in the host's environment and redeploy." };
  }
  const me = await tg<{ username?: string }>("getMe");
  if (!me.ok) {
    return { configured: true, problem: `Telegram rejected the bot token (${me.description}).`, hint: "Copy the token from @BotFather again. It looks like 123456789:AA…" };
  }
  const bot = me.result?.username ? `@${me.result.username}` : "bot";

  const ids = await destinations();
  if (ids.length === 0) {
    return {
      configured: true,
      bot,
      problem: "No chat is connected to receive alerts.",
      hint: `Use "Connect a chat" below: add ${bot} to a group or start a private chat with it, using the link shown. Alerts then go there automatically.`,
    };
  }

  const chats: ChatCheck[] = [];
  for (const id of ids) {
    const chat = await tg<{ id: number; type: string; title?: string; first_name?: string }>("getChat", { chat_id: id });
    if (!chat.ok) {
      const migrated = chat.migrateTo ? ` The group was upgraded to a supergroup; its new ID is ${chat.migrateTo}.` : "";
      chats.push({ id, ok: false, error: `${chat.description}.${migrated}` });
      continue;
    }
    const entry: ChatCheck = { id, ok: true, type: chat.result?.type, title: chat.result?.title || chat.result?.first_name };
    if (sendTest) {
      const sent = await tg("sendMessage", { chat_id: id, text: "✅ DO Supply Sales Agent: test alert. Telegram is connected." });
      entry.sent = sent.ok;
      if (!sent.ok) {
        entry.ok = false;
        entry.error = sent.description;
      }
    }
    chats.push(entry);
  }

  const good = chats.filter((c) => c.ok);
  if (good.length === 0) {
    return {
      configured: true,
      bot,
      chats,
      problem: "Telegram can't reach any connected chat.",
      hint: `${bot} must be a member of the chat. Re-add it to the group (or press Start in the private chat) using the connect link, or remove the stale entry.`,
    };
  }
  return { configured: true, bot, chats, sent: sendTest ? good.some((c) => c.sent) : undefined };
}
