import { itemLabel, msg, newSession, step, type Reply } from "./engine";
import { transact } from "./store";
import { formatLeadMessage, notifyLead, retryFailedAlerts, telegramConfigured } from "./telegram";
import type { ChatMessage, Lead, LeadKind, Session } from "./types";

/**
 * Orchestrates one chat turn: conversation engine -> lead qualification ->
 * lead database -> Telegram alert, then writes the reply that honestly
 * reflects what actually happened to the alert.
 */

const MAX_MESSAGES = 120;

export type TurnOutput = {
  sessionId: string;
  messages: ChatMessage[];
  leadId?: string;
  alert?: Lead["telegram"]["status"];
  humanRequested: boolean;
};

/* --------------------------- lead qualification --------------------------- */

export function leadKind(s: Session): LeadKind {
  if (s.humanRequested && s.items.length === 0) return "Sales Callback Request";
  if (s.replacementIntent || s.items.some((i) => i.replacement)) return "Replacement Request";
  if (s.items.some((i) => !i.lookup || i.lookup.matchType !== "exact")) return "Sourcing Request";
  return "New Quote Request";
}

const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);

export function summarize(s: Session): string {
  const asks = s.messages.filter((m) => m.role === "user").map((m) => clip(m.text.replace(/\s+/g, " "), 140));
  const parts: string[] = [];
  if (s.items.length) {
    parts.push(
      "Wants: " +
        s.items
          .map((i) => `${i.quantity ?? "qty TBD"} × ${itemLabel(i)}${i.condition && i.condition !== "No preference" ? ` (${i.condition})` : ""}`)
          .join("; ")
    );
  }
  if (s.humanRequested) parts.push("Asked to speak with a sales rep.");
  if (s.additionalNotes.length) parts.push("Notes: " + s.additionalNotes.map((n) => clip(n, 100)).join(" | "));
  if (asks.length) parts.push(`Said: "${asks[0]}"` + (asks.length > 3 ? ` … "${asks[asks.length - 1]}"` : ""));
  return parts.join("\n");
}

function leadId(): string {
  return "DOS-" + crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
}

/** Create the lead once per session (the session id is the dedupe key); otherwise sync it. */
async function upsertLead(s: Session): Promise<{ lead: Lead; created: boolean }> {
  return transact((d) => {
    const now = new Date().toISOString();
    let lead = d.leads.find((l) => l.sessionId === s.id);
    const created = !lead;
    if (!lead) {
      lead = {
        id: leadId(),
        sessionId: s.id,
        createdAt: now,
        updatedAt: now,
        kind: leadKind(s),
        status: "New",
        customer: { ...s.customer },
        items: structuredClone(s.items),
        transcript: structuredClone(s.messages),
        summary: summarize(s),
        telegram: { status: "pending", attempts: 0, message: "" },
        updatedAfterAlert: false,
        source: "Website AI Sales Agent",
      };
      lead.telegram.message = formatLeadMessage(lead);
      d.leads.push(lead);
    } else {
      lead.customer = { ...s.customer };
      lead.items = structuredClone(s.items);
      lead.transcript = structuredClone(s.messages);
      lead.summary = summarize(s);
      lead.kind = leadKind(s);
      lead.updatedAt = now;
      if (lead.telegram.status === "sent" || lead.telegram.status === "simulated") lead.updatedAfterAlert = true;
      else lead.telegram.message = formatLeadMessage(lead); // alert not out yet: send the fresh details
    }
    const stored = d.sessions.find((x) => x.id === s.id);
    s.leadId = lead.id;
    if (stored) stored.leadId = lead.id;
    return { lead: structuredClone(lead), created };
  });
}

function requestSummary(s: Session): string {
  const lines = s.items.map(
    (i) => `• ${i.quantity ?? "Qty TBD"} × ${itemLabel(i)}${i.condition ? ` — ${i.condition}` : ""}`
  );
  if (!lines.length && s.humanRequested) lines.push("• Callback from a sales rep");
  return lines.join("\n");
}

function confirmation(s: Session, status: Lead["telegram"]["status"]): string {
  const recap = requestSummary(s);
  const who = s.customer.email ? ` at ${s.customer.email}` : "";
  if (status === "sent") {
    return `Perfect. I've got the details of your request. I'm sending this to our sales team now so someone can follow up with you.\n\nHere's what I have:\n${recap}\n\nA rep will reach out${who}. If you think of anything else, like a deadline or ship-to location, tell me here and I'll add it.`;
  }
  if (status === "simulated") {
    return `Perfect. I've got the details of your request and saved it for our sales team.\n\nHere's what I have:\n${recap}\n\nDemo mode: Telegram isn't connected, so the sales alert was simulated and you can see it on the dashboard. In production a rep would follow up${who}.`;
  }
  return `Perfect. I've got the details of your request and saved it for our sales team.\n\nHere's what I have:\n${recap}\n\nOur instant alert didn't go through, so I'm retrying it automatically. Your request is saved and a rep will pick it up${who ? ` and follow up${who}` : ""}.`;
}

/* ------------------------------ the turn ------------------------------ */

function toMessages(replies: Reply[]): ChatMessage[] {
  return replies.map((r) => msg("assistant", r.text, { cards: r.cards, quickReplies: r.quickReplies }));
}

export async function startSession(): Promise<{ session: Session }> {
  const session = newSession();
  await transact((d) => {
    d.sessions.push(session);
  });
  return { session };
}

export async function loadOrStart(sessionId?: string): Promise<Session> {
  if (sessionId) {
    const { getSession } = await import("./store");
    const found = await getSession(sessionId);
    if (found) return found;
  }
  return (await startSession()).session;
}

export async function processMessage(sessionId: string | undefined, text: string): Promise<TurnOutput> {
  const session = await loadOrStart(sessionId);
  if (session.messages.length >= MAX_MESSAGES) {
    const note = msg("assistant", "This conversation has gotten long. Please start a new chat, or say \"talk to sales\" and a rep will follow up directly.");
    return { sessionId: session.id, messages: [note], leadId: session.leadId, humanRequested: session.humanRequested };
  }

  void retryFailedAlerts().catch((e) => console.error("[sales] retry sweep failed:", e));

  const userMsg = msg("user", text);
  session.messages.push(userMsg);
  const result = await step(session, text);
  let out = toMessages(result.replies);
  let alert: Lead["telegram"]["status"] | undefined;

  if (result.ready && !session.leadId) {
    // Persist the transcript so far, then create the lead and fire the alert immediately.
    session.messages.push(...out);
    const { lead, created } = await upsertLead(session);
    const delivered = created ? await notifyLead(lead.id) : null;
    const status = (delivered || lead).telegram.status;
    alert = status;
    const final = msg("assistant", confirmation(session, status));
    out = [...out, final];
    session.messages.push(final);
    await persist(session);
    await syncTranscript(session); // keep the lead transcript in step with the confirmation
    return { sessionId: session.id, messages: out, leadId: lead.id, alert, humanRequested: session.humanRequested };
  }

  session.messages.push(...out);
  if (session.leadId && result.changed) await upsertLead(session);
  else if (session.leadId) await syncTranscript(session);
  await persist(session);
  return { sessionId: session.id, messages: out, leadId: session.leadId, alert, humanRequested: session.humanRequested };
}

async function syncTranscript(s: Session) {
  await transact((d) => {
    const lead = d.leads.find((l) => l.sessionId === s.id);
    if (lead) {
      lead.transcript = structuredClone(s.messages);
      lead.updatedAt = new Date().toISOString();
    }
  });
}

async function persist(s: Session) {
  s.updatedAt = new Date().toISOString();
  await transact((d) => {
    const i = d.sessions.findIndex((x) => x.id === s.id);
    if (i >= 0) d.sessions[i] = structuredClone(s);
    else d.sessions.push(structuredClone(s));
  });
}

export async function alertMode(): Promise<"telegram" | "simulated"> {
  return (await telegramConfigured()) ? "telegram" : "simulated";
}
