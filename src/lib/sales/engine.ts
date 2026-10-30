import { extract, type Extracted } from "./extract";
import { norm, searchInventory } from "./inventory";
import type { AskKey, ChatMessage, Customer, Product, RequestItem, Session } from "./types";

/**
 * Conversation engine.
 *
 * Deterministic and slot-based: every turn extracts entities, updates the
 * session, searches inventory for anything new, and then asks for the single
 * most useful missing detail. Nothing is asked twice, and nothing about stock,
 * price or compatibility is stated unless the inventory layer returned it.
 *
 * Integration point: an LLM can be layered on top for free-form phrasing, but
 * the slot logic and the factual statements below should stay in this module.
 */

export const GREETING =
  "Hi! Welcome to DO Supply. I'm here to help you find the automation parts you need.\n\nLooking for a specific part number, trying to find a replacement, or need help sourcing something hard to find?\n\nTell me what you're looking for and we'll take it from there.";

export const STARTERS = ["Find a part", "Request a quote", "Find a replacement", "Check availability", "Talk to sales"];

export const NOT_FOUND_LINE =
  "I can help you request a quote for that part. Let me collect a few details so our sales team can confirm availability and pricing.";

export type Reply = { text: string; cards?: Product[]; quickReplies?: string[] };
export type StepResult = {
  replies: Reply[];
  /** True when the request is complete enough to create a lead and alert sales. */
  ready: boolean;
  /** True when this turn changed lead-relevant details. */
  changed: boolean;
};

const id = () => crypto.randomUUID();

export function newSession(): Session {
  const now = new Date().toISOString();
  return {
    id: id(),
    createdAt: now,
    updatedAt: now,
    messages: [msg("assistant", GREETING, { quickReplies: STARTERS })],
    items: [],
    customer: {},
    humanRequested: false,
    replacementIntent: false,
    additionalNotes: [],
    asked: {},
  };
}

export function msg(
  role: ChatMessage["role"],
  text: string,
  extra: Partial<Pick<ChatMessage, "cards" | "quickReplies">> = {}
): ChatMessage {
  return { id: id(), role, text, ts: new Date().toISOString(), ...extra };
}

/* ------------------------------ helpers ------------------------------ */

export function itemLabel(item: RequestItem): string {
  const top = item.lookup?.matchType === "exact" ? item.lookup.products[0] : undefined;
  const mfr = item.manufacturer || top?.manufacturer;
  if (item.partNumber) return [mfr, item.partNumber].filter(Boolean).join(" ");
  return item.description || mfr || "your part";
}

function shortLabel(item: RequestItem): string {
  return item.partNumber ? `the ${item.partNumber}` : `the ${item.description || "part"}`;
}

function localQty(raw: string, part: string): number | undefined {
  const idx = raw.toUpperCase().indexOf(part);
  if (idx < 0) return undefined;
  const before = raw.slice(Math.max(0, idx - 16), idx);
  const after = raw.slice(idx + part.length, idx + part.length + 14);
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
  const num = (s: string) => (/^\d+$/.test(s) ? parseInt(s, 10) : words[s.toLowerCase()]);
  const b = before.match(/(\d{1,4}|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*(?:x|×|pcs?|units?|of)?\s*(?:the\s+)?$/i);
  if (b) return num(b[1]);
  const a = after.match(/^\s*(?:x|×|qty:?|\()\s*(\d{1,4})/i);
  if (a) return num(a[1]);
  return undefined;
}

function describeAvailability(p: Product): string {
  switch (p.availability) {
    case "In Stock":
      return "shows as in stock";
    case "Limited":
      return "shows limited stock";
    case "Lead Time":
      return "shows as a lead-time item";
    default:
      return "is a legacy part we'd source for you";
  }
}

function sourceNote(item: RequestItem): string {
  const lk = item.lookup;
  if (!lk || lk.verified) return "";
  const top = lk.products[0];
  return top?.demo ? " (that's DEMO DATA, so our team will confirm real availability)" : " (from an imported list, so our team will confirm)";
}

function itemAcknowledgement(item: RequestItem): { text: string; cards: Product[] } {
  const lk = item.lookup;
  const label = itemLabel(item);
  if (!lk || lk.matchType === "none" || !lk.products.length) {
    if (item.partNumber) {
      return {
        text: `I don't see ${item.partNumber} in the catalog I can search. ${NOT_FOUND_LINE} If you'd rather have us hunt for it, I can submit it as a sourcing request.`,
        cards: [],
      };
    }
    return {
      text: `I don't have a close match for ${label} in the catalog I can search right now, but sourcing hard-to-find parts is what the team does. A part number or nameplate model would help narrow it down.`,
      cards: [],
    };
  }
  const top = lk.products[0];
  if (lk.matchType === "exact" && item.partNumber) {
    let text = `Got it. You're looking for the ${top.manufacturer} ${top.partNumber}, the ${top.name}. It ${describeAvailability(top)}${sourceNote(item)}.`;
    if (item.replacement && top.possibleAlternative) {
      text += ` For a replacement, our team can look at the ${top.possibleAlternative.partNumber} as a possible alternative. ${top.possibleAlternative.note} I can't confirm they're interchangeable myself.`;
    } else if (item.replacement) {
      text += " I can't confirm a drop-in replacement from here, so I'll have our team verify cross-references before anything is quoted.";
    }
    return { text, cards: [top] };
  }
  if (item.partNumber) {
    return {
      text: `I don't have an exact match for ${item.partNumber}, but these are in the same family. I can't say they're interchangeable, so I'd have our team verify before quoting anything.`,
      cards: lk.products.slice(0, 3),
    };
  }
  const where = lk.verified ? "our catalog" : "the demo catalog (DEMO DATA)";
  return {
    text: `Here's what I'm seeing in ${where} for ${label}. If one of these is what you need, tell me the part number. If not, describe the application or nameplate and we'll take it from there.`,
    cards: lk.products.slice(0, 3),
  };
}

function quantityNote(item: RequestItem): string {
  const top = item.lookup?.products[0];
  if (
    item.quantity &&
    item.lookup?.matchType === "exact" &&
    top?.qtyAvailable !== undefined &&
    item.quantity > top.qtyAvailable
  ) {
    return " That's more than the listing shows on hand, so the team may need to source extra units.";
  }
  return "";
}

/* ------------------------------ questions ------------------------------ */

type Question = { key: AskKey; text: string; quickReplies?: string[] };

function bump(s: Session, key: AskKey) {
  s.asked[key] = (s.asked[key] || 0) + 1;
  s.awaiting = key;
}

function nextQuestion(s: Session, ex: Extracted): Question | null {
  const hasRequest = s.items.length > 0 || s.humanRequested;

  if (!hasRequest && (s.asked.part || 0) < 2) {
    const first = (s.asked.part || 0) === 0;
    return {
      key: "part",
      text: first
        ? "Happy to help. Do you have a part number, or can you tell me the manufacturer and what the part does?"
        : "No problem. Even a partial number, the manufacturer, or what it controls is enough for me to start.",
    };
  }

  for (const item of s.items) {
    if (!item.partNumber && !item.partAsked) {
      item.partAsked = true;
      const kind = item.description || "part";
      return {
        key: "part",
        text: `Do you have a specific catalog or part number, or are you looking for a particular type of ${kind.replace(/^\S+\s(?=PLC|HMI|Drive|Servo)/, "")}? Even a partial number or nameplate model helps.`,
      };
    }
  }

  for (const item of s.items) {
    if (!item.quantity && !item.qtyAsked) {
      item.qtyAsked = true;
      s.focusItemId = item.id;
      const many = s.items.length > 1;
      return {
        key: "qty",
        text: many ? `How many of ${shortLabel(item)} do you need?` : "How many units are you looking for?",
      };
    }
  }

  const needsContact = !s.customer.email || !s.customer.name;
  const conditionKnown = s.items.some((i) => i.condition);
  if (s.items.length && !conditionKnown && !s.asked.condition && needsContact) {
    return {
      key: "condition",
      text: "Do you have a preference on condition, like new, new surplus or refurbished, or should we quote what's available?",
      quickReplies: ["New", "Refurbished", "No preference"],
    };
  }

  if (!s.customer.email && (hasRequest || (s.asked.part || 0) >= 2)) {
    const count = s.asked.email || 0;
    if (ex.invalidEmail && count < 3) {
      return { key: "email", text: "That email doesn't look quite right. Could you double-check it for me?" };
    }
    if (count === 0) {
      return {
        key: "email",
        text: s.humanRequested
          ? "Absolutely, I'll get a sales rep on this. What's the best email to reach you at?"
          : "What's the best email to send the quote to?",
      };
    }
    if (count === 1) {
      return { key: "email", text: "I do need an email address so a rep can send pricing and availability. Where should it go?" };
    }
    return null;
  }

  if (s.customer.email && !s.asked.identity && !(s.customer.name && s.customer.company)) {
    return {
      key: "identity",
      text: s.customer.name
        ? "And what company are you with? A phone number helps too if it's urgent."
        : "Who am I working with? Your name and company is plenty, and add a phone number if you'd like a call.",
    };
  }
  return null;
}

/* ------------------------------ the turn ------------------------------ */

const CHIPS: Record<string, { text: string; replacement?: boolean }> = {
  "find a part": { text: "Happy to help. Do you have a part number, or can you tell me the manufacturer and what the part does?" },
  "request a quote": { text: "Happy to get that quoted. Which part or parts do you need, and how many?" },
  "find a replacement": {
    text: "Sure. What's the part number you need to replace? If it's discontinued or you only have a model name, give me the manufacturer and whatever is on the nameplate.",
    replacement: true,
  },
  "check availability": { text: "Which part number should I check? I'll tell you exactly what I can and can't verify." },
};

function applyContact(s: Session, ex: Extracted): boolean {
  let changed = false;
  const c: Customer = s.customer;
  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => {
    if (v && c[k] !== v) {
      c[k] = v;
      changed = true;
    }
  };
  set("email", ex.email);
  set("phone", ex.phone);
  set("name", ex.name);
  set("company", ex.company);
  set("shipping", ex.shipping);
  return changed;
}

function isDescriptionItem(i: RequestItem) {
  return !i.partNumber;
}

export async function step(s: Session, raw: string): Promise<StepResult> {
  const text = raw.trim();
  const awaiting = s.awaiting;
  s.awaiting = undefined;
  const replies: Reply[] = [];
  const hadLeadAlready = Boolean(s.leadId);
  let changed = false;

  const chip = CHIPS[text.toLowerCase().replace(/[.!]+$/, "")];
  if (chip) {
    if (chip.replacement) s.replacementIntent = true;
    bump(s, "part");
    return { replies: [{ text: chip.text }], ready: false, changed: false };
  }

  const ex = extract(text, awaiting);
  if (applyContact(s, ex)) changed = true;
  if (ex.human && !s.humanRequested) {
    s.humanRequested = true;
    changed = true;
  }
  if (ex.replacement) s.replacementIntent = true;

  const acks: string[] = [];
  const cards: Product[] = [];
  const newItems: RequestItem[] = [];

  // Part numbers.
  for (const pn of ex.parts) {
    if (s.items.some((i) => i.partNumber && norm(i.partNumber) === norm(pn))) continue;
    const pending = awaiting === "part" && ex.parts.length === 1 ? [...s.items].reverse().find(isDescriptionItem) : undefined;
    const manufacturer = ex.manufacturers.length === 1 ? ex.manufacturers[0] : pending?.manufacturer;
    const item: RequestItem = pending || { id: id() };
    item.partNumber = pn;
    item.manufacturer = manufacturer || item.manufacturer;
    item.replacement = ex.replacement || s.replacementIntent || item.replacement;
    item.lookup = await searchInventory({ partNumber: pn, manufacturer: item.manufacturer });
    const top = item.lookup.products[0];
    if (item.lookup.matchType === "exact" && top) {
      item.manufacturer = top.manufacturer;
      item.description = top.name;
    }
    if (!pending) s.items.push(item);
    newItems.push(item);
    const local = localQty(text, pn);
    if (local) item.quantity = local;
  }

  // Descriptions: manufacturer and/or product type without a part number.
  const looksLikeContactReply = awaiting === "identity" || awaiting === "email";
  const wantsDescription =
    ex.parts.length === 0 &&
    !looksLikeContactReply &&
    (ex.manufacturers.length > 0 || ex.category) &&
    !(ex.decline || (ex.name && !ex.category));
  if (wantsDescription) {
    const mfr = ex.manufacturers[0];
    const pending = awaiting === "part" ? [...s.items].reverse().find(isDescriptionItem) : undefined;
    const desc = [mfr, ex.category ? ex.category.replace(" / VFD", "") : undefined].filter(Boolean).join(" ") || text.slice(0, 80);
    const item: RequestItem = pending || { id: id() };
    item.manufacturer = mfr || item.manufacturer;
    item.description = desc;
    item.replacement = ex.replacement || s.replacementIntent || item.replacement;
    item.lookup = await searchInventory({ manufacturer: item.manufacturer, text });
    if (!pending) s.items.push(item);
    newItems.push(item);
  } else if (
    awaiting === "part" &&
    ex.parts.length === 0 &&
    !ex.decline &&
    !ex.thanks &&
    !ex.human &&
    text.length > 3 &&
    text.split(/\s+/).length >= 2 &&
    !/^(?:hi|hello|hey|yo|good\s+(?:morning|afternoon|evening))\b[\s!.,]*$/i.test(text) &&
    !ex.email
  ) {
    // Free-text description we can't classify. Keep it, search on it, never guess.
    const item: RequestItem = { id: id(), description: text.slice(0, 120), replacement: s.replacementIntent };
    item.lookup = await searchInventory({ text });
    s.items.push(item);
    newItems.push(item);
  }
  if (newItems.length) changed = true;

  // Quantity.
  if (ex.quantity) {
    const lacking = s.items.filter((i) => !i.quantity);
    let targets: RequestItem[] = [];
    if (ex.quantityEach) targets = lacking;
    else if (awaiting === "qty") {
      const focus = s.items.find((i) => i.id === s.focusItemId && !i.quantity) || lacking[0];
      if (focus) targets = [focus];
    } else if (newItems.length === 1 && !newItems[0].quantity) targets = [newItems[0]];
    else if (!newItems.length && lacking.length === 1) targets = lacking;
    for (const t of targets) {
      t.quantity = ex.quantity;
      t.qtyAsked = true;
      changed = true;
    }
  }
  if (awaiting === "qty" && !ex.quantity) {
    const focus = s.items.find((i) => i.id === s.focusItemId);
    if (focus) focus.qtyAsked = true;
  }

  // Condition.
  if (ex.condition || (awaiting === "condition" && ex.decline)) {
    const cond = ex.condition || "No preference";
    for (const i of s.items) if (!i.condition) i.condition = cond;
    changed = true;
  }
  if (awaiting === "identity") s.asked.identity = Math.max(1, s.asked.identity || 0);

  // Acknowledgements for new items.
  for (const item of newItems) {
    const a = itemAcknowledgement(item);
    acks.push(a.text);
    cards.push(...a.cards);
    if (item.quantity) {
      const note = quantityNote(item);
      if (note) acks.push(note.trim());
    }
  }
  if (ex.quantity && !newItems.length) {
    const t = s.items.find((i) => i.quantity === ex.quantity);
    const note = t ? quantityNote(t) : "";
    acks.push(`Perfect, ${ex.quantity} ${ex.quantity === 1 ? "unit" : "units"}.${note}`);
  }
  if (ex.human && !hadLeadAlready) {
    acks.push("Understood. I'll make sure a sales rep gets this.");
  }
  if (ex.condition && awaiting === "condition") acks.push(`Noted, ${ex.condition.toLowerCase()}.`);
  if (ex.shipping) acks.push(`Got it, shipping to ${ex.shipping}.`);

  // Choose what to say next.
  const q = hadLeadAlready ? null : nextQuestion(s, ex);
  if (q) {
    bump(s, q.key);
    if (acks.length) replies.push({ text: acks.join(" "), cards: cards.length ? cards : undefined });
    replies.push({ text: q.text, quickReplies: q.quickReplies });
    return { replies, ready: false, changed };
  }

  const hasRequest = s.items.length > 0 || s.humanRequested || (s.asked.part || 0) >= 2;
  if (!hadLeadAlready && s.customer.email && hasRequest) {
    // Confirmation text is composed by the orchestrator once delivery status is known.
    if (acks.length) replies.push({ text: acks.join(" "), cards: cards.length ? cards : undefined });
    return { replies, ready: true, changed: true };
  }

  if (hadLeadAlready) {
    if (acks.length) {
      replies.push({ text: acks.join(" "), cards: cards.length ? cards : undefined });
      replies.push({ text: "I've added that to your request so the sales team sees it. Anything else to include, like a timeline or ship-to location?" });
    } else if (changed) {
      replies.push({ text: "Thanks, I've added that to your request for the sales team." });
    } else if (ex.thanks || ex.decline) {
      replies.push({ text: "You're welcome. Your request is with our sales team and they'll follow up with you directly. If anything changes, just tell me here." });
    } else if (/\b(price|cost|how much|lead time|ship|when|deliver)/i.test(text)) {
      replies.push({ text: "I can't quote pricing or delivery dates myself. Our sales team confirms both with your quote, and I've flagged this question for them." });
      s.additionalNotes.push(text.slice(0, 200));
      changed = true;
    } else {
      s.additionalNotes.push(text.slice(0, 200));
      changed = true;
      replies.push({ text: "Noted, I've added that for the sales team. Anything else you want me to include?" });
    }
    return { replies, ready: false, changed };
  }

  // Nothing matched and there was nothing left to ask.
  if (acks.length) replies.push({ text: acks.join(" "), cards: cards.length ? cards : undefined });
  else
    replies.push({
      text: "I want to point you at the right part. Could you give me a part number, or the manufacturer and what it does? If you'd rather talk to a person, say \"talk to sales\" and I'll route you.",
    });
  return { replies, ready: false, changed };
}
