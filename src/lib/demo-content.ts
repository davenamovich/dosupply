/**
 * Demonstration datasets for the DO Supply × Plunder & Riffle engine demo.
 *
 * IMPORTANT INTEGRITY RULE (enforced across the UI):
 * Anything sourced from this file is labeled "DEMONSTRATION" in the UI.
 * Real P&R MCP results are labeled "GENERATED VIA P&R MCP".
 * LLM-drafted content is labeled "AI-DRAFTED".
 * Sample reviews, testimonials and stats here are fictional and clearly marked.
 */

export const TICKER_LINES = [
  "Composing LinkedIn post — Allen-Bradley PowerFlex 525 spotlight",
  "Storyboarding 30s video — PanelView HMI troubleshooting FAQ",
  "Drafting re-engagement email — dormant accounts, Q4 campaign",
  "Optimizing SEO metadata — CompactLogix category page",
  "Drafting review response — Google Business Profile",
  "Generating ad creative — SLC 500 migration education",
  "Clipping YouTube explainer — ControlLogix + PowerFlex integration",
  "Scheduling carousel — Behind-the-scenes: repair bench",
  "Building FAQ schema — DC motor efficiency article",
  "A/B testing subject lines — inventory alert campaign",
];

export type PhonePost = {
  id: string;
  platform: "linkedin" | "facebook" | "instagram" | "x" | "youtube";
  tag: string;
  title: string;
  body: string;
  metrics: { likes: string; comments: string; shares?: string };
};

/** SIMULATED feed content shown on the hero phone (labeled as simulated). */
export const PHONE_FEED: PhonePost[] = [
  {
    id: "p1",
    platform: "linkedin",
    tag: "Product Spotlight",
    title: "PowerFlex 525: The drive your maintenance team keeps asking about",
    body: "When a VFD fails, every minute of line-down time costs money. DO Supply tests and ships replacement Allen-Bradley PowerFlex drives fast — with expert support on the other end of the phone.",
    metrics: { likes: "412", comments: "37", shares: "18" },
  },
  {
    id: "p2",
    platform: "youtube",
    tag: "Education",
    title: "Watch: What Nobody Tells You About Migrating SLC 500 Systems",
    body: "6:42 · Legacy migration pitfalls, from firmware gaps to spare-part strategy. New on the DO Supply channel.",
    metrics: { likes: "1.2K", comments: "64" },
  },
  {
    id: "p3",
    platform: "instagram",
    tag: "Behind the Scenes",
    title: "The repair bench today 🔧",
    body: "Servo motors calibrated, PanelView terminals tested, boards cleaned and queued for QC. Where downtime comes to die.",
    metrics: { likes: "876", comments: "23" },
  },
  {
    id: "p4",
    platform: "x",
    tag: "Industry Insight",
    title: "Hot take: your spare parts strategy is a marketing channel.",
    body: "Every fast, right-first-time replacement builds a customer story. Speed IS content.",
    metrics: { likes: "203", comments: "12", shares: "41" },
  },
  {
    id: "p5",
    platform: "facebook",
    tag: "Customer FAQ",
    title: "\"Do you test parts before shipping?\" — the most-asked question",
    body: "Yes. Every unit passes bench testing before it ships. Here's what our QC process looks like, step by step.",
    metrics: { likes: "158", comments: "29" },
  },
  {
    id: "p6",
    platform: "linkedin",
    tag: "Company News",
    title: "New inventory alert: PanelView Plus terminals restocked",
    body: "HMI terminals back in rotation for need-it-now delivery. When your operator interface dies mid-shift, we've got you.",
    metrics: { likes: "301", comments: "19", shares: "9" },
  },
];

export const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", handle: "DO Supply", color: "#0A66C2" },
  { id: "facebook", label: "Facebook", handle: "DO Supply", color: "#1877F2" },
  { id: "instagram", label: "Instagram", handle: "@dosupply", color: "#E4405F" },
  { id: "x", label: "X", handle: "@dosupply", color: "#E7E9EA" },
  { id: "youtube", label: "YouTube", handle: "DO Supply", color: "#FF0000" },
] as const;

export const SOCIAL_THEMES = [
  "Product spotlight",
  "Industrial automation education",
  "Customer FAQ",
  "Company news",
  "Industry insights",
  "Behind-the-scenes",
  "Product comparison",
] as const;

export const VIDEO_FORMATS = [
  {
    id: "spotlight30",
    title: "30-Second Product Spotlight",
    desc: "Punchy, conversion-focused product intro for paid + organic.",
    duration: "0:30",
    aspect: "16:9",
  },
  {
    id: "edu60",
    title: "60-Second Educational",
    desc: "Teach one automation concept fast — builds authority.",
    duration: "1:00",
    aspect: "16:9",
  },
  {
    id: "faq",
    title: "Customer FAQ Video",
    desc: "Answer the most-asked support question on camera.",
    duration: "0:45",
    aspect: "16:9",
  },
  {
    id: "explainer",
    title: "YouTube Explainer",
    desc: "Longer-form chaptered explainer for search traffic.",
    duration: "6:00",
    aspect: "16:9",
  },
  {
    id: "vertical",
    title: "Short-Form Vertical",
    desc: "9:16 cut for Shorts / Reels — hook in the first 2 seconds.",
    duration: "0:30",
    aspect: "9:16",
  },
  {
    id: "narration",
    title: "Audio Narration Script",
    desc: "Clean VO script ready for recording or AI narration.",
    duration: "0:60",
    aspect: "audio",
  },
] as const;

export const EMAIL_CAMPAIGNS = [
  {
    id: "announcement",
    title: "Product Announcement",
    desc: "Introduce a restocked or newly available platform.",
  },
  {
    id: "reengagement",
    title: "Customer Re-Engagement",
    desc: "Win back buyers who haven't ordered in 90+ days.",
  },
  {
    id: "maintenance",
    title: "Industrial Maintenance Education",
    desc: "Teach, then softly connect to your product catalog.",
  },
  {
    id: "inventory",
    title: "New Inventory Announcement",
    desc: "Need-it-now alerts for hard-to-find components.",
  },
  {
    id: "series",
    title: "Product Education Series",
    desc: "Multi-touch nurture sequence that builds expertise.",
  },
] as const;

/** Sample reviews — FICTIONAL, labeled as demonstrations in the UI. */
export const SAMPLE_REVIEWS = [
  {
    id: "r1",
    source: "Google" as const,
    rating: 5,
    author: "Maintenance Supervisor · Food & Beverage Plant",
    title: "Fastest turnaround I've seen",
    text: "Our PanelView died mid-shift and the line was down. DO Supply had a tested replacement shipped the same day. Their rep walked me through the swap on the phone. Unreal service.",
    sentiment: "positive",
    themes: ["speed", "expert support"],
  },
  {
    id: "r2",
    source: "Review.io" as const,
    rating: 3,
    author: "Controls Engineer · Automotive Tier 2",
    title: "Good parts, shipping update was slow",
    text: "The PowerFlex drive arrived tested and working as described. I just wish I'd gotten tracking updates while I was waiting — I had to call twice to check the status.",
    sentiment: "mixed",
    themes: ["product quality", "communication gap"],
  },
  {
    id: "r3",
    source: "Google" as const,
    rating: 4,
    author: "Plant Manager · Packaging",
    title: "Solid experience, minor follow-up delay",
    text: "Ordered a ControlLogix processor. Part was exactly as described. Follow-up question about warranty took a couple days to get answered, but the answer was thorough when it came.",
    sentiment: "positive",
    themes: ["product quality", "documentation"],
  },
  {
    id: "r4",
    source: "Review.io" as const,
    rating: 5,
    author: "Maintenance Tech · Water Treatment",
    title: "They actually know the parts",
    text: "I called not sure which drive fit our setup. Instead of guessing, they asked the right questions and pointed me to the right series. You can't Google that kind of help.",
    sentiment: "positive",
    themes: ["expert support", "speed"],
  },
  {
    id: "r5",
    source: "Google" as const,
    rating: 2,
    author: "Procurement Lead · OEM",
    title: "Needed more lead-time transparency",
    text: "Pricing and part condition were fine. But I placed a rush order assuming next-day and it wasn't clearly communicated that it wasn't in stock until after I paid.",
    sentiment: "negative",
    themes: ["availability clarity", "communication gap"],
  },
];

export const VERIFIED_PRODUCT_EXAMPLES = [
  "Allen-Bradley ControlLogix",
  "Allen-Bradley CompactLogix",
  "Allen-Bradley PowerFlex drives",
  "Allen-Bradley PanelView terminals",
  "Allen-Bradley SLC 500 (legacy)",
  "Eaton PanelMate",
];

export const ROADMAP_WEEKS = [
  {
    week: 1,
    title: "Foundation & Learning",
    goal: "Absorb the product world and set up the engine.",
    items: [
      "Learn the products, customers and existing brand voice",
      "Audit existing digital channels",
      "Establish content pillars",
      "Build initial content templates",
    ],
  },
  {
    week: 2,
    title: "Content Production Launch",
    goal: "Start shipping real content on real channels.",
    items: [
      "Launch initial social content production",
      "Produce product spotlight videos",
      "Develop educational content",
      "Establish a content calendar",
    ],
  },
  {
    week: 3,
    title: "Systems & Optimization",
    goal: "Turn one-off posts into repeatable workflows.",
    items: [
      "Develop email campaigns",
      "Improve product descriptions and SEO",
      "Build FAQ and customer education workflows",
      "Establish performance tracking",
    ],
  },
  {
    week: 4,
    title: "Analysis & Expansion",
    goal: "Prove impact and scale what works.",
    items: [
      "Analyze engagement",
      "Refine content formats",
      "Expand video production",
      "Present an AI and data monetization opportunity assessment",
    ],
  },
];

export const DATA_MONETIZATION_OPPORTUNITIES = [
  {
    title: "Structured Industrial Product Datasets",
    desc: "Clean, normalized product reference data — categories, series, documentation links — organized for legitimate licensing.",
    icon: "database",
  },
  {
    title: "Technical Documentation & Reference Libraries",
    desc: "Curated manuals, guides and reference material, appropriately licensed and permissioned.",
    icon: "book",
  },
  {
    title: "Licensed Industrial Knowledge Collections",
    desc: "Themed knowledge products: drive selection, HMI troubleshooting, legacy migration playbooks.",
    icon: "layers",
  },
  {
    title: "AI-Ready Technical Information",
    desc: "Structured, machine-readable technical content prepared for authorized AI training and retrieval products.",
    icon: "cpu",
  },
  {
    title: "Specialized Industry Knowledge Products",
    desc: "Original educational content and tooling built on DO Supply's real domain expertise.",
    icon: "graduation",
  },
  {
    title: "Partnerships with Legitimate AI Data Buyers",
    desc: "Vetted, consent-based data licensing relationships with proper contracts and safeguards.",
    icon: "handshake",
  },
];
