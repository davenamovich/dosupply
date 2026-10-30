import { transact } from "./store";
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

export function telegramConfigured(): boolean {
  return Boolean(
    (process.env.TELEGRAM_BOT_TOKEN || "").trim() && (process.env.TELEGRAM_CHAT_ID || "").trim()
  );
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

function scrub(message: string): string {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  return token ? message.split(token).join("[token]") : message;
}

async function sendOnce(text: string): Promise<{ ok: boolean; error?: string; retryAfterMs?: number }> {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID || "").trim();
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
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

    if (!telegramConfigured()) {
      return await transact((d) => {
        const l = d.leads.find((x) => x.id === leadId)!;
        l.telegram = { ...l.telegram, status: "simulated", message: text, lastAttemptAt: new Date().toISOString() };
        l.updatedAt = new Date().toISOString();
        return structuredClone(l);
      });
    }

    let error: string | undefined;
    let ok = false;
    let attempts = lead.telegram.attempts;
    for (let i = 0; i < MAX_ATTEMPTS_PER_RUN && !ok; i++) {
      attempts += 1;
      const r = await sendOnce(text);
      ok = r.ok;
      error = r.error;
      if (!ok) {
        console.error(`[sales/telegram] lead ${leadId} attempt ${attempts} failed: ${error}`);
        if (i < MAX_ATTEMPTS_PER_RUN - 1) await sleep(Math.min(r.retryAfterMs ?? 1_000 * (i + 1) ** 2, 10_000));
      }
    }

    return await transact((d) => {
      const l = d.leads.find((x) => x.id === leadId)!;
      const now = new Date().toISOString();
      l.telegram = {
        ...l.telegram,
        status: ok ? "sent" : "failed",
        attempts,
        lastAttemptAt: now,
        sentAt: ok ? now : l.telegram.sentAt,
        error: ok ? undefined : error,
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
  if (!telegramConfigured()) return;
  const { readOnly } = await import("./store");
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
