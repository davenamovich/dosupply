"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ChevronDown, Play } from "lucide-react";
import { TICKER_LINES, PHONE_FEED } from "@/lib/demo-content";
import { ProvenanceBadge } from "./shared";

function useCounter(target: number, run: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!run || started.current) return;
    started.current = true;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, duration]);
  return value;
}

function PlatformIcon({ id, className }: { id: string; className?: string }) {
  const common = { className, "aria-hidden": true };
  if (id === "linkedin")
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" {...common}>
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45z" />
      </svg>
    );
  if (id === "facebook")
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" {...common}>
        <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z" />
      </svg>
    );
  if (id === "instagram")
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" {...common}>
        <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95C23.73 2.7 21.31.27 16.95.07 15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.15A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.41-11.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z" />
      </svg>
    );
  if (id === "x")
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" {...common}>
        <path d="M18.24 2.25h3.31l-7.23 8.26L22.83 21.75h-6.66l-5.22-6.82-5.97 6.82H1.66l7.73-8.84L1.25 2.25h6.83l4.72 6.24zm-1.16 17.52h1.83L7.08 4.13H5.12z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...common}>
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12z" />
    </svg>
  );
}

type FeedPost = {
  id: string;
  platform: string;
  tag: string;
  title: string;
  body: string;
  metrics: Record<string, string>;
};

export function PhoneMock({ posts }: { posts: FeedPost[] }) {
  const doubled = [...posts, ...posts];
  return (
    <div className="relative mx-auto" aria-label="Simulated DO Supply social feed preview">
      {/* ambient glow */}
      <div className="absolute -inset-16 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
      <div className="phone-bevel">
        <div className="phone-screen">
          <div className="phone-notch" />
          <div className="phone-gloss" />
          {/* status bar */}
          <div className="relative z-20 flex items-center justify-between px-6 pt-3.5 font-mono text-[9px] text-zinc-400">
            <span>9:41</span>
            <span className="tracking-widest">DO SUPPLY ENGINE</span>
            <span className="flex items-center gap-1">
              <span className="h-1 w-3 rounded-sm border border-zinc-500" />
            </span>
          </div>
          {/* feed */}
          <div className="feed-mask absolute inset-0 pt-10">
            <div className="feed-scroll px-3.5 space-y-3">
              {doubled.map((p, i) => (
                <article
                  key={`${p.id}-${i}`}
                  className="panel rounded-2xl p-3.5 text-left"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-zinc-200">
                        <PlatformIcon id={p.platform} className="h-3 w-3" />
                      </span>
                      <span className="truncate font-mono text-[9px] tracking-[0.16em] text-amber-300/90 uppercase">
                        {p.tag}
                      </span>
                    </div>
                    <ProvenanceBadge kind="simulated" />
                  </div>
                  <h4 className="text-[12.5px] font-semibold leading-snug text-zinc-100">
                    {p.title}
                  </h4>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400 line-clamp-4">
                    {p.body}
                  </p>
                  <div className="mt-2.5 flex items-center gap-4 font-mono text-[9px] text-zinc-500">
                    <span>♥ {p.metrics.likes}</span>
                    <span>💬 {p.metrics.comments}</span>
                    {p.metrics.shares && <span>↗ {p.metrics.shares}</span>}
                  </div>
                </article>
              ))}
            </div>
          </div>
          {/* bottom engine bar */}
          <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/70 px-4 py-2.5 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="font-mono text-[9px] tracking-widest text-zinc-300 uppercase">
                Content Engine Active
              </span>
              <span className="ml-auto font-mono text-[9px] text-amber-300">
                +1 post / 12s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const [inView, setInView] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setInView(true),
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setLineIdx((i) => (i + 1) % TICKER_LINES.length), 2600);
    return () => clearInterval(t);
  }, []);

  const formats = useCounter(10, inView);
  const platforms = useCounter(5, inView);
  const weeks = useCounter(30, inView);

  return (
    <section ref={ref} className="relative overflow-hidden industrial-grid-bg">
      <div className="absolute inset-0 atmosphere-amber pointer-events-none" />
      <div className="absolute inset-0 atmosphere-teal pointer-events-none" />
      {/* large product photography backdrop (AI-generated concept) */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] select-none lg:block">
        <Image
          src="/img/hero-cabinet.png"
          alt=""
          fill
          priority
          sizes="46vw"
          className="object-cover opacity-[0.16] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_72%)]"
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-14 lg:pt-24 lg:pb-20">
        <div className="grid min-w-0 items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left: copy — min-w-0 so nowrap descendants can't bust the track */}
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-zinc-400">
                DO SUPPLY <span className="text-amber-300">×</span> PLUNDER &amp; RIFFLE
              </span>
              <ProvenanceBadge kind="demo">Personalized demonstration</ProvenanceBadge>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold leading-[1.06] tracking-tight text-white">
              YOUR PRODUCTS.
              <br />
              YOUR EXPERTISE.
              <br />
              <span className="text-amber-glow">AN ENTIRE CONTENT ENGINE.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-zinc-400">
              Imagine turning every product, customer question, technical insight and
              company announcement into a continuous stream of professional marketing
              content.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-amber-400 text-black hover:bg-amber-300 font-semibold glow-amber"
              >
                <a href="#command-center">
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Explore the Marketing Engine
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <a href="#live-demo">See a Live Demonstration</a>
              </Button>
            </div>

            {/* stat strip */}
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                { v: formats, label: "content formats from one input" },
                { v: platforms, label: "platforms, one brand voice" },
                { v: weeks, label: "day implementation plan" },
              ].map((s) => (
                <div key={s.label} className="panel rounded-xl px-4 py-3">
                  <div className="font-mono text-2xl font-bold text-amber-300">
                    {s.v}
                  </div>
                  <div className="mt-1 text-[11px] leading-tight text-zinc-500">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: phone */}
          <div className="relative min-w-0">
            <PhoneMock posts={PHONE_FEED} />
            {/* production indicator */}
            <div className="mx-auto mt-6 max-w-md panel rounded-xl px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-zinc-500">
                  Simulated production stream
                </span>
                <ProvenanceBadge kind="simulated" />
              </div>
              <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px] text-zinc-300">
                <span className="amber-dot h-1.5 w-1.5 rounded-full bg-amber-300" />
                {/* min-w-0: `truncate` is nowrap, so without shrink permission
                    this line's min-content (~400px) busts the 375px layout. */}
                <span className="caret truncate min-w-0 flex-1">{TICKER_LINES[lineIdx]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* scroll cue */}
        <div className="mt-14 flex justify-center">
          <a
            href="#command-center"
            aria-label="Scroll to the command center"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-zinc-500 hover:text-amber-300 hover:border-amber-300/40 transition-colors"
          >
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  );
}


