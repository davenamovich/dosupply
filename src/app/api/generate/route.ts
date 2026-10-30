import { NextRequest, NextResponse } from "next/server";
import {
  DO_SUPPLY_CONTEXT,
  JSON_ONLY_INSTRUCTION,
  chat,
  parseJsonLoose,
  rateLimit,
} from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/* ------------------------------------------------------------------ */
/* Output types                                                        */
/* ------------------------------------------------------------------ */

export type PlatformOutput = {
  headline: string;
  caption: string;
  hashtags: string[];
  cta: string;
  imageConcept: string;
  videoScript: string;
};

export type VideoScriptOutput = {
  title: string;
  logline: string;
  scenes: { time: string; vo: string; visual: string }[];
  narration: string;
};

export type EmailOutput = {
  subjects: string[];
  previewText: string;
  greeting: string;
  paragraphs: string[];
  bullets: string[];
  closing: string;
  cta: string;
};

export type SeoOutput = {
  seoTitle: string;
  metaDescription: string;
  productDescription: string;
  articleOutline: string[];
  faqs: { q: string; a: string }[];
  internalLinks: { anchor: string; target: string }[];
  altTexts: string[];
  keywords: string[];
};

export type ReputationOutput = {
  response: string;
  themes: { theme: string; share: number }[];
  insights: string[];
  contentIdeas: string[];
};

export type MultiplierOutput = {
  linkedin: string;
  facebook: string;
  instagram: string;
  videoScript: string;
  youtubeDescription: string;
  email: string;
  seoDescription: string;
  faq: { q: string; a: string };
  narration: string;
  carousel: string[];
};

const BRAND_RULES = `
Integrity rules:
- Never invent technical specifications, part numbers, prices, certifications, compatibility or stock availability.
- If a spec-like detail is needed, write around it generically (e.g. "tested before it ships", "right series for your line").
- Keep DO Supply's voice: expert, fast, plain-spoken, technically fluent, zero hype.
`;

/* ------------------------------------------------------------------ */
/* POST /api/generate — mode-switched LLM content engine               */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  if (!rateLimit(ip, 40, 60_000)) {
    return NextResponse.json(
      { error: "Rate limit reached. Give the engine a breath and try again." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = String(body.mode || "");
  const input = String(body.input || "").slice(0, 400);
  const platform = String(body.platform || "");
  const theme = String(body.theme || "");
  const campaign = String(body.campaign || "");
  const format = String(body.format || "");
  // Optional Exa/web-research grounding (server-side fetch of real snippets).
  const facts = String(body.facts || "").slice(0, 4000);
  const review = body.review as { rating?: number; title?: string; text?: string; source?: string; author?: string } | undefined;

  if (!input.trim() && mode !== "reputation") {
    return NextResponse.json({ error: "Input is required." }, { status: 400 });
  }

  try {
    let data: unknown;
    switch (mode) {
      case "social":
        data = await genSocial(input, platform, theme);
        break;
      case "video":
        data = await genVideo(input, format);
        break;
      case "email":
        data = await genEmail(input, campaign);
        break;
      case "seo":
        data = await genSeo(input, facts);
        break;
      case "reputation":
        data = await genReputation(review);
        break;
      case "multiplier":
      case "package":
        data = await genMultiplier(input);
        break;
      default:
        return NextResponse.json({ error: `Unknown mode "${mode}".` }, { status: 400 });
    }
    return NextResponse.json({ mode, data, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[generate] mode failed:", mode, err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Generation failed: ${err.message}`
            : "Generation failed. Try again.",
      },
      { status: 502 }
    );
  }
}

/* ------------------------------------------------------------------ */
/* Mode implementations                                                */
/* ------------------------------------------------------------------ */

async function genSocial(
  input: string,
  platform: string,
  theme: string
): Promise<PlatformOutput> {
  const platformSpecs: Record<string, string> = {
    linkedin:
      "LinkedIn: professional tone for plant managers, controls engineers, procurement. 2-3 short paragraphs, insight-first, line breaks for readability. Hashtag limit: 4.",
    facebook:
      "Facebook: warmer, community tone. Short paragraphs, relatable hook, one emoji max. Hashtag limit: 3.",
    instagram:
      "Instagram: visual-first caption under 400 chars, line breaks, 1-2 emojis allowed, hashtags at the end (up to 8).",
    x:
      "X: maximum 240 characters total for the caption, punchy, no hashtags inside the caption body (hashtags listed separately, max 2).",
    youtube:
      "YouTube: video title (max 70 chars) + description with hook, what viewers learn (2-3 bullets), and subscribe line. Hashtags: 3.",
  };

  const spec = platformSpecs[platform] || platformSpecs.linkedin;

  const sys = `You are the AI content engine for DO Supply (industrial automation replacement parts, "need-it-now" positioning).
${DO_SUPPLY_CONTEXT}
${BRAND_RULES}
Theme: "${theme || "Product spotlight"}".
Platform format: ${spec}
Output JSON shape:
{"headline": string (internal hook/title, max 80 chars), "caption": string (the actual post text, formatted for the platform with \\n line breaks), "hashtags": string[] (WITHOUT # symbol, e.g. "IndustrialAutomation"), "cta": string (one sentence call to action), "imageConcept": string (one vivid image/visual concept for this post, 1-2 sentences), "videoScript": string (a 15-30s companion short video script: 3-5 lines with visual + line)}
${JSON_ONLY_INSTRUCTION}`;

  const text = await chat(sys, `Product/topic: ${input}`);
  const parsed = parseJsonLoose<PlatformOutput>(text);
  return {
    headline: parsed.headline || "",
    caption: parsed.caption || "",
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 8) : [],
    cta: parsed.cta || "",
    imageConcept: parsed.imageConcept || "",
    videoScript: parsed.videoScript || "",
  };
}

async function genVideo(input: string, format: string): Promise<VideoScriptOutput> {
  const formatSpecs: Record<string, string> = {
    spotlight30: "30-second product spotlight. 4 scenes. Conversion-focused.",
    edu60: "60-second educational video teaching one automation concept. 5 scenes.",
    faq: "45-second customer FAQ video answering ONE common question. 4 scenes.",
    explainer:
      "6-minute YouTube explainer. Write 6 chapter scenes (chapter titles in visual field). Deep but accessible.",
    vertical:
      "30-second vertical (9:16) short. Hook must land in the first 2 seconds. 4 scenes.",
    narration:
      "60-second audio narration script (podcast-style VO, no visuals needed — keep visual field as ambient direction). 4 beats.",
  };
  const spec = formatSpecs[format] || formatSpecs.spotlight30;

  const sys = `You are a video producer and scriptwriter for DO Supply (industrial automation replacement parts).
${DO_SUPPLY_CONTEXT}
${BRAND_RULES}
Format: ${spec}
Cinematic production style: every scene needs (a) a voiceover line that sounds like a knowledgeable human, (b) a visual direction referencing generic industrial b-roll (control cabinets, HMI closeups, drive panels, repair bench, warehouse) — never reference fake on-screen specs.
Output JSON shape:
{"title": string (max 70 chars), "logline": string (one sentence), "scenes": [{"time": string like "0:00-0:08", "vo": string (the voiceover line), "visual": string (b-roll/on-screen direction)}], "narration": string (the full voiceover read as one continuous paragraph)}
${JSON_ONLY_INSTRUCTION}`;

  const text = await chat(sys, `Product/topic: ${input}`);
  const parsed = parseJsonLoose<VideoScriptOutput>(text);
  return {
    title: parsed.title || input,
    logline: parsed.logline || "",
    scenes: Array.isArray(parsed.scenes) ? parsed.scenes.slice(0, 8) : [],
    narration: parsed.narration || "",
  };
}

async function genEmail(input: string, campaign: string): Promise<EmailOutput> {
  const campaignSpecs: Record<string, string> = {
    announcement:
      "Product announcement: introduce a platform/series being highlighted. Educate first, sell second.",
    reengagement:
      "Customer re-engagement: warm, respectful win-back for buyers inactive 90+ days. Lead with value, not guilt.",
    maintenance:
      "Industrial maintenance education: teach one practical maintenance concept, then connect naturally to how DO Supply helps.",
    inventory:
      "New inventory announcement: urgent, need-it-now tone for hard-to-find components. Never claim specific stock levels — write 'restocked', 'in rotation' etc. without quantities.",
    series:
      "Product education series: this is one email in a nurture series. Reference 'part of an ongoing series' and tease the next topic.",
  };
  const spec = campaignSpecs[campaign] || campaignSpecs.announcement;

  const sys = `You are an email marketing specialist for DO Supply (industrial automation replacement parts).
${DO_SUPPLY_CONTEXT}
${BRAND_RULES}
Campaign type: ${spec}
Output JSON shape:
{"subjects": [string, string, string] (3 subject line options, max 55 chars each, varied angles), "previewText": string (max 90 chars), "greeting": string (1 line), "paragraphs": [string, string] (2-3 short paragraphs as separate strings), "bullets": [string] (0-3 scannable benefit bullets), "closing": string (1-2 lines sign-off before CTA, written generically not "Best, Dave"), "cta": string (button label, max 28 chars, no URL)}
${JSON_ONLY_INSTRUCTION}`;

  const text = await chat(sys, `Product/topic: ${input}`);
  const parsed = parseJsonLoose<EmailOutput>(text);
  return {
    subjects: Array.isArray(parsed.subjects) ? parsed.subjects.slice(0, 3) : [],
    previewText: parsed.previewText || "",
    greeting: parsed.greeting || "Hi there,",
    paragraphs: Array.isArray(parsed.paragraphs) ? parsed.paragraphs.slice(0, 3) : [],
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 3) : [],
    closing: parsed.closing || "Talk soon,",
    cta: parsed.cta || "Browse the Catalog",
  };
}

async function genSeo(input: string, facts = ""): Promise<SeoOutput> {
  const sys = `You are an industrial SEO specialist for DO Supply (industrial automation replacement parts, dosupply.com).
${DO_SUPPLY_CONTEXT}
${BRAND_RULES}
Write for maintenance engineers searching Google. Ground everything in the product's PLATFORM/SERIES level — never invent specific part numbers, firmware versions, or specs.
Output JSON shape:
{"seoTitle": string (max 60 chars), "metaDescription": string (max 155 chars), "productDescription": string (2 paragraphs, platform-level, honest), "articleOutline": [string] (6-8 H2-style section titles for an educational article), "faqs": [{"q": string, "a": string}] (4 FAQs an engineer would actually search, answers 1-3 sentences), "internalLinks": [{"anchor": string, "target": string}] (3 suggested internal links where target is a generic path like "/category/plc" — descriptive, not fake URLs), "altTexts": [string] (3 image alt texts), "keywords": [string] (6-8 search keywords)}
${JSON_ONLY_INSTRUCTION}`;

  const userMsg = facts.trim()
    ? `Product or URL: ${input}\n\nVERIFIED WEB RESEARCH (use these facts, do not contradict them; ignore anything off-topic):\n${facts}`
    : `Product or URL: ${input}`;
  const text = await chat(sys, userMsg);
  const parsed = parseJsonLoose<SeoOutput>(text);
  return {
    seoTitle: parsed.seoTitle || "",
    metaDescription: parsed.metaDescription || "",
    productDescription: parsed.productDescription || "",
    articleOutline: Array.isArray(parsed.articleOutline) ? parsed.articleOutline : [],
    faqs: Array.isArray(parsed.faqs) ? parsed.faqs.slice(0, 5) : [],
    internalLinks: Array.isArray(parsed.internalLinks) ? parsed.internalLinks.slice(0, 4) : [],
    altTexts: Array.isArray(parsed.altTexts) ? parsed.altTexts.slice(0, 3) : [],
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 8) : [],
  };
}

async function genReputation(review?: {
  rating?: number;
  title?: string;
  text?: string;
  source?: string;
  author?: string;
}): Promise<ReputationOutput> {
  const rv = review || {};
  const sys = `You are a customer experience specialist drafting responses for DO Supply (industrial automation replacement parts).
${DO_SUPPLY_CONTEXT}
This is a DEMONSTRATION review (fictional). Rules:
- Respond as the DO Supply team: grateful, professional, human. Address specifics from the review.
- 4-5 stars: warm thanks + reinforce what they valued. 1-3 stars: acknowledge the specific friction, no excuses, describe the concrete internal fix, invite offline follow-up WITHOUT inventing contact details (say "our team will reach out through the platform").
- Never admit to fake incidents, never promise refunds/timelines, never invent policies.
Then also analyze the review for recurring-theme opportunities.
Output JSON shape:
{"response": string (the ready-to-post reply, 60-120 words), "themes": [{"theme": string, "share": number}] (3 themes extracted from ALL sample feedback with plausible percentage shares that sum to 100), "insights": [string] (3 short CX insights), "contentIdeas": [string] (3 content ideas turning recurring questions into educational content)}
${JSON_ONLY_INSTRUCTION}`;

  const user = `Review source: ${rv.source || "Google"} · Rating: ${rv.rating || "?"}/5
Title: ${rv.title || ""}
Text: ${rv.text || ""}
Reviewer role: ${rv.author || "unknown"}`;

  const text = await chat(sys, user);
  const parsed = parseJsonLoose<ReputationOutput>(text);
  return {
    response: parsed.response || "",
    themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 5) : [],
    insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 4) : [],
    contentIdeas: Array.isArray(parsed.contentIdeas) ? parsed.contentIdeas.slice(0, 4) : [],
  };
}

async function genMultiplier(input: string): Promise<MultiplierOutput> {
  const sys = `You are the Content Multiplier: one industrial product input becomes a full 10-format marketing package for DO Supply.
${DO_SUPPLY_CONTEXT}
${BRAND_RULES}
Output JSON shape (ALL keys required, all strings finished content):
{
 "linkedin": string (professional post, 3 short paragraphs, line breaks via \\n),
 "facebook": string (warmer community post, short),
 "instagram": string (visual caption under 350 chars with emoji),
 "videoScript": string (30s vertical video script: HOOK / BODY / CTA lines separated by \\n),
 "youtubeDescription": string (video title line + description + 3 hashtags),
 "email": string (subject: ... | preview: ... | then body in 2 short paragraphs),
 "seoDescription": string (SEO product description, 2 sentences max 60 words total),
 "faq": {"q": string, "a": string},
 "narration": string (60s audio narration, conversational VO),
 "carousel": [string, string, string, string, string] (exactly 5 slide texts: slide 1 = hook, slides 2-4 = value points, slide 5 = CTA; each max 90 chars)
}
${JSON_ONLY_INSTRUCTION}`;

  const text = await chat(sys, `One product input: ${input}`);
  const parsed = parseJsonLoose<MultiplierOutput>(text);
  return {
    linkedin: parsed.linkedin || "",
    facebook: parsed.facebook || "",
    instagram: parsed.instagram || "",
    videoScript: parsed.videoScript || "",
    youtubeDescription: parsed.youtubeDescription || "",
    email: parsed.email || "",
    seoDescription: parsed.seoDescription || "",
    faq: parsed.faq || { q: "", a: "" },
    narration: parsed.narration || "",
    carousel: Array.isArray(parsed.carousel) ? parsed.carousel.slice(0, 5) : [],
  };
}
