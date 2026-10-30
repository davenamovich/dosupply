"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiplierOutput } from "@/app/api/generate/route";
import { postJson, ProvenanceBadge, McpStatusPill } from "./shared";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  RefreshCw,
  ExternalLink,
  ImageIcon,
  ShieldCheck,
  Terminal,
  ArrowDown,
} from "lucide-react";

type CreativeResponse = {
  mode?: "live" | "error" | "unavailable";
  pageUrl?: string | null;
  mediaUrl?: string | null;
  adAssets?: { url?: string; size?: string }[] | Record<string, unknown> | null;
  postCopy?: unknown;
  referralUrl?: string | null;
  tool?: string;
  error?: string;
  code?: string;
};

function collectImageUrls(d: CreativeResponse): { url: string; size?: string }[] {
  const urls: { url: string; size?: string }[] = [];
  if (d.mediaUrl) urls.push({ url: d.mediaUrl, size: "primary" });
  if (Array.isArray(d.adAssets)) {
    for (const a of d.adAssets) {
      if (a && typeof a.url === "string" && !urls.some((u) => u.url === a.url)) {
        urls.push({ url: a.url, size: typeof a.size === "string" ? a.size : undefined });
      }
    }
  } else if (d.adAssets && typeof d.adAssets === "object") {
    for (const [, v] of Object.entries(d.adAssets as Record<string, unknown>)) {
      if (typeof v === "string" && v.startsWith("http") && !urls.some((u) => u.url === v)) {
        urls.push({ url: v });
      }
    }
  }
  return urls;
}

function postCopyText(pc: unknown): string | null {
  if (!pc) return null;
  if (typeof pc === "string") return pc;
  if (Array.isArray(pc)) return pc.map((p) => (typeof p === "string" ? p : JSON.stringify(p))).join("\n\n");
  try {
    return JSON.stringify(pc, null, 2);
  } catch {
    return String(pc);
  }
}

export default function LiveDemo() {
  const [input, setInput] = useState("Allen-Bradley ControlLogix");
  const [pkgLoading, setPkgLoading] = useState(false);
  const [pkg, setPkg] = useState<MultiplierOutput | null>(null);
  const [pkgError, setPkgError] = useState<string | null>(null);

  const [creative, setCreative] = useState<CreativeResponse | null>(null);
  const [creativeLoading, setCreativeLoading] = useState(false);
  const [creativeError, setCreativeError] = useState<string | null>(null);

  async function generatePackage() {
    setPkgLoading(true);
    setPkgError(null);
    setPkg(null);
    const { ok, data } = await postJson<{ data: MultiplierOutput }>("/api/generate", {
      mode: "package",
      input,
    });
    if (ok && data.data) setPkg(data.data);
    else setPkgError(data.error || "Generation failed.");
    setPkgLoading(false);
  }

  async function generateCreative() {
    setCreativeLoading(true);
    setCreativeError(null);
    setCreative(null);
    const { ok, data } = await postJson<CreativeResponse>("/api/mcp/creative", {
      input,
      kind: "creative",
      format: "carousel",
    });
    if (ok && data.mode === "live") {
      setCreative(data);
    } else if (data.mode === "unavailable") {
      setCreative(data);
      setCreativeError(undefined);
    } else {
      setCreative(null);
      setCreativeError(data.error || "The P&R MCP creative call failed — showing honest error, not fake success.");
    }
    setCreativeLoading(false);
  }

  const images = creative ? collectImageUrls(creative) : [];
  const copy = creative ? postCopyText(creative.postCopy) : null;

  return (
    <section id="live-demo" className="relative py-20 sm:py-24">
      <div className="absolute inset-0 atmosphere-amber pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="kicker">The Live P&amp;R Demonstration</span>
            <McpStatusPill />
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            One product. <span className="text-teal-glow">Real engine calls.</span>
            <br />
            Zero fake success messages.
          </h2>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            This section talks to the actual Plunder &amp; Riffle MCP
            (<code className="font-mono text-xs text-teal-300">bot.plunderandriffle.com/api/mcp</code>)
            server-side — credentials never touch your browser. If the engine can&apos;t
            respond, you&apos;ll see the honest error and a clearly-labeled demonstration
            fallback instead.
          </p>
        </div>

        {/* Input console */}
        <div className="mx-auto mt-10 max-w-2xl">
          <div className="panel noise-overlay relative rounded-2xl p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-amber-300" />
              <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                engine console · no login required
              </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter a product or topic…"
                className="h-12 flex-1 border-white/15 bg-black/50 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-400/50"
                aria-label="Product or topic"
              />
              <Button
                onClick={generatePackage}
                disabled={pkgLoading || !input.trim()}
                className="h-12 bg-amber-400 px-6 font-bold text-black hover:bg-amber-300 glow-amber"
              >
                {pkgLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 fill-current" />
                )}
                <span className="ml-2">Generate Package</span>
              </Button>
            </div>
            <p className="mt-2.5 text-[11px] text-zinc-500">
              Try: &ldquo;Allen-Bradley PowerFlex drives&rdquo;, &ldquo;PanelView HMI
              terminals&rdquo;, or anything else industrial.
            </p>
          </div>
        </div>

        {/* Package results */}
        <div className="mx-auto mt-8 max-w-4xl">
          {pkgLoading && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl bg-white/5" />
              ))}
            </div>
          )}
          {pkgError && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {pkgError}
            </p>
          )}
          {pkg && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="panel rounded-2xl p-5 sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                  marketing package · {input}
                </span>
                <ProvenanceBadge kind="ai" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["LinkedIn", pkg.linkedin],
                    ["Facebook", pkg.facebook],
                    ["Instagram", pkg.instagram],
                    ["30s Video Script", pkg.videoScript],
                    ["YouTube", pkg.youtubeDescription],
                    ["Email", pkg.email],
                    ["SEO", pkg.seoDescription],
                    [
                      "FAQ",
                      `Q: ${pkg.faq?.q ?? ""}\nA: ${pkg.faq?.a ?? ""}`,
                    ],
                    ["Narration", pkg.narration],
                    ["Carousel", pkg.carousel?.map((s, i) => `${i + 1}. ${s}`).join("\n") ?? ""],
                  ] as [string, string][]
                ).map(([label, text], i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-white/10 bg-black/30 p-3.5"
                  >
                    <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-amber-300/80">
                      {label}
                    </p>
                    <p className="scroll-slim max-h-32 overflow-y-auto whitespace-pre-wrap text-[11.5px] leading-relaxed text-zinc-300">
                      {text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="mx-auto mt-14 max-w-4xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="hairline flex-1" />
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              <ArrowDown className="h-3 w-3" /> real multimedia via P&amp;R MCP
            </span>
            <div className="hairline flex-1" />
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={generateCreative}
              disabled={creativeLoading || !input.trim()}
              variant="outline"
              className="h-11 border-teal-400/40 bg-teal-400/10 px-6 font-semibold text-teal-200 hover:bg-teal-400/20 hover:text-teal-100"
            >
              {creativeLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="mr-2 h-4 w-4" />
              )}
              Generate a Real Ad Creative via P&amp;R MCP
            </Button>
            <p className="text-center text-[11px] text-zinc-600">
              Calls <code className="font-mono text-teal-400/80">generate_ad_creative</code>{" "}
              server-side. Returns the MCP&apos;s temp-page preview, PNG assets and post
              copy exactly as produced — or a transparent error.
            </p>
          </div>

          {/* Creative result */}
          <AnimatePresence>
            {creativeLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 grid gap-3 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-52 rounded-xl bg-white/5" />
                ))}
              </motion.div>
            )}

            {!creativeLoading && creative && creative.mode === "live" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 panel rounded-2xl p-5 sm:p-6"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-teal-300" />
                    <span className="text-sm font-semibold text-teal-200">
                      P&amp;R MCP responded — real output
                    </span>
                    <ProvenanceBadge kind="pnr" />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-600">
                    tool: {creative.tool} · meme-engine
                  </span>
                </div>

                {images.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {images.slice(0, 6).map((img, i) => (
                      <a
                        key={i}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40"
                      >
                        <img
                          src={img.url}
                          alt={`P&R MCP generated ad creative ${i + 1}`}
                          className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        {img.size && (
                          <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] text-zinc-300">
                            {img.size}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-400">
                    The MCP returned no PNG assets for this run — see the raw payloads
                    below and the preview page link.
                  </p>
                )}

                {creative.pageUrl && (
                  <a
                    href={creative.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3.5 py-2 text-sm font-medium text-amber-200 hover:bg-amber-400/20"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open the P&amp;R temp-page preview
                  </a>
                )}

                {copy && (
                  <div className="mt-4">
                    <p className="kicker mb-1.5">Post copy (as returned)</p>
                    <pre className="scroll-slim max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-zinc-300">
                      {copy}
                    </pre>
                  </div>
                )}
              </motion.div>
            )}

            {!creativeLoading && creative && creative.mode === "unavailable" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 panel rounded-2xl border-amber-400/25 p-5 sm:p-6"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <ProvenanceBadge kind="demo" />
                  <span className="text-sm font-semibold text-amber-200">
                    Demonstration fallback — P&amp;R MCP unavailable in this deployment
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-amber-100/70">
                  {creative.error}
                </p>
                <div className="mt-4 rounded-xl border border-dashed border-amber-400/30 bg-black/30 p-5 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                    where a real creative would appear
                  </p>
                  <p className="mt-2 text-sm text-zinc-400">
                    Carousel concept for <span className="text-amber-300">{input}</span> —
                    hook slide, 3 value slides, CTA slide. The engine call
                    (<code className="font-mono text-xs text-teal-300">generate_ad_creative</code>)
                    would return live PNG assets + a preview page here.
                  </p>
                </div>
              </motion.div>
            )}

            {!creativeLoading && creativeError && (
              <p className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {creativeError}
              </p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
