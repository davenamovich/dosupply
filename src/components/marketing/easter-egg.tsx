"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  X,
  Database,
  BookOpen,
  Layers,
  Cpu,
  GraduationCap,
  Handshake,
  ShieldCheck,
} from "lucide-react";
import { DATA_MONETIZATION_OPPORTUNITIES } from "@/lib/demo-content";
import { ProvenanceBadge } from "./shared";

const ICONS: Record<string, React.ElementType> = {
  database: Database,
  book: BookOpen,
  layers: Layers,
  cpu: Cpu,
  graduation: GraduationCap,
  handshake: Handshake,
};

const PIPELINE = [
  { label: "Your Archive", desc: "old CAD drawings, maintenance records, Slack, email" },
  { label: "The Buyers", desc: "AI labs paying for real industrial ground truth" },
  { label: "The Introduction", desc: "you authorize — I open the door" },
  { label: "Referral Fees", desc: "paid to you, not a data sale" },
];

export default function EasterEgg() {
  const [open, setOpen] = useState(false);
  const [hintSeen, setHintSeen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Subtle trigger */}
      <div className="flex justify-center py-10">
        <button
          onClick={() => {
            setOpen(true);
            setHintSeen(true);
          }}
          onMouseEnter={() => setHintSeen(true)}
          aria-label="Open a hidden section"
          className="group flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 font-mono text-[11px] text-zinc-600 transition-all hover:border-teal-400/40 hover:text-teal-300"
        >
          <Terminal className="h-3.5 w-3.5" />
          There&apos;s Something Else...
          <span className="inline-block h-1 w-1 rounded-full bg-teal-400 opacity-0 transition-opacity group-hover:opacity-100 amber-dot" />
        </button>
        <AnimatePresence>
          {hintSeen && !open && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="sr-only"
            >
              A hidden section is available
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Full-screen premium overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] overflow-y-auto bg-black/80 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label="The AI lab referral opportunity"
          >
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative mx-auto my-6 max-w-5xl rounded-3xl border border-teal-400/25 bg-[#0b0f12] p-6 shadow-2xl sm:my-12 sm:p-10"
            >
              {/* ambient */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                <div className="absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-teal-400/10 blur-3xl" />
                <div className="absolute -bottom-32 right-0 h-64 w-96 rounded-full bg-amber-400/10 blur-3xl" />
              </div>

              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-zinc-400 hover:border-white/40 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="kicker">Confidential concept — candidate to DO Supply</span>
                  <ProvenanceBadge kind="demo">Exploratory idea</ProvenanceBadge>
                </div>

                <h2 className="mt-4 text-3xl sm:text-4xl font-bold leading-tight text-white">
                  YOU&apos;VE BUILT THE RELATIONSHIPS.
                  <br />
                  <span className="text-teal-glow">NOW MONETIZE THE INTRODUCTIONS.</span>
                </h2>

                <p className="mt-5 max-w-3xl text-sm leading-relaxed text-zinc-400">
                  Years of trust with the people who actually run plants is the one thing
                  AI labs cannot buy for themselves. Old CAD drawings, maintenance records,
                  Slack threads and email archives are sitting on drives collecting dust,
                  while those labs pay enormous referral fees for a path to exactly that
                  material. This is not a data sale — it is an introduction. You authorize
                  the access, the lab pays the referral, and the relationship stays yours.
                </p>

                {/* Pipeline */}
                <div className="mt-8 grid gap-3 sm:grid-cols-4">
                  {PIPELINE.map((p, i) => (
                    <div key={p.label} className="relative">
                      <div className="panel h-full rounded-xl p-4">
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-teal-300/80">
                          Step {i + 1}
                        </span>
                        <p className="mt-1.5 text-sm font-semibold text-white">{p.label}</p>
                        <p className="mt-1 text-[11px] leading-snug text-zinc-500">{p.desc}</p>
                      </div>
                      {i < PIPELINE.length - 1 && (
                        <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 font-mono text-teal-400/60 sm:block">
                          →
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Opportunities */}
                <h3 className="mt-10 text-lg font-semibold text-white">
                  What the introductions are worth
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {DATA_MONETIZATION_OPPORTUNITIES.map((o) => {
                    const Icon = ICONS[o.icon] ?? Database;
                    return (
                      <div key={o.title} className="lift panel rounded-xl p-4">
                        <Icon className="h-5 w-5 text-teal-300" />
                        <p className="mt-2.5 text-sm font-semibold text-zinc-100">{o.title}</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{o.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Governance */}
                <div className="mt-8 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-300" />
                    <p className="text-sm font-semibold text-amber-200">
                      Required safeguards — non-negotiable
                    </p>
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-amber-100/80">
                    Nothing moves without verified ownership, written authorization and a
                    clean paper trail. Customer names, pricing and anything under NDA stay
                    out of scope; labs get licensed access, never the file. You approve
                    every introduction, you can stop at any point, and the relationships
                    they meet are yours — not mine.
                  </p>
                </div>

                <h3 className="mt-10 text-2xl sm:text-3xl font-bold text-white">
                  &ldquo;You&apos;ve Built the Relationships.
                  <br />
                  <span className="text-amber-glow">Now It&apos;s Time to Monetize Them.&rdquo;</span>
                </h3>

                <p className="mt-5 max-w-2xl border-l-2 border-teal-400/50 pl-4 text-sm italic leading-relaxed text-zinc-300">
                  AI is not going away. You can let the data collect dust, or take the
                  referral proceeds and put them back into operations — more inventory,
                  more service, more reach. The only thing standing between those two
                  futures is an introduction, and I can make it.
                </p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-600">
                  — Dave · Founder, Plunder &amp; Riffle
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
