"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReputationOutput } from "@/app/api/generate/route";
import { SAMPLE_REVIEWS } from "@/lib/demo-content";
import { postJson, ProvenanceBadge } from "./shared";
import {
  Star,
  RefreshCw,
  MessageSquareQuote,
  Lightbulb,
  ShieldAlert,
  ThumbsUp,
} from "lucide-react";

function Stars({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= n ? "fill-amber-400 text-amber-400" : "text-zinc-700"}`}
        />
      ))}
    </span>
  );
}

export default function ModuleReputation() {
  const [selected, setSelected] = useState<string>(SAMPLE_REVIEWS[1].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReputationOutput | null>(null);

  const review = SAMPLE_REVIEWS.find((r) => r.id === selected)!;

  async function generate() {
    setLoading(true);
    setError(null);
    const { ok, data } = await postJson<{ data: ReputationOutput }>("/api/generate", {
      mode: "reputation",
      review,
    });
    if (ok && data.data) setResult(data.data);
    else setError(data.error || "Generation failed.");
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        <p className="text-xs leading-relaxed text-zinc-400">
          <strong className="font-semibold text-zinc-200">Demonstration data:</strong>{" "}
          every review below is fictional and labeled. Nothing here posts to Google,
          Review.io or any account — the AI drafts responses and themes; a human always
          approves before anything ships.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Review list */}
        <div className="space-y-4">
          <p className="kicker">Step 1 — Select a sample review (demonstration)</p>
          <div className="scroll-slim max-h-[340px] space-y-2 overflow-y-auto pr-2">
            {SAMPLE_REVIEWS.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`w-full rounded-lg border p-3.5 text-left transition-all ${
                  selected === r.id
                    ? "border-amber-400/60 bg-amber-400/10"
                    : "border-white/10 bg-white/5 hover:border-white/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Stars n={r.rating} />
                  <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                    {r.source}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{r.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                  {r.text}
                </p>
                <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                  {r.author}
                </p>
              </button>
            ))}
          </div>

          <Button
            onClick={generate}
            disabled={loading}
            className="w-full bg-amber-400 text-black hover:bg-amber-300 font-semibold"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Analyzing feedback…
              </>
            ) : (
              <>
                <MessageSquareQuote className="mr-2 h-4 w-4" /> Draft Response &amp; Theme Analysis
              </>
            )}
          </Button>
          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>

        {/* Output */}
        <div className="panel-solid rounded-xl p-5 min-h-[420px]">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-500">
              response draft · sentiment themes
            </span>
            {result && <ProvenanceBadge kind="ai" />}
          </div>

          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full bg-white/5" />
              <Skeleton className="h-28 w-full bg-white/5" />
              <Skeleton className="h-16 w-full bg-white/5" />
            </div>
          )}

          {!loading && !result && (
            <div className="flex h-full min-h-[340px] flex-col items-center justify-center text-center text-zinc-600">
              <MessageSquareQuote className="mb-3 h-8 w-8 text-zinc-700" />
              <p className="max-w-xs text-sm">
                Select a review and the engine drafts a brand-aligned reply, extracts
                feedback themes and turns recurring questions into content ideas.
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="scroll-slim max-h-[560px] space-y-5 overflow-y-auto pr-2">
              <div>
                <p className="kicker mb-2">
                  Ready-to-post reply ({review.rating}/5 · {review.sentiment})
                </p>
                <div className="rounded-lg border border-teal-400/25 bg-teal-400/5 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-teal-50/90">
                    {result.response}
                  </p>
                  <p className="mt-3 border-t border-white/10 pt-2 font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                    Human approval required before posting · never auto-published
                  </p>
                </div>
              </div>

              {result.themes.length > 0 && (
                <div>
                  <p className="kicker mb-2">Recurring feedback themes (of sample set)</p>
                  <div className="space-y-2">
                    {result.themes.map((t, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-36 truncate text-xs text-zinc-300">{t.theme}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-700"
                            style={{ width: `${Math.min(100, Math.max(4, t.share))}%` }}
                          />
                        </div>
                        <span className="w-10 text-right font-mono text-[10px] text-zinc-500">
                          {t.share}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {result.insights.length > 0 && (
                  <div>
                    <p className="kicker mb-2">CX opportunities</p>
                    <ul className="space-y-1.5">
                      {result.insights.map((s, i) => (
                        <li key={i} className="flex gap-2 text-xs leading-relaxed text-zinc-400">
                          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.contentIdeas.length > 0 && (
                  <div>
                    <p className="kicker mb-2">Turn questions into content</p>
                    <ul className="space-y-1.5">
                      {result.contentIdeas.map((s, i) => (
                        <li key={i} className="flex gap-2 text-xs leading-relaxed text-zinc-400">
                          <ThumbsUp className="mt-0.5 h-3 w-3 shrink-0 text-teal-400" />
                          {s}
                        </li>
                      ))}
                    </ul>
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
