"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SeoOutput } from "@/app/api/generate/route";
import { VERIFIED_PRODUCT_EXAMPLES } from "@/lib/demo-content";
import { postJson, ProvenanceBadge } from "./shared";
import { Globe, RefreshCw, Search, Link2, ShieldAlert } from "lucide-react";

export default function ModuleSeo() {
  const [input, setInput] = useState("Allen-Bradley ControlLogix");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SeoOutput | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const { ok, data } = await postJson<{ data: SeoOutput }>("/api/generate", {
      mode: "seo",
      input,
    });
    if (ok && data.data) setResult(data.data);
    else setError(data.error || "Generation failed.");
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Integrity disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-teal-400/25 bg-teal-400/5 p-4">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
        <p className="text-xs leading-relaxed text-teal-100/80">
          <strong className="font-semibold">Sourcing note:</strong> the product
          suggestions below are platform/series names verified from DO Supply&apos;s own
          public channels (ControlLogix, CompactLogix, PowerFlex, PanelView, SLC 500,
          PanelMate). The engine deliberately writes at platform level — it never
          invents part numbers, specs, compatibility or availability.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Controls */}
        <div className="space-y-5">
          <div>
            <p className="kicker mb-2">Product name or verified product URL</p>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Allen-Bradley PowerFlex drives"
              className="border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-400/50"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {VERIFIED_PRODUCT_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500 hover:border-amber-400/40 hover:text-amber-300 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={loading || !input.trim()}
            className="w-full bg-amber-400 text-black hover:bg-amber-300 font-semibold"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Optimizing…
              </>
            ) : (
              <>
                <Globe className="mr-2 h-4 w-4" /> Generate SEO Package
              </>
            )}
          </Button>
          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          {/* mini SERP preview of title/meta when present */}
          {result && (
            <div className="panel rounded-xl p-4">
              <p className="kicker mb-3">Google preview</p>
              <div className="rounded-lg bg-white p-3 text-left">
                <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-[8px] font-bold text-zinc-600">
                    D
                  </span>
                  dosupply.com › catalog
                </p>
                <p className="mt-1 truncate text-[15px] font-medium text-[#1a0dab]">
                  {result.seoTitle}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-zinc-600">
                  {result.metaDescription}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Output */}
        <div className="panel-solid rounded-xl p-5 min-h-[420px]">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-500">
              website &amp; seo workflow output
            </span>
            {result && <ProvenanceBadge kind="ai" />}
          </div>

          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-6 w-2/3 bg-white/5" />
              <Skeleton className="h-20 w-full bg-white/5" />
              <Skeleton className="h-32 w-full bg-white/5" />
            </div>
          )}

          {!loading && !result && (
            <div className="flex h-full min-h-[340px] flex-col items-center justify-center text-center text-zinc-600">
              <Search className="mb-3 h-8 w-8 text-zinc-700" />
              <p className="max-w-xs text-sm">
                SEO title, meta, product description, article outline, FAQs, internal
                links, alt text and keywords — one workflow.
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="scroll-slim max-h-[620px] space-y-5 overflow-y-auto pr-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <p className="kicker mb-1">SEO title ({result.seoTitle.length}ch)</p>
                  <p className="text-sm font-medium text-white">{result.seoTitle}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <p className="kicker mb-1">Meta description ({result.metaDescription.length}ch)</p>
                  <p className="text-sm text-zinc-300">{result.metaDescription}</p>
                </div>
              </div>

              <div>
                <p className="kicker mb-1.5">Product description</p>
                <p className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 text-sm leading-relaxed text-zinc-200">
                  {result.productDescription}
                </p>
              </div>

              {result.articleOutline.length > 0 && (
                <div>
                  <p className="kicker mb-1.5">Educational article outline</p>
                  <ol className="space-y-1.5">
                    {result.articleOutline.map((t, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-zinc-300">
                        <span className="font-mono text-[10px] text-amber-300/80 pt-0.5">
                          H2·{i + 1}
                        </span>
                        {t}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {result.faqs.length > 0 && (
                <div>
                  <p className="kicker mb-1.5">FAQ (engineered for featured snippets)</p>
                  <div className="space-y-2">
                    {result.faqs.map((f, i) => (
                      <div key={i} className="rounded-lg border border-white/10 bg-black/30 p-3">
                        <p className="text-sm font-medium text-white">{f.q}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{f.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.internalLinks.length > 0 && (
                <div>
                  <p className="kicker mb-1.5">Internal linking suggestions</p>
                  <div className="flex flex-wrap gap-2">
                    {result.internalLinks.map((l, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-zinc-300"
                      >
                        <Link2 className="h-3 w-3 text-teal-400" />
                        <strong className="font-medium text-teal-200">{l.anchor}</strong>
                        <span className="text-zinc-600">→</span>
                        <span className="font-mono text-[10px] text-zinc-500">{l.target}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {result.altTexts.length > 0 && (
                  <div>
                    <p className="kicker mb-1.5">Image alt text</p>
                    <ul className="space-y-1">
                      {result.altTexts.map((a, i) => (
                        <li key={i} className="rounded border border-white/5 bg-black/20 px-2.5 py-1.5 text-xs text-zinc-400">
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.keywords.length > 0 && (
                  <div>
                    <p className="kicker mb-1.5">Suggested keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords.map((k) => (
                        <span
                          key={k}
                          className="rounded-full border border-amber-400/25 bg-amber-400/5 px-2.5 py-1 font-mono text-[10px] text-amber-200"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
