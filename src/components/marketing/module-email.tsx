"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailOutput } from "@/app/api/generate/route";
import { EMAIL_CAMPAIGNS, VERIFIED_PRODUCT_EXAMPLES } from "@/lib/demo-content";
import { postJson, ProvenanceBadge } from "./shared";
import { Mail, RefreshCw, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ModuleEmail() {
  const [campaign, setCampaign] = useState<string>("announcement");
  const [input, setInput] = useState("Allen-Bradley CompactLogix");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EmailOutput | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const { toast } = useToast();

  async function generate() {
    setLoading(true);
    setError(null);
    const { ok, data } = await postJson<{ data: EmailOutput }>("/api/generate", {
      mode: "email",
      input,
      campaign,
    });
    if (ok && data.data) setResult(data.data);
    else setError(data.error || "Generation failed.");
    setLoading(false);
  }

  function copySubject(s: string, i: number) {
    navigator.clipboard.writeText(s).then(() => {
      setCopied(i);
      toast({ title: "Subject line copied", description: s });
      setTimeout(() => setCopied(null), 1600);
    });
  }

  const campaignMeta = EMAIL_CAMPAIGNS.find((c) => c.id === campaign)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      {/* Controls */}
      <div className="space-y-5">
        <div>
          <p className="kicker mb-2">Step 1 — Campaign type</p>
          <div className="grid gap-2">
            {EMAIL_CAMPAIGNS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCampaign(c.id)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  campaign === c.id
                    ? "border-amber-400/60 bg-amber-400/10"
                    : "border-white/10 bg-white/5 hover:border-white/25"
                }`}
              >
                <span className={`text-xs font-semibold ${campaign === c.id ? "text-amber-200" : "text-zinc-200"}`}>
                  {c.title}
                </span>
                <p className="mt-0.5 text-[10.5px] text-zinc-500">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="kicker mb-2">Step 2 — Product or topic</p>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-400/50"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VERIFIED_PRODUCT_EXAMPLES.slice(0, 5).map((ex) => (
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
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Drafting campaign…
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" /> Generate {campaignMeta.title}
            </>
          )}
        </Button>
        {error && (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}
      </div>

      {/* Output: inbox preview */}
      <div className="panel-solid rounded-xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-500">
            inbox preview · demo@dosupply-demo.com
          </span>
          {result && <ProvenanceBadge kind="ai" />}
        </div>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full bg-white/5" />
            <Skeleton className="h-40 w-full bg-white/5" />
          </div>
        )}

        {!loading && !result && (
          <div className="flex min-h-[340px] flex-col items-center justify-center text-center text-zinc-600">
            <Mail className="mb-3 h-8 w-8 text-zinc-700" />
            <p className="max-w-xs text-sm">
              Subject line variants, preview text, full body copy and a CTA — rendered
              in a live inbox frame.
            </p>
          </div>
        )}

        {!loading && result && (
          <div className="scroll-slim max-h-[560px] space-y-4 overflow-y-auto pr-2">
            {/* subjects */}
            <div>
              <p className="kicker mb-2">Subject line variants — A/B/C</p>
              <div className="space-y-1.5">
                {result.subjects.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => copySubject(s, i)}
                    className="group flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left text-sm text-zinc-200 hover:border-amber-400/40 transition-colors"
                  >
                    <span className="truncate">{s}</span>
                    <span className="flex items-center gap-2 font-mono text-[9px] text-zinc-600">
                      {s.length}ch
                      {copied === i ? (
                        <Check className="h-3.5 w-3.5 text-teal-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* email frame */}
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white text-black">
              <div className="border-b border-black/10 bg-zinc-100 px-4 py-2.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-600">
                  <span className="font-semibold text-zinc-800">DO Supply</span>
                  <span className="font-mono">to: customer@plantco.example</span>
                </div>
                <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900">
                  {result.subjects[0] || "(subject)"}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {result.previewText || "(preview text)"}
                </p>
              </div>
              <div className="space-y-3 px-5 py-5 text-[13px] leading-relaxed text-zinc-800">
                <p className="font-medium">{result.greeting}</p>
                {result.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {result.bullets.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5">
                    {result.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
                <p>{result.closing}</p>
                <div className="pt-2">
                  <span className="inline-block rounded-md bg-amber-500 px-5 py-2.5 text-sm font-bold text-black">
                    {result.cta} →
                  </span>
                </div>
                <p className="pt-3 text-[10px] leading-relaxed text-zinc-400">
                  AI-drafted campaign concept for demonstration. Send only with verified
                  product details and a permissioned audience list.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
