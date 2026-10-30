"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ModuleSocial from "./module-social";
import ModuleVideo from "./module-video";
import ModuleEmail from "./module-email";
import ModuleSeo from "./module-seo";
import ModuleReputation from "./module-reputation";
import { SectionHeading } from "./section-heading";
import {
  Share2,
  Clapperboard,
  Mail,
  Globe,
  HeartHandshake,
  Layers,
} from "lucide-react";

const MODULES = [
  { id: "social", label: "A · Social Engine", icon: Share2 },
  { id: "video", label: "B · Video Studio", icon: Clapperboard },
  { id: "email", label: "C · Email Engine", icon: Mail },
  { id: "seo", label: "D · Website & SEO", icon: Globe },
  { id: "reputation", label: "E · Reputation", icon: HeartHandshake },
];

export default function CommandCenter() {
  const [tab, setTab] = useState("social");

  return (
    <section id="command-center" className="relative py-20 sm:py-24">
      <div className="absolute inset-0 atmosphere-teal pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="The AI Marketing Command Center"
          title={
            <>
              Six modules. <span className="text-amber-glow">One engine.</span>
            </>
          }
          desc="Every module below is live. Pick inputs, generate real AI-drafted drafts, and watch how one brand voice flexes across every channel — the same workflows a Multimedia Marketing Specialist would operate for DO Supply."
        />

        <Tabs value={tab} onValueChange={setTab} className="mt-12">
          <div className="scroll-slim -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex h-auto w-max min-w-full gap-1 rounded-xl border border-white/10 bg-black/40 p-1.5">
              {MODULES.map((m) => (
                <TabsTrigger
                  key={m.id}
                  value={m.id}
                  className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-medium text-zinc-400 transition-colors data-[state=active]:bg-amber-400 data-[state=active]:text-black data-[state=active]:font-semibold hover:text-zinc-200"
                >
                  <m.icon className="h-3.5 w-3.5" />
                  {m.label}
                </TabsTrigger>
              ))}
              <TabsTrigger
                value="multiplier"
                className="flex items-center gap-2 rounded-lg border border-teal-400/40 bg-teal-400/10 px-3.5 py-2.5 text-xs font-semibold text-teal-200 transition-colors data-[state=active]:bg-teal-400 data-[state=active]:text-black data-[state=active]:border-transparent hover:bg-teal-400/20"
              >
                <Layers className="h-3.5 w-3.5" />
                F · Content Multiplier
                <span className="rounded bg-black/30 px-1 py-0.5 font-mono text-[8px] tracking-widest">
                  ×10
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-8">
            <TabsContent value="social">
              <ModuleSocial />
            </TabsContent>
            <TabsContent value="video">
              <ModuleVideo />
            </TabsContent>
            <TabsContent value="email">
              <ModuleEmail />
            </TabsContent>
            <TabsContent value="seo">
              <ModuleSeo />
            </TabsContent>
            <TabsContent value="reputation">
              <ModuleReputation />
            </TabsContent>
            <TabsContent value="multiplier">
              <Multiplier />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MODULE F — The Content Multiplier (centerpiece)                     */
/* ------------------------------------------------------------------ */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiplierOutput } from "@/app/api/generate/route";
import { VERIFIED_PRODUCT_EXAMPLES } from "@/lib/demo-content";
import { postJson, ProvenanceBadge } from "./shared";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Linkedin,
  Facebook,
  Instagram,
  Youtube,
  Search,
  HelpCircle,
  AudioLines,
  GalleryHorizontalEnd,
  ArrowRight,
} from "lucide-react";

type OutputKey = keyof MultiplierOutput;

const OUTPUT_CARDS: {
  key: OutputKey;
  title: string;
  icon: React.ElementType;
  accent: string;
}[] = [
  { key: "linkedin", title: "1 · LinkedIn Post", icon: Linkedin, accent: "text-sky-300" },
  { key: "facebook", title: "2 · Facebook Post", icon: Facebook, accent: "text-sky-400" },
  { key: "instagram", title: "3 · Instagram Caption", icon: Instagram, accent: "text-pink-300" },
  { key: "videoScript", title: "4 · 30s Video Script", icon: Clapperboard, accent: "text-amber-300" },
  { key: "youtubeDescription", title: "5 · YouTube Description", icon: Youtube, accent: "text-red-400" },
  { key: "email", title: "6 · Email Campaign", icon: Mail, accent: "text-amber-300" },
  { key: "seoDescription", title: "7 · SEO Description", icon: Search, accent: "text-teal-300" },
  { key: "faq", title: "8 · Customer FAQ", icon: HelpCircle, accent: "text-teal-300" },
  { key: "narration", title: "9 · Audio Narration", icon: AudioLines, accent: "text-violet-300" },
  { key: "carousel", title: "10 · Social Carousel", icon: GalleryHorizontalEnd, accent: "text-emerald-300" },
];

function renderCardValue(key: OutputKey, data: MultiplierOutput): string {
  const v = data[key];
  if (key === "faq" && typeof v === "object" && v !== null) {
    const f = v as { q: string; a: string };
    return `Q: ${f.q}\n\nA: ${f.a}`;
  }
  if (key === "carousel" && Array.isArray(v)) {
    return v.map((s, i) => `${i + 1}. ${s}`).join("\n");
  }
  return String(v ?? "");
}

function Multiplier() {
  const [input, setInput] = useState("Allen-Bradley PowerFlex drives");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MultiplierOutput | null>(null);
  const [revealed, setRevealed] = useState(0);

  async function generate() {
    setLoading(true);
    setError(null);
    setData(null);
    setRevealed(0);
    const { ok, data } = await postJson<{ data: MultiplierOutput }>("/api/generate", {
      mode: "multiplier",
      input,
    });
    if (ok && data.data) {
      setData(data.data);
      setRevealed(OUTPUT_CARDS.length);
    } else {
      setError(data.error || "Generation failed.");
    }
    setLoading(false);
  }

  return (
    <div className="relative">
      {/* centerpiece banner */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/10 via-transparent to-teal-400/10 p-6 sm:p-8">
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="kicker">Module F — The centerpiece</span>
              <ProvenanceBadge kind="ai" />
            </div>
            <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white">
              One input in. <span className="text-amber-glow">Ten outputs out.</span>
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Type any industrial product and watch the engine produce a complete,
              channel-ready marketing package — every format a working marketer would
              need, in one pass.
            </p>
          </div>
          <div className="w-full max-w-md space-y-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Allen-Bradley ControlLogix"
              className="h-12 border-white/15 bg-black/50 text-base text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-400/50"
            />
            <div className="flex flex-wrap gap-1.5">
              {VERIFIED_PRODUCT_EXAMPLES.slice(0, 3).map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500 hover:border-amber-400/40 hover:text-amber-300 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
            <Button
              onClick={generate}
              disabled={loading || !input.trim()}
              className="h-12 w-full bg-amber-400 text-base font-bold text-black hover:bg-amber-300 glow-amber"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Multiplying…
                </>
              ) : (
                <>
                  <Layers className="mr-2 h-5 w-5" /> Generate the ×10 Package
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <p className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* pipeline hint */}
      {!loading && !data && !error && (
        <div className="flex flex-wrap items-center justify-center gap-3 py-10 text-zinc-600">
          {["1 input", "10 formats", "1 brand voice"].map((s, i) => (
            <span key={s} className="flex items-center gap-3">
              {i > 0 && <ArrowRight className="h-4 w-4 text-zinc-700" />}
              <span className="panel rounded-lg px-4 py-2 font-mono text-xs">{s}</span>
            </span>
          ))}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {OUTPUT_CARDS.map((c) => (
            <Skeleton key={c.key} className="h-44 rounded-xl bg-white/5" />
          ))}
        </div>
      )}

      {/* 10-output grid */}
      <AnimatePresence>
        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          >
            {OUTPUT_CARDS.map((c, i) => (
              <motion.article
                key={c.key}
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                className="lift panel flex min-h-[190px] flex-col rounded-xl p-4"
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <c.icon className={`h-4 w-4 ${c.accent}`} />
                  <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-zinc-600">
                    {String(i + 1).padStart(2, "0")}/10
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-zinc-100">{c.title}</h4>
                <p className="scroll-slim mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-400">
                  {renderCardValue(c.key, data)}
                </p>
              </motion.article>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {data && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-center text-xs text-zinc-500">
            {revealed} formats generated from{" "}
            <span className="text-amber-300">&ldquo;{input}&rdquo;</span> · AI-drafted,
            human-approved before anything ships.
          </p>
          <Button
            asChild
            variant="outline"
            className="border-teal-400/40 bg-teal-400/10 text-teal-200 hover:bg-teal-400/20 hover:text-teal-100"
          >
            <a href="#live-demo">
              Now see the live P&R engine →
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
