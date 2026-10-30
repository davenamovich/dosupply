"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Cpu,
  Layers,
  ShieldCheck,
  Clapperboard,
  X,
} from "lucide-react";

const STORAGE_KEY = "do-pr-welcome-dismissed";

/**
 * WelcomeOverlay — a once-per-session greeting for the DO Supply team.
 * Shown the first time the screen loads; dismissed via CTA, backdrop,
 * Escape, or the close button. Purely presentational — it never gates
 * content and it never claims anything the page doesn't do.
 */
export default function WelcomeOverlay() {
  const [open, setOpen] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Deferred one tick so the page paints first (and lint-clean: the
    // sessionStorage read is an external system read, not render state).
    const t = window.setTimeout(() => {
      let seen = false;
      try {
        seen = window.sessionStorage.getItem(STORAGE_KEY) === "1";
      } catch {
        seen = false;
      }
      if (!seen) setOpen(true);
    }, 60);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = useCallback((goto?: { selector: string; tab?: string }) => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode — dismissal just won't persist */
    }
    setOpen(false);
    if (goto) {
      // Let the overlay unmount before scrolling.
      window.setTimeout(() => {
        if (goto.tab) {
          window.dispatchEvent(
            new CustomEvent("pr-studio:tab", { detail: goto.tab })
          );
        }
        document
          .querySelector(goto.selector)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 140);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    const focusTimer = window.setTimeout(
      () => primaryRef.current?.focus(),
      380
    );
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div
      className="welcome-fade fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#07080a]/90 px-4 py-8 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      aria-describedby="welcome-body"
      onClick={() => dismiss()}
    >
      <div
        className="welcome-rise noise-overlay relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e11]/95 shadow-[0_40px_120px_-30px_rgba(255,176,0,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="welcome-glow-line" />
        <div className="industrial-grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="atmosphere-amber pointer-events-none absolute inset-0" />

        <button
          onClick={() => dismiss()}
          aria-label="Dismiss welcome message"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-500 transition-colors hover:border-white/25 hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-400/10">
              <Cpu className="h-4 w-4 text-amber-300" />
            </span>
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-zinc-400">
              DO SUPPLY <span className="text-amber-300">×</span> PLUNDER &amp;
              RIFFLE
            </span>
          </div>

          <p className="kicker mt-7">
            A hand-built demonstration — from Dave, Plunder &amp; Riffle
          </p>
          <h2
            id="welcome-title"
            className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Welcome, <span className="text-amber-glow">DO Supply team.</span>
          </h2>
          <p
            id="welcome-body"
            className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base"
          >
            Thanks for opening this. Instead of telling you what an AI
            marketing engine could do with your catalog, I built one. Everything
            below this screen is interactive — real calls to the Plunder &amp;
            Riffle MCP where a key is configured, and clearly labeled
            demonstration data everywhere else. Break it, poke it, generate
            with it.
          </p>

          <ul className="mt-6 grid gap-2.5 sm:grid-cols-3">
            {[
              {
                icon: Layers,
                label: "6 interactive modules",
                sub: "social → email → SEO → more",
              },
              {
                icon: Clapperboard,
                label: "Live P&R video studio",
                sub: "real MCP tool calls",
              },
              {
                icon: ShieldCheck,
                label: "Honest labels",
                sub: "real vs. demo, always marked",
              },
            ].map((f) => (
              <li
                key={f.label}
                className="panel rounded-xl px-3.5 py-3"
              >
                <f.icon className="h-4 w-4 text-amber-300" aria-hidden="true" />
                <p className="mt-2 text-[13px] font-semibold leading-tight text-zinc-100">
                  {f.label}
                </p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  {f.sub}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              ref={primaryRef}
              size="lg"
              className="glow-amber bg-amber-400 font-semibold text-black hover:bg-amber-300"
              onClick={() => dismiss({ selector: "#command-center" })}
            >
              Explore the Engine
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() =>
                dismiss({ selector: "#pr-studio", tab: "video" })
              }
            >
              <Clapperboard className="mr-2 h-4 w-4" />
              Watch the Video Studio
            </Button>
          </div>

          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            5-minute walkthrough · nothing to install · every result labeled
            real or demo
          </p>
        </div>
      </div>
    </div>
  );
}
