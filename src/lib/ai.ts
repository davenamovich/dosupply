import ZAI from "z-ai-web-dev-sdk";

/**
 * Shared grounding context for every generation call.
 * Facts below were verified from DO Supply's own first-party sources
 * (official LinkedIn company page + SilkRoad job postings, 2026-10-29).
 * The marketing specialist candidate uses the same verified facts so the
 * demo never invents specifications, compatibility claims or availability.
 */
export const DO_SUPPLY_CONTEXT = `
COMPANY GROUNDING (verified, use exactly — do not invent beyond this):
- DO Supply, LLC is a global supplier of replacement parts for industrial automation equipment: buying, selling, testing, repairing, refurbishing and calibrating components.
- Tagline / positioning: "Your Source for Need-it-Now Automation Parts." They emphasize speed, expert support and reliability for critical operations.
- Founded 2015. HQ: 6305 Lake Wheeler Rd, Raleigh, NC. Marketing office: 1652 Old Apex Rd, Cary, NC. Privately held, 11-50 employees.
- Product categories: PLCs, HMIs (operator terminals), AC/DC/servo drives and VFDs, motors, power supplies, industrial circuit boards, robotics and related control devices.
- Verified manufacturer platforms they specialize in: Allen-Bradley ControlLogix, Allen-Bradley CompactLogix, Allen-Bradley PowerFlex drives, Allen-Bradley PanelView HMI terminals, Allen-Bradley SLC 500 (legacy migration), Eaton PanelMate. These are platform/series names, NOT specific SKUs.
- Customers: manufacturers and maintenance teams worldwide who need parts fast to keep lines running and minimize downtime.
- Channels they market on: LinkedIn, Facebook, Instagram, X, YouTube, email, website blog (dosupply.com/tech), Google Business Profile and Review.io reviews.

BRAND VOICE:
- Confident, technical, plain-spoken. Talks like a knowledgeable parts specialist, not a generic AI.
- Speed and downtime-urgency matter: "need-it-now", "keep your line running", "minimize downtime".
- Expert but never hypey. No exclamation mark spam. No invented specs, pricing, compatibility or availability claims.

HARD RULES (violating these fails the demo):
- NEVER invent technical specifications, part numbers, certifications, compatibility claims, prices or stock availability.
- NEVER invent customer names, testimonials or statistics presented as real.
- When writing marketing copy, speak AS DO Supply's marketing voice; the reader is an industrial buyer or maintenance engineer.
`;

export const JSON_ONLY_INSTRUCTION =
  "Respond with a single valid JSON object only. No markdown fences, no commentary before or after. Every string you output must be finished content (not placeholders like '...').";

let cachedZai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZai() {
  if (!cachedZai) {
    cachedZai = await ZAI.create();
  }
  return cachedZai;
}

/** Run a chat completion and return the text content. Throws on empty. */
export async function chat(
  system: string,
  user: string,
  maxTokensHint = "be thorough but efficient"
): Promise<string> {
  const zai = await getZai();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: `${system}\n\n${maxTokensHint}` },
      { role: "user", content: user },
    ],
    thinking: { type: "disabled" },
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from model");
  return text;
}

/** Tolerant JSON extraction — handles fences or stray prose. */
export function parseJsonLoose<T>(raw: string): T {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start > 0 || end < text.length - 1) {
    if (start !== -1 && end !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }
  }
  return JSON.parse(text) as T;
}

/** Simple in-memory rate limiter per IP. */
const rateBuckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.reset) {
    rateBuckets.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
