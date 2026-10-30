"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-300">{children}</p>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">{children}</h2>;
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 rounded-lg border border-amber-400/25 bg-amber-400/5 px-3.5 py-2.5 text-xs leading-relaxed text-amber-100/80">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const MARKET = [
  { label: "2025", value: 21.6, note: "estimated" },
  { label: "2026", value: 23.16, note: "estimate" },
  { label: "2035", value: 43.3, note: "forecast" },
];

type Range = [number, number];
const SCENARIOS: { name: string; tone: string; bar: string; years: Record<"Year 1" | "Year 3" | "Year 5", Range> }[] = [
  { name: "Conservative", tone: "text-zinc-300", bar: "bg-zinc-400/70", years: { "Year 1": [2, 4], "Year 3": [6, 10], "Year 5": [10, 18] } },
  { name: "Base case", tone: "text-teal-300", bar: "bg-teal-400", years: { "Year 1": [4, 7], "Year 3": [15, 25], "Year 5": [30, 45] } },
  { name: "Aggressive", tone: "text-amber-300", bar: "bg-amber-400", years: { "Year 1": [7, 12], "Year 3": [25, 40], "Year 5": [50, 75] } },
];

const PHASES = [
  { days: "Days 1–15", name: "Audit and baseline", items: ["Review site and catalog", "Read Analytics and Search Console", "Pick 50–100 priority SKUs", "Set lead and revenue attribution"] },
  { days: "Days 16–30", name: "Build the foundation", items: ["Product-page structure and SEO templates", "Better quote forms", "Content approval workflow", "Performance dashboard"] },
  { days: "Days 31–60", name: "Launch acquisition", items: ["Publish optimized product pages", "Technical videos", "Social distribution", "Email and reactivation campaigns"] },
  { days: "Days 61–90", name: "Measure and optimize", items: ["Qualified inquiries", "Quote-to-order conversion", "Winning product categories", "Sales and gross profit review"] },
];

const KPIS = [
  ["Qualified quote requests", "Actual buying interest"],
  ["Organic product traffic", "Search acquisition"],
  ["Quote-to-sale conversion", "Sales effectiveness"],
  ["Revenue and gross profit by channel", "Economic return"],
  ["Average order value", "Customer value"],
  ["Repeat purchase rate", "Retention"],
  ["First response time", "Sales execution"],
];

/* ------------------------------------------------------------------ */
/* Slides                                                              */
/* ------------------------------------------------------------------ */

function SlideTitle() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <Eyebrow>DO Supply · Strategic proposal · October 29, 2026</Eyebrow>
        <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-7xl">
          Future <span className="text-amber-glow">Outlook</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-300">
          The AI-assisted growth opportunity: turn DO Supply&apos;s inventory, technical expertise and customer
          relationships into a measurable, always-on customer acquisition engine.
        </p>
        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          Prepared for discussion with DO Supply leadership
        </p>
      </div>
      <div className="relative hidden lg:block">
        <img src="/img/warehouse.png" alt="Warehouse shelving with automation parts" className="aspect-[4/3] w-full rounded-2xl border border-white/10 object-cover" />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-[#0a0b0d]/70 via-transparent to-transparent" />
      </div>
    </div>
  );
}

function SlideMarket() {
  const max = 45;
  return (
    <div>
      <Eyebrow>The market</Eyebrow>
      <Title>A $21.6 billion spares market, nearly doubling by 2035</Title>
      <p className="mt-3 max-w-2xl text-zinc-400">
        Drives, motors, controllers, I/O and motion components, across many sourcing channels. Forecast growth: 7.2% a
        year (Emergen Research, October 2026).
      </p>
      <div className="mt-8 flex items-end gap-6 sm:gap-10">
        {MARKET.map((m) => (
          <div key={m.label} className="flex-1">
            <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">${m.value}B</p>
            <div className="mt-2 flex h-48 items-end rounded-lg border border-white/10 bg-white/[0.03] p-1.5 sm:h-56">
              <div
                className={cn("w-full rounded-md", m.label === "2035" ? "bg-amber-400" : "bg-teal-400")}
                style={{ height: `${(m.value / max) * 100}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-zinc-400">
              {m.label} · {m.note}
            </p>
          </div>
        ))}
      </div>
      <Note>
        This is the broad global market, not DO Supply&apos;s addressable market. The serviceable slice is the set of
        parts, brands, customers and regions it can actually supply. The goal is to be the easy answer when someone
        needs a specific part.
      </Note>
    </div>
  );
}

function SlideSearch() {
  const searches = ["Allen-Bradley 1746-NO4I", "GE Fanuc IC610MDL176", "Mitsubishi MR-J2-200B", "PowerFlex 70 replacement drive", "Discontinued PLC replacement", "Repair obsolete PanelView HMI"];
  const pages: [string, string][] = [
    ["SKU pages", "Exact part-number searches"],
    ["Manufacturer and family pages", "Brand and model demand"],
    ["Obsolete-part guides and comparisons", "Replacement demand"],
    ["Repair pages", "Repair inquiries"],
    ["Technical articles", "Engineers and expertise"],
  ];
  return (
    <div>
      <Eyebrow>The biggest lever</Eyebrow>
      <Title>Be the answer to specific buying searches</Title>
      <div className="mt-7 grid gap-6 md:grid-cols-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">What a buyer types</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {searches.map((s) => (
              <span key={s} className="rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1.5 font-mono text-xs text-teal-200">
                {s}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm leading-relaxed text-zinc-400">
            These sit much closer to a purchase than &quot;what is industrial automation?&quot; DO Supply already has the
            catalog and a large technical blog. The work is connecting them to quotes and sales.
          </p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">What we build</p>
          <ul className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[0.03]">
            {pages.map(([a, b]) => (
              <li key={a} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                <span className="font-medium text-white">{a}</span>
                <span className="text-right text-xs text-zinc-400">{b}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-zinc-500">
            Every key page: exact part number, verified specs, condition, availability, photos, warranty, shipping,
            related parts and a prominent quote option.
          </p>
        </div>
      </div>
    </div>
  );
}

function SlideEngine() {
  const outputs = ["SEO page", "Video", "LinkedIn and social", "Email"];
  return (
    <div>
      <Eyebrow>The engine</Eyebrow>
      <Title>One verified source in, every format out, and every lead captured</Title>
      <div className="mt-8 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1.4fr_auto_1fr_auto_1fr]">
        <Step n="1" title="Verified product data" body="Part number, manufacturer, specs, condition, stock, pricing, warranty." tone="amber" />
        <Arrow />
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-teal-300">2 · AI content engine</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {outputs.map((o) => (
              <span key={o} className="rounded-md border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-zinc-200">
                {o}
              </span>
            ))}
          </div>
        </div>
        <Arrow />
        <Step n="3" title="Technical review" body="A qualified person approves before anything is published." tone="teal" />
        <Arrow />
        <Step n="4" title="Sales Agent" body="Captures the inquiry and alerts the sales team on Telegram." tone="amber" />
      </div>
      <p className="mt-6 text-sm leading-relaxed text-zinc-300">
        Step 4 is built and running as a demo: an AI sales assistant that has the conversation, checks inventory,
        saves the lead with its transcript and notifies sales instantly. Open <span className="font-mono text-amber-300">/sales-agent</span> to try it.
      </p>
      <Note>Guardrail: AI never invents compatibility, specifications, stock or warranty claims.</Note>
    </div>
  );
}

function Step({ n, title, body, tone }: { n: string; title: string; body: string; tone: "amber" | "teal" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className={cn("font-mono text-[10px] uppercase tracking-widest", tone === "amber" ? "text-amber-300" : "text-teal-300")}>
        {n} · {title}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-300">{body}</p>
    </div>
  );
}

function Arrow() {
  return <ArrowRight className="mx-auto hidden h-4 w-4 self-center text-zinc-600 lg:block" aria-hidden="true" />;
}

function SlideRevenue() {
  const years = ["Year 1", "Year 3", "Year 5"] as const;
  return (
    <div>
      <Eyebrow>Five-year outlook</Eyebrow>
      <Title>Incremental annual revenue, as a share of today&apos;s</Title>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {years.map((y) => (
          <div key={y} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">{y}</p>
            <div className="mt-3 space-y-3.5">
              {SCENARIOS.map((s) => {
                const [lo, hi] = s.years[y];
                return (
                  <div key={s.name}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className={s.tone}>{s.name}</span>
                      <span className="font-mono tabular-nums text-white">
                        +{lo}–{hi}%
                      </span>
                    </div>
                    <div className="relative mt-1.5 h-2.5 rounded-full bg-white/10">
                      <div className={cn("absolute h-full rounded-full", s.bar)} style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-zinc-600">Bar scale 0% to 100%</p>
      <div className="mt-4 overflow-hidden rounded-xl border border-white/10 text-sm">
        <table className="w-full">
          <thead className="bg-white/5 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            <tr>
              <th className="px-4 py-2 text-left">On a hypothetical $10M base</th>
              <th className="px-4 py-2 text-right">Year 1</th>
              <th className="px-4 py-2 text-right">Year 5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-zinc-200">
            {[
              ["Conservative", "$200K–$400K", "$1M–$1.8M"],
              ["Base case", "$400K–$700K", "$3M–$4.5M"],
              ["Aggressive", "$700K–$1.2M", "$5M–$7.5M"],
            ].map(([a, b, c]) => (
              <tr key={a}>
                <td className="px-4 py-2">{a}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">{b}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>
        Planning assumptions, not forecasts. DO Supply&apos;s revenue is private, so the $10M base is illustrative and the
        figures are annual uplift at each milestone, not cumulative. Results also depend on inventory, margins,
        pricing, sales capacity and fulfillment.
      </Note>
    </div>
  );
}

function SlidePilot() {
  return (
    <div>
      <Eyebrow>The 90-day pilot</Eyebrow>
      <Title>Start small, measure honestly, scale what works</Title>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {PHASES.map((p, i) => (
          <div key={p.days} className="relative rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <span className="absolute -top-3 left-4 rounded-full border border-amber-400/40 bg-[#0a0b0d] px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-amber-300">
              {i + 1}
            </span>
            <p className="font-mono text-[11px] uppercase tracking-widest text-teal-300">{p.days}</p>
            <p className="mt-1.5 text-base font-semibold text-white">{p.name}</p>
            <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-zinc-400">
              {p.items.map((it) => (
                <li key={it} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideKpis() {
  return (
    <div>
      <Eyebrow>Success and risk</Eyebrow>
      <Title>Judged on profitable sales, not impressions</Title>
      <div className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[0.03]">
          {KPIS.map(([a, b]) => (
            <li key={a} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
              <span className="font-medium text-white">{a}</span>
              <span className="text-right text-xs text-zinc-400">{b}</span>
            </li>
          ))}
        </ul>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">What has to be true</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-300">
            {[
              "Product data is accurate and stock and condition stay current.",
              "Qualified people review technical content.",
              "Sales responds quickly to the extra inquiries.",
              "SEO takes time and is not guaranteed; competitors have established catalogs.",
            ].map((r) => (
              <li key={r} className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-zinc-500">A monthly leadership dashboard shows which products and channels earn money.</p>
        </div>
      </div>
    </div>
  );
}

function SlideClose() {
  const sources = [
    "DO Supply: About, FAQs, Technical blog, Recently added products",
    "Emergen Research: Industrial Automation Spares Market",
    "Radwell International; AX Control (competitor positioning)",
  ];
  return (
    <div>
      <Eyebrow>The proposal</Eyebrow>
      <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
        Let&apos;s build DO Supply&apos;s <span className="text-amber-glow">next growth engine</span>.
      </h2>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-300">
        DO Supply already has the inventory, expertise and customer service. Start with a 90-day pilot, set measurable
        targets, show the results, then scale what works. The aim is more qualified inquiries and more sales, not a
        busier social feed.
      </p>
      <div className="mt-8 border-t border-white/10 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">Sources</p>
        <ul className="mt-1.5 space-y-0.5 text-xs text-zinc-500">
          {sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-zinc-600">
          No DO Supply financials, sales, margins, Search Console or CRM data were available; the scenarios need
          internal validation.
        </p>
      </div>
    </div>
  );
}

const SLIDES: { id: string; node: ReactNode }[] = [
  { id: "title", node: <SlideTitle /> },
  { id: "market", node: <SlideMarket /> },
  { id: "search", node: <SlideSearch /> },
  { id: "engine", node: <SlideEngine /> },
  { id: "revenue", node: <SlideRevenue /> },
  { id: "pilot", node: <SlidePilot /> },
  { id: "kpis", node: <SlideKpis /> },
  { id: "close", node: <SlideClose /> },
];

/* ------------------------------------------------------------------ */
/* Deck                                                                */
/* ------------------------------------------------------------------ */

export default function Deck() {
  const [i, setI] = useState(0);
  const last = SLIDES.length - 1;
  const go = useCallback((n: number) => setI(Math.max(0, Math.min(last, n))), [last]);

  // Deep link: #3 opens slide 3.
  useEffect(() => {
    const n = parseInt(window.location.hash.slice(1), 10);
    if (n >= 1 && n <= SLIDES.length) queueMicrotask(() => setI(n - 1));
  }, []);
  useEffect(() => {
    history.replaceState(null, "", `#${i + 1}`);
  }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(i + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(i - 1);
      } else if (e.key === "Home") go(0);
      else if (e.key === "End") go(last);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, i, last]);

  return (
    <div className="industrial relative flex h-dvh flex-col overflow-hidden print:h-auto print:overflow-visible">
      <style>{`@media print { @page { size: 13.333in 7.5in; margin: 0 } html, body { background: #0a0b0d !important; -webkit-print-color-adjust: exact; print-color-adjust: exact } .slide { height: 7.5in; break-after: page } }`}</style>
      <div className="pointer-events-none absolute inset-0 industrial-grid-bg opacity-60 print:hidden" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-amber-400/5 blur-3xl print:hidden" aria-hidden="true" />

      <header className="relative z-10 flex items-center justify-between px-6 py-4 print:hidden">
        <a href="/" className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400 hover:text-white">
          DO Supply <span className="text-amber-300">×</span> P&amp;R
        </a>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-400 transition hover:border-amber-400/50 hover:text-amber-300"
        >
          <Printer className="h-3 w-3" aria-hidden="true" /> Save as PDF
        </button>
      </header>

      <main className="scroll-slim relative z-10 flex-1 overflow-y-auto print:overflow-visible" onClick={(e) => (e.target === e.currentTarget ? go(i + 1) : undefined)}>
        {SLIDES.map((s, n) => (
          <section
            key={s.id}
            aria-label={`Slide ${n + 1} of ${SLIDES.length}`}
            className={cn(
              "slide mx-auto w-full max-w-6xl flex-col justify-center px-6 py-6 sm:px-12 min-h-full",
              n === i ? "flex animate-in fade-in slide-in-from-bottom-2 duration-500" : "hidden print:flex"
            )}
          >
            {s.node}
          </section>
        ))}
      </main>

      <footer className="relative z-10 flex items-center justify-between gap-4 px-6 py-4 print:hidden">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Slides">
          {SLIDES.map((s, n) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={n === i}
              aria-label={`Go to slide ${n + 1}`}
              onClick={() => go(n)}
              className={cn("h-1.5 rounded-full transition-all", n === i ? "w-7 bg-amber-400" : "w-3 bg-white/15 hover:bg-white/30")}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tabular-nums text-zinc-500">
            {i + 1} / {SLIDES.length}
          </span>
          <button
            onClick={() => go(i - 1)}
            disabled={i === 0}
            aria-label="Previous slide"
            className="rounded-lg border border-white/10 p-2 text-zinc-300 transition hover:border-amber-400/50 disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => go(i + 1)}
            disabled={i === last}
            aria-label="Next slide"
            className="rounded-lg bg-teal-400 p-2 text-black transition hover:bg-teal-300 disabled:opacity-30"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
