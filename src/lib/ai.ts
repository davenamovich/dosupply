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

/* ------------------------------------------------------------------ */
/* LLM provider                                                        */
/*                                                                     */
/* Any OpenAI-compatible /chat/completions endpoint, configured with   */
/* LLM_BASE_URL, LLM_API_KEY and LLM_MODEL. No config file, so the     */
/* same code runs in local dev, Docker and Railway.                    */
/* ------------------------------------------------------------------ */

type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

type LlmConfig = { endpoint: string; apiKey: string; model: string };

const REQUEST_TIMEOUT_MS = 90_000;

function llmConfig(): LlmConfig {
  const baseUrl = (process.env.LLM_BASE_URL || "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.LLM_API_KEY || "").trim();
  const model = (process.env.LLM_MODEL || "").trim();

  const missing = [
    baseUrl ? null : "LLM_BASE_URL",
    apiKey ? null : "LLM_API_KEY",
    model ? null : "LLM_MODEL",
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    throw new Error(
      `LLM provider is not configured (missing ${missing.join(", ")}). ` +
        "Set LLM_BASE_URL to an OpenAI-compatible base URL (for example " +
        "https://api.deepseek.com/v1), plus LLM_API_KEY and LLM_MODEL."
    );
  }

  return {
    endpoint: baseUrl.endsWith("/chat/completions")
      ? baseUrl
      : `${baseUrl}/chat/completions`,
    apiKey,
    model,
  };
}

/** Run a chat completion and return the text content. Throws on empty. */
export async function chat(
  system: string,
  user: string,
  maxTokensHint = "be thorough but efficient"
): Promise<string> {
  const { endpoint, apiKey, model } = llmConfig();

  const messages: LlmMessage[] = [
    { role: "system", content: `${system}\n\n${maxTokensHint}` },
    { role: "user", content: user },
  ];

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).trim().slice(0, 300);
    throw new Error(
      `LLM request failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`
    );
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content.trim() : "";
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

/**
 * Best guess at the real client address behind Railway's proxy. A client can
 * put anything at the front of X-Forwarded-For, so prefer the proxy's own
 * X-Real-IP and otherwise take the last hop, which the proxy appended.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = (req.headers.get("x-forwarded-for") || "").split(",").map((h) => h.trim()).filter(Boolean);
  return hops.length ? hops[hops.length - 1] : "local";
}

/** Fixed-window, in-memory limiter. One bucket per key, so scope keys per route. */
const rateBuckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  if (rateBuckets.size > 5000) {
    for (const [k, b] of rateBuckets) if (now > b.reset) rateBuckets.delete(k);
  }
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.reset) {
    rateBuckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/**
 * A cap shared by every visitor, so many addresses together cannot run up the
 * cost of a paid tool or flood the sales team. Defaults to per hour.
 */
export function globalLimit(scope: string, limit: number, windowMs = 3_600_000): boolean {
  return rateLimit(`global:${scope}`, limit, windowMs);
}

export const BUSY_RESPONSE = {
  error: "The demo has reached its hourly limit for this tool. Please try again in a little while.",
  code: "rate",
} as const;

/* Passcode guessing: only wrong guesses count, and too many lock the address out for a while. */
const failedGuesses = new Map<string, { count: number; reset: number }>();
const GUESS_LIMIT = 10;
const GUESS_WINDOW_MS = 10 * 60_000;

export function guessesBlocked(ip: string): boolean {
  const b = failedGuesses.get(ip);
  return Boolean(b && Date.now() <= b.reset && b.count >= GUESS_LIMIT);
}

export function recordFailedGuess(ip: string): void {
  const now = Date.now();
  const b = failedGuesses.get(ip);
  if (!b || now > b.reset) failedGuesses.set(ip, { count: 1, reset: now + GUESS_WINDOW_MS });
  else b.count += 1;
}
