import { detectCategory } from "./inventory";
import type { AskKey, Condition } from "./types";

/**
 * Rule-based entity extraction for the sales conversation. Deterministic on
 * purpose: part numbers, quantities and contact details must never be guessed.
 */

export type Extracted = {
  email?: string;
  invalidEmail: boolean;
  phone?: string;
  parts: string[];
  manufacturers: string[];
  category?: string;
  quantity?: number;
  quantityEach: boolean;
  condition?: Condition;
  human: boolean;
  replacement: boolean;
  decline: boolean;
  thanks: boolean;
  name?: string;
  company?: string;
  shipping?: string;
};

const MANUFACTURERS: [string, RegExp[]][] = [
  ["Allen-Bradley", [/\ballen[\s-]*bradley\b|\brockwell\b|\bcontrollogix\b|\bcompactlogix\b|\bpowerflex\b|\bpanelview\b/i, /\bAB\b/]],
  ["Siemens", [/\bsiemens\b|\bsimatic\b|\bsinamics\b/i]],
  ["Mitsubishi", [/\bmitsubishi\b|\bmelsec\b/i]],
  ["Omron", [/\bomron\b/i]],
  ["Schneider Electric", [/\bschneider\b|\bsquare[\s-]*d\b|\bmodicon\b|\btelemecanique\b|\baltivar\b/i]],
  ["GE/Emerson", [/\bemerson\b|\bge[\s-]*fanuc\b|\bge\/emerson\b/i, /\bGE\b/]],
  ["Eaton", [/\beaton\b|\bcutler[\s-]*hammer\b/i]],
  ["ABB", [/\bABB\b/]],
  ["Yaskawa", [/\byaskawa\b/i]],
  ["Fanuc", [/\bfanuc\b/i]],
  ["Honeywell", [/\bhoneywell\b/i]],
  ["Phoenix Contact", [/\bphoenix contact\b/i]],
  ["Beckhoff", [/\bbeckhoff\b/i]],
  ["Delta", [/\bdelta electronics\b/i]],
  ["Keyence", [/\bkeyence\b/i]],
  ["Danfoss", [/\bdanfoss\b/i]],
];

// The allen-bradley regex above also matches product-family words; keep those out of
// "the customer typed a manufacturer name" checks elsewhere by exporting the canonical list.
export const KNOWN_MANUFACTURERS = MANUFACTURERS.map(([n]) => n);

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, hundred: 100, dozen: 12, couple: 2, pair: 2,
};
const NUM = `(\\d{1,4}|${Object.keys(WORD_NUMBERS).join("|")})`;

function toNumber(s: string): number | undefined {
  const t = s.toLowerCase();
  if (/^\d+$/.test(t)) {
    const n = parseInt(t, 10);
    return n > 0 ? n : undefined;
  }
  return WORD_NUMBERS[t];
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b|\+\d[\d\s().-]{8,}\d/;
const SIEMENS_SPACED_RE = /\b6[A-Z]{2}\d\s?\d{3}-\w{4,5}-\w{4}\b/gi;
const PART_RE = /\b(?=[A-Z0-9./-]*\d)(?=[A-Z0-9./-]*[A-Z])[A-Z0-9][A-Z0-9./-]{4,}[A-Z0-9]\b/gi;
// Words that look like part numbers to the regex but are not.
const NOT_PARTS = /^(?:covid-?19|utf-?8|wi-?fi|rs-?(232|485|422)|ip\d{2}|24vdc|120vac|480vac|3-?phase)$/i;

const COMPANY_SUFFIX = /\b(inc|llc|ltd|corp|corporation|co|company|industries|manufacturing|systems|solutions|group|enterprises|automation|controls|plant|mills?|foods?|steel|logistics|services|technologies|electric|machine|works|packaging)\b/i;

const NAME_STOP = new Set([
  "looking", "trying", "interested", "needing", "need", "wanting", "want", "hoping", "calling",
  "writing", "just", "not", "also", "here", "in", "a", "an", "the", "with", "from", "at", "for",
  "sure", "good", "fine", "ok", "okay", "ready", "available", "wondering", "searching", "after",
]);

function stripSpans(text: string, re: RegExp): string {
  return text.replace(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"), " ");
}

function cleanPhrase(s: string): string {
  return s
    .replace(/\b(and|my|our|the|please|thanks|thank you)\b.*$/i, "")
    .replace(/[.,;:!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseName(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w === w.toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function parseIdentity(raw: string, forced: boolean): { name?: string; company?: string } {
  const text = raw.replace(/\s+/g, " ").trim();
  const out: { name?: string; company?: string } = {};

  // "Name: X  Company: Y"
  const nameLabel = text.match(/\bname\s*(?:is|:)\s*([A-Za-z][A-Za-z'’ -]{1,40}?)(?=\s+(?:company|from|at|with)\b|[,.;]|$)/i);
  const companyLabel = text.match(/\bcompany\s*(?:is|name is|:)\s*([^,.;]{2,50})/i);
  if (nameLabel) out.name = titleCaseName(cleanPhrase(nameLabel[1]));
  if (companyLabel) out.company = cleanPhrase(companyLabel[1]);

  // "I'm Dave Smith from Acme Corp" / "This is Dana at Acme"
  const intro = text.match(
    /\b(?:i['’]?m|i am|my name is|this is|it['’]?s)\s+([A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+){0,2})(?:\s*(?:,|from|with|at|of)\s+([A-Za-z0-9][^,.;]{1,50}))?/
  );
  if (intro && !NAME_STOP.has(intro[1].split(" ")[0].toLowerCase())) {
    out.name ??= intro[1].trim();
    if (intro[2]) out.company ??= cleanPhrase(intro[2]);
  }

  if (!out.name && !out.company && forced) {
    const parts = text
      .split(/\s*(?:,|\s-\s|\/|\bfrom\b|\bat\b|\bwith\b|\bof\b)\s*/i)
      .map((p) => cleanPhrase(p))
      .filter(Boolean);
    if (parts.length >= 2) {
      out.name = titleCaseName(parts[0]);
      out.company = parts[1];
    } else if (parts.length === 1) {
      const p = parts[0];
      const words = p.split(" ");
      if (COMPANY_SUFFIX.test(p) || words.length > 3 || /\d/.test(p)) out.company = p;
      else if (words.length <= 3 && /^[A-Za-z'’. -]+$/.test(p)) out.name = titleCaseName(p);
    }
  }
  // Company with a suffix in the name slot, e.g. "Acme Industries".
  if (out.name && !out.company && COMPANY_SUFFIX.test(out.name)) {
    out.company = out.name;
    out.name = undefined;
  }
  return out;
}

export function extract(raw: string, awaiting?: AskKey): Extracted {
  let text = raw.replace(/\s+/g, " ").trim();
  const out: Extracted = {
    invalidEmail: false,
    parts: [],
    manufacturers: [],
    quantityEach: false,
    human: false,
    replacement: false,
    decline: false,
    thanks: false,
  };

  // Contact details first, so they never get mistaken for part numbers or quantities.
  const email = text.match(EMAIL_RE);
  if (email) {
    out.email = email[0].toLowerCase();
    text = text.replace(email[0], " ");
  } else if (text.includes("@")) {
    out.invalidEmail = true;
  }
  const phone = text.match(PHONE_RE);
  if (phone) {
    out.phone = phone[0].trim();
    text = text.replace(phone[0], " ");
  }

  const lower = text.toLowerCase();

  // Part numbers.
  const parts: string[] = [];
  for (const m of text.matchAll(SIEMENS_SPACED_RE)) parts.push(m[0].replace(/\s+/g, "").toUpperCase());
  const remainder = text.replace(SIEMENS_SPACED_RE, " ");
  for (const m of remainder.matchAll(PART_RE)) {
    const token = m[0].toUpperCase().replace(/[./-]+$/, "");
    if (token.length < 6 || (token.match(/\d/g) || []).length < 2) continue;
    if (NOT_PARTS.test(token)) continue;
    parts.push(token);
  }
  out.parts = [...new Set(parts)];
  let stripped = remainder;
  for (const p of out.parts) stripped = stripped.split(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).join(" ");

  // Manufacturers.
  for (const [name, res] of MANUFACTURERS) if (res.some((re) => re.test(stripped))) out.manufacturers.push(name);
  out.category = detectCategory(stripped);

  // Intents.
  out.human =
    /\b(?:talk|speak|chat|connect)\s+(?:to|with)\s+(?:a\s+|an\s+|the\s+|your\s+|some\s*one\s+(?:in\s+)?)?(?:sales|human|person|rep|representative|someone|agent|salesperson|somebody|real)\b|\bhuman\b|\brepresentative\b|\bsales\s*rep\b|\bcall me\b|\bsomeone (?:call|reach|contact)\b|\breal person\b|\bsales team\b|\bsalesperson\b/i.test(
      lower
    );
  out.replacement =
    /replac|substitut|alternativ|equivalent|cross[\s-]?ref|supersed|successor|obsolete|discontinu|end[\s-]of[\s-]life|no longer (?:made|available|supported)|upgrade path|migrat/i.test(lower);
  out.decline =
    /^(?:(?:um+|uh+|hmm+|well|honestly)[,.\s]+)?(?:no|nope|nah|none|nothing|not really|not sure|n\/a|skip|pass|that'?s (?:all|it|everything)|no thanks|no thank you|i'?m good|all good|i(?:'?m| am) not sure|i (?:really )?(?:don'?t|do not) (?:know|have)|i have no idea|no idea|don'?t have one|don'?t know|do not know|unsure|idk)\b/i.test(
      lower.trim()
    );
  out.thanks = /^(?:thanks|thank you|thx|ty|great|perfect|awesome|sounds good|ok|okay|cool)\b/i.test(lower.trim());

  // Condition.
  if (/\bno (?:real )?preference\b|\bdoesn'?t matter\b|\bdon'?t care\b|\bany(?:thing)?\b|\beither\b|\bwhatever\b|\bflexible\b/.test(lower) && awaiting === "condition") {
    out.condition = "No preference";
  } else if (/\bnew surplus\b|\bnsn\b|\bnew other\b/.test(lower)) out.condition = "New Surplus";
  else if (/\brefurb\w*|\breman\w*|\brebuilt\b/.test(lower)) out.condition = "Refurbished";
  else if (/\bused\b|\bpre-?owned\b/.test(lower)) out.condition = "Used";
  else if (/\bbrand new\b|\bfactory sealed\b|\bnib\b|\bnew in box\b/.test(lower) || (awaiting === "condition" && /\bnew\b/.test(lower))) {
    out.condition = "New";
  }

  // Quantity: only trust unambiguous phrasings unless a quantity was just asked for.
  const qtyPatterns: RegExp[] = [
    new RegExp(`\\b${NUM}\\s*(?:x|×|units?|pcs?|pieces?|ea|each|of them|of those|of these)\\b`, "i"),
    new RegExp(`\\b(?:x|×)\\s*${NUM}\\b`, "i"),
    new RegExp(`\\b(?:qty|quantity|need|want|get|buy|order|quote|quoting|looking for|looking to (?:buy|get|order)|for)\\s*(?:of\\s*)?(?:about\\s*|around\\s*)?${NUM}\\b`, "i"),
    new RegExp(`^${NUM}\\s+(?=[A-Za-z])`, "i"),
  ];
  for (const re of qtyPatterns) {
    const m = stripped.match(re);
    if (m) {
      const n = toNumber(m[1]);
      if (n) {
        out.quantity = n;
        break;
      }
    }
  }
  if (!out.quantity && awaiting === "qty") {
    const m = stripped.match(new RegExp(`\\b${NUM}\\b`, "i")) || (/\ban?\b|\bjust me\b/i.test(stripped) ? ["", "one"] : null);
    if (m) out.quantity = toNumber(m[1]);
  }
  if (/\b(?:of each|each one|each of them|all of them|of every)\b/i.test(stripped)) out.quantityEach = true;

  // Shipping destination.
  const ship = raw.match(/\bship(?:ping|ped)?\s+(?:it\s+|them\s+)?to\s+([A-Za-z][A-Za-z ,.]{2,40})/i);
  if (ship) out.shipping = cleanPhrase(ship[1]);

  // Name and company.
  const identityReply = awaiting === "identity" && !out.human;
  const ident = parseIdentity(text, identityReply && !out.decline);
  if (ident.name) out.name = ident.name;
  if (ident.company) out.company = ident.company;

  return out;
}
