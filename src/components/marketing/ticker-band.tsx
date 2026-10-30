"use client";

import { TICKER_LINES } from "@/lib/demo-content";
import { ProvenanceBadge } from "./shared";

/**
 * Simulated production stream marquee — clearly labeled as simulated,
 * distinguished from real engine output elsewhere on the page.
 */
export default function TickerBand() {
  const doubled = [...TICKER_LINES, ...TICKER_LINES];
  return (
    <div className="relative border-y border-white/10 bg-black/40 py-2.5">
      <div className="flex items-center gap-4 overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 pl-4 sm:pl-6">
          <span className="live-dot" />
          <span className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">
            Simulated production stream
          </span>
          <span className="hidden sm:block">
            <ProvenanceBadge kind="simulated" />
          </span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track flex w-max items-center gap-8">
            {doubled.map((line, i) => (
              <span
                key={i}
                className="flex items-center gap-3 whitespace-nowrap font-mono text-[11px] text-zinc-500"
              >
                <span className="text-teal-400/70">▸</span>
                {line}
                <span className="text-emerald-400/80">✓</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
