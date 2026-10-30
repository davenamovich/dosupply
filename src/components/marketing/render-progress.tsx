"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Honest render-wait bar: an eased estimate that crawls toward 95% and
 * refuses to fake the last 5% (that belongs to the engine's real "done"),
 * an elapsed timer, and a rotation of engineering jokes to keep the wait
 * human. The engine's actual status still comes from get_job_status polls —
 * this bar is labeled as our optimistic guess, not the engine's word.
 */
export default function RenderProgress({
  expectedMs,
  jokes,
  label = "Rendering",
  pollNote = "engine polled every 15s",
}: {
  /** Roughly how long this step usually takes (used only for the estimate). */
  expectedMs: number;
  /** Rotation of waiting-room one-liners. */
  jokes: string[];
  label?: string;
  pollNote?: string;
}) {
  const startRef = useRef(Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [jokeIndex, setJokeIndex] = useState(0);

  /* Elapsed clock. */
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(iv);
  }, []);

  /* Joke rotation — randomize the starting point after mount (no SSR mismatch). */
  useEffect(() => {
    setJokeIndex(Math.floor(Math.random() * jokes.length));
    const iv = setInterval(() => setJokeIndex((i) => (i + 1) % jokes.length), 4600);
    return () => clearInterval(iv);
  }, [jokes.length]);

  const elapsed = Math.max(0, now - startRef.current);

  /* Ease-out estimate: confident start, long crawl, hard cap at 95%. */
  const pct = useMemo(() => {
    const x = elapsed / Math.max(1, expectedMs);
    const eased = 95 * (1 - Math.exp(-1.5 * x));
    return Math.min(95, Math.max(4, eased));
  }, [elapsed, expectedMs]);

  const mm = Math.floor(elapsed / 60_000);
  const ss = Math.floor((elapsed % 60_000) / 1000);
  const joke = jokes[jokeIndex % jokes.length];

  return (
    <div
      className="mt-3 rounded-lg border border-white/10 bg-black/40 p-3.5"
      role="status"
      aria-live="polite"
      aria-label={`${label} in progress — ${mm}m ${ss}s elapsed`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber-200">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          {label}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-zinc-500">
          {mm}:{String(ss).padStart(2, "0")} elapsed
        </span>
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "render-stripes h-full rounded-full bg-gradient-to-r from-teal-400 via-teal-300 to-amber-400 transition-[width] duration-500 ease-out"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 min-h-[2.5rem]">
        <AnimatePresence mode="wait">
          <motion.p
            key={jokeIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="text-[13px] leading-snug text-zinc-300"
          >
            <span className="mr-1.5 select-none text-teal-400/80" aria-hidden="true">
              ▸
            </span>
            {joke}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-zinc-600">
        bar = optimistic estimate · real status: {pollNote}
      </p>
    </div>
  );
}
