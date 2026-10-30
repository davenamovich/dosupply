"use client";

import { useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Languages,
  Clapperboard,
  AudioLines,
  CheckCircle2,
  TrendingUp,
  Timer,
} from "lucide-react";
import { ProvenanceBadge } from "./shared";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Count-up on scroll into view (rAF, reduced-motion aware)            */
/* ------------------------------------------------------------------ */

function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Jump straight to the final value — deferred one frame so the effect
      // body stays setState-free (react-hooks/set-state-in-effect).
      const id = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(id);
    }

    let raf = 0;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || started) return;
        started = true;
        const t0 = performance.now();
        const dur = 1400;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(value * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

type EngineStats = {
  creative: number;
  multilang: number;
  video: number;
  audio: number;
  jobsCompleted: number;
  sessionStartedAt: number;
};

const REAL_TILES: {
  key: keyof Omit<EngineStats, "sessionStartedAt">;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "creative", label: "Ad creatives generated", icon: ImageIcon },
  { key: "multilang", label: "Multilang batches", icon: Languages },
  { key: "video", label: "Video demos started", icon: Clapperboard },
  { key: "audio", label: "60s audio takes", icon: AudioLines },
  { key: "jobsCompleted", label: "Engine jobs finished", icon: CheckCircle2 },
];

const DEMO_STATS = [
  {
    value: 312,
    prefix: "+",
    suffix: "%",
    decimals: 0,
    label: "social engagement",
    detail: "90-day projection across LinkedIn, YouTube, Instagram and Facebook",
  },
  {
    value: 4.6,
    prefix: "",
    suffix: "×",
    decimals: 1,
    label: "content output per week",
    detail: "same team size — the engine removes the production bottleneck",
  },
  {
    value: 78,
    prefix: "−",
    suffix: "%",
    decimals: 0,
    label: "cost per produced asset",
    detail: "brief-to-asset in one call, versus agency round-trips",
  },
  {
    value: 23,
    prefix: "",
    suffix: " hrs/wk",
    decimals: 0,
    label: "returned to the team",
    detail: "writing, voicing, rendering and scheduling handled by the studio",
  },
];

export default function GrowthStats() {
  const [stats, setStats] = useState<EngineStats | null>(null);

  /* Poll real session counters — they move as the studio is used. */
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/stats")
        .then((r) => r.json())
        .then((d: EngineStats) => alive && setStats(d))
        .catch(() => {});
    load();
    const iv = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const uptimeHrs = stats
    ? Math.max(0, Math.floor((Date.now() - stats.sessionStartedAt) / 3_600_000))
    : null;
  const sessionActive = !!stats && REAL_TILES.some((t) => stats[t.key] > 0);

  return (
    <section id="growth-stats" className="relative py-20 sm:py-24" aria-label="Growth stats">
      <div className="absolute inset-0 atmosphere-amber pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="kicker">Growth stats</span>
            <ProvenanceBadge kind="demo" />
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            The numbers a studio like this{" "}
            <span className="text-amber-glow">is built to move.</span>
          </h2>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            Two kinds of numbers, honestly separated: the live counters below are
            real — they tick up only when a P&amp;R MCP call actually completes on
            this deployment. The projections are illustrative demonstrations, not
            measurements.
          </p>
        </div>

        {/* Row 1 — REAL session counters */}
        <div className="mx-auto mt-12 max-w-6xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-teal-300">
              <span className="live-dot" />
              Live engine session — real calls through this site
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              {uptimeHrs !== null ? `session up ${uptimeHrs}h` : "counting…"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {REAL_TILES.map((t) => (
              <div
                key={t.key}
                className={cn(
                  "rounded-xl border p-4 text-center transition-colors",
                  stats && stats[t.key] > 0
                    ? "border-teal-400/30 bg-teal-400/5"
                    : "border-white/10 bg-black/30"
                )}
              >
                <t.icon
                  className={cn(
                    "mx-auto h-4 w-4",
                    stats && stats[t.key] > 0 ? "text-teal-300" : "text-zinc-600"
                  )}
                  aria-hidden="true"
                />
                <p className="mt-2 text-2xl font-bold tabular-nums text-white">
                  {stats ? stats[t.key] : "—"}
                </p>
                <p className="mt-1 text-[11px] leading-tight text-zinc-500">{t.label}</p>
              </div>
            ))}
          </div>
          {!sessionActive && (
            <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              zero so far — generate something in the P&amp;R studio above and watch these move
            </p>
          )}
        </div>

        {/* Row 2 — Demonstration projections */}
        <div className="mx-auto mt-14 max-w-6xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber-300">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              Projected growth — demonstration data
            </span>
            <ProvenanceBadge kind="demo" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DEMO_STATS.map((s) => (
              <div
                key={s.label}
                className="panel noise-overlay rounded-2xl p-6"
              >
                <p className="text-4xl font-bold tracking-tight text-amber-300 sm:text-5xl">
                  <CountUp value={s.value} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
                </p>
                <p className="mt-2 text-sm font-semibold text-zinc-200">{s.label}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{s.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            <Timer className="h-3 w-3" aria-hidden="true" />
            projections are illustrative demonstrations — never presented as measured results
          </p>
        </div>
      </div>
    </section>
  );
}
