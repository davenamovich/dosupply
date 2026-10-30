"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformOutput } from "@/app/api/generate/route";
import {
  PLATFORMS,
  SOCIAL_THEMES,
  VERIFIED_PRODUCT_EXAMPLES,
} from "@/lib/demo-content";
import { postJson, ProvenanceBadge } from "./shared";
import { Sparkles, RefreshCw } from "lucide-react";

const platformIcons: Record<string, React.ReactNode> = {
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95C23.73 2.7 21.31.27 16.95.07 15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.15A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.41-11.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M18.24 2.25h3.31l-7.23 8.26L22.83 21.75h-6.66l-5.22-6.82-5.97 6.82H1.66l7.73-8.84L1.25 2.25h6.83l4.72 6.24zm-1.16 17.52h1.83L7.08 4.13H5.12z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12z" />
    </svg>
  ),
};

export default function ModuleSocial() {
  const [platform, setPlatform] = useState<string>("linkedin");
  const [theme, setTheme] = useState<string>(SOCIAL_THEMES[0]);
  const [input, setInput] = useState("Allen-Bradley PowerFlex drives");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlatformOutput | null>(null);

  const activePlatform = PLATFORMS.find((p) => p.id === platform)!;

  async function generate() {
    setLoading(true);
    setError(null);
    const { ok, data } = await postJson<{ data: PlatformOutput }>("/api/generate", {
      mode: "social",
      input,
      platform,
      theme,
    });
    if (ok && data.data) setResult(data.data);
    else setError(data.error || "Generation failed.");
    setLoading(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      {/* Controls */}
      <div className="space-y-5">
        <div>
          <p className="kicker mb-2">Step 1 — Choose platform</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  platform === p.id
                    ? "border-amber-400/60 bg-amber-400/10 text-amber-200"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                }`}
              >
                {platformIcons[p.id]}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="kicker mb-2">Step 2 — Content theme</p>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_THEMES.map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded-full border px-3 py-1.5 text-[11px] transition-all ${
                  theme === t
                    ? "border-teal-400/60 bg-teal-400/10 text-teal-200"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="kicker mb-2">Step 3 — Product or topic</p>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Allen-Bradley ControlLogix"
            className="border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-400/50"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VERIFIED_PRODUCT_EXAMPLES.slice(0, 4).map((ex) => (
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
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Composing {activePlatform.label} post…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Generate {activePlatform.label} Content
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
      <div className="panel-solid rounded-xl p-5 min-h-[380px] flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: `${activePlatform.color}22`, color: activePlatform.color }}
            >
              {platformIcons[platform]}
            </span>
            <span className="font-medium">{activePlatform.label} draft</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500 text-xs">{activePlatform.handle}</span>
          </div>
          {result && <ProvenanceBadge kind="ai" />}
        </div>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-5 w-3/4 bg-white/5" />
            <Skeleton className="h-4 w-full bg-white/5" />
            <Skeleton className="h-4 w-5/6 bg-white/5" />
            <Skeleton className="h-4 w-2/3 bg-white/5" />
            <Skeleton className="h-16 w-full bg-white/5" />
          </div>
        )}

        {!loading && !result && (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-zinc-600">
            <Sparkles className="mb-3 h-8 w-8 text-zinc-700" />
            <p className="max-w-xs text-sm">
              Pick a platform, a theme and a product — the engine formats the content
              natively for each channel.
            </p>
          </div>
        )}

        {!loading && result && (
          <div className="scroll-slim max-h-[520px] flex-1 space-y-4 overflow-y-auto pr-2">
            {result.headline && (
              <div>
                <p className="kicker mb-1">Headline hook</p>
                <p className="text-sm font-semibold text-white">{result.headline}</p>
              </div>
            )}
            <div>
              <p className="kicker mb-1">Caption</p>
              <p className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 text-sm leading-relaxed text-zinc-200">
                {result.caption}
              </p>
            </div>
            {result.hashtags?.length > 0 && (
              <div>
                <p className="kicker mb-1">Hashtags</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.hashtags.map((h) => (
                    <span
                      key={h}
                      className="rounded-full bg-teal-400/10 px-2.5 py-1 font-mono text-[10px] text-teal-300"
                    >
                      #{h}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.cta && (
              <div>
                <p className="kicker mb-1">Call to action</p>
                <p className="rounded-lg border border-amber-400/25 bg-amber-400/5 px-3 py-2 text-sm text-amber-200">
                  {result.cta}
                </p>
              </div>
            )}
            {result.imageConcept && (
              <div>
                <p className="kicker mb-1">Image concept</p>
                <p className="text-sm leading-relaxed text-zinc-400">{result.imageConcept}</p>
              </div>
            )}
            {result.videoScript && (
              <div>
                <p className="kicker mb-1">Companion video script</p>
                <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-xs leading-relaxed text-zinc-300">
                  {result.videoScript}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
