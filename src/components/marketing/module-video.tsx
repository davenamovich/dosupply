"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoScriptOutput } from "@/app/api/generate/route";
import { VIDEO_FORMATS, VERIFIED_PRODUCT_EXAMPLES } from "@/lib/demo-content";
import { postJson, ProvenanceBadge } from "./shared";
import { Clapperboard, RefreshCw, AudioLines, ExternalLink, Terminal } from "lucide-react";

type AudioJob = {
  phase: "idle" | "starting" | "rendering" | "done" | "unavailable" | "error";
  jobId?: string;
  pageUrl?: string | null;
  message?: string;
};

function Waveform({ active }: { active: boolean }) {
  const bars = 42;
  return (
    <div className="flex h-12 items-center gap-[3px]" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-amber-500/40 to-amber-300"
          style={{
            height: `${18 + Math.abs(Math.sin(i * 0.7)) * 26}px`,
            animation: active
              ? `amber-blink ${0.6 + ((i * 137) % 9) / 10}s ease-in-out infinite`
              : undefined,
            opacity: active ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

export default function ModuleVideo() {
  const [formatId, setFormatId] = useState<string>("spotlight30");
  const [input, setInput] = useState("Allen-Bradley PanelView HMI terminals");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<VideoScriptOutput | null>(null);

  const [audioJob, setAudioJob] = useState<AudioJob>({ phase: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const format = VIDEO_FORMATS.find((f) => f.id === formatId)!;

  async function generateScript() {
    setLoading(true);
    setError(null);
    setScript(null);
    const { ok, data } = await postJson<{ data: VideoScriptOutput }>("/api/generate", {
      mode: "video",
      input,
      format: formatId,
    });
    if (ok && data.data) setScript(data.data);
    else setError(data.error || "Script generation failed.");
    setLoading(false);
  }

  async function startNarration() {
    setAudioJob({ phase: "starting", message: "Contacting P&R MCP (create_one_minute)…" });
    const { ok, data } = await postJson<{
      jobId?: string;
      pageUrl?: string;
      status?: string;
      error?: string;
      code?: string;
    }>("/api/mcp/audio", { topic: `${input} — ${script?.title || format.title}` });

    if (ok && data.jobId) {
      setAudioJob({ phase: "rendering", jobId: data.jobId, message: "P&R MCP accepted the job — writing and voicing the take…" });
      pollRef.current = setInterval(() => poll(data.jobId!), 15_000);
      poll(data.jobId!);
    } else if (!ok && data.code === "no_key") {
      setAudioJob({
        phase: "unavailable",
        message:
          "P&R MCP audio generation is disabled in this deployment: no server-side API key is configured. The narration script above remains AI-drafted — nothing was faked.",
      });
    } else {
      setAudioJob({ phase: "error", message: data.error || "P&R MCP call failed." });
    }
  }

  async function poll(jobId: string) {
    const { ok, data } = await postJson<{
      status?: string;
      pageUrl?: string;
      error?: string;
    }>("/api/mcp/job", { kind: "one_minute", jobId });
    if (ok && data.status === "done") {
      if (pollRef.current) clearInterval(pollRef.current);
      setAudioJob({ phase: "done", jobId, pageUrl: data.pageUrl, message: "P&R MCP job complete." });
    } else if (ok && data.status === "failed") {
      if (pollRef.current) clearInterval(pollRef.current);
      setAudioJob({ phase: "error", message: "P&R MCP reported the job failed. Credits are refunded on their side." });
    } else if (ok) {
      setAudioJob({ phase: "rendering", jobId, pageUrl: data.pageUrl, message: `Rendering via P&R MCP (status: ${data.status})…` });
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Controls */}
        <div className="space-y-5">
          <div>
            <p className="kicker mb-2">Step 1 — Video format</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {VIDEO_FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormatId(f.id)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    formatId === f.id
                      ? "border-amber-400/60 bg-amber-400/10"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${formatId === f.id ? "text-amber-200" : "text-zinc-200"}`}>
                      {f.title}
                    </span>
                    <span className="font-mono text-[9px] text-zinc-500">{f.duration}</span>
                  </div>
                  <p className="mt-1 text-[10.5px] leading-snug text-zinc-500">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="kicker mb-2">Step 2 — Product</p>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="border-white/10 bg-black/40 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-400/50"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {VERIFIED_PRODUCT_EXAMPLES.slice(2, 6).map((ex) => (
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
            onClick={generateScript}
            disabled={loading || !input.trim()}
            className="w-full bg-amber-400 text-black hover:bg-amber-300 font-semibold"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Writing the script…
              </>
            ) : (
              <>
                <Clapperboard className="mr-2 h-4 w-4" /> Generate {format.title}
              </>
            )}
          </Button>
          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          {/* MCP narration block */}
          {script && (
            <div className="panel rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="kicker">Audio narration via P&amp;R MCP</span>
                <ProvenanceBadge kind="demo">Live tool call</ProvenanceBadge>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Calls the live <code className="text-teal-300">create_one_minute</code> tool
                on bot.plunderandriffle.com — the engine writes and voices a ~60s take.
                Job results are polled honestly; nothing is marked done until the MCP
                confirms.
              </p>
              <Button
                onClick={startNarration}
                disabled={audioJob.phase === "starting" || audioJob.phase === "rendering"}
                variant="outline"
                className="w-full border-teal-400/40 bg-teal-400/10 text-teal-200 hover:bg-teal-400/20 hover:text-teal-100"
              >
                <AudioLines className="mr-2 h-4 w-4" />
                {audioJob.phase === "rendering" || audioJob.phase === "starting"
                  ? "Rendering via P&R MCP…"
                  : "Generate Voiced Take via P&R MCP"}
              </Button>

              {audioJob.phase !== "idle" && audioJob.message && (
                <div
                  className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${
                    audioJob.phase === "error"
                      ? "border-red-400/30 bg-red-400/10 text-red-300"
                      : audioJob.phase === "unavailable"
                        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                        : "border-teal-400/30 bg-teal-400/10 text-teal-200"
                  }`}
                >
                  <span className="font-mono text-[10px] tracking-widest uppercase opacity-80">
                    {audioJob.phase === "rendering" ? "● job running" : audioJob.phase === "done" ? "● job done" : audioJob.phase}
                  </span>
                  <br />
                  {audioJob.message}
                  {audioJob.jobId && (
                    <span className="mt-1 block font-mono text-[10px] text-zinc-500">
                      jobId: {audioJob.jobId} · kind: one_minute
                    </span>
                  )}
                  {audioJob.phase === "done" && audioJob.pageUrl && (
                    <a
                      href={audioJob.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 rounded border border-teal-400/40 bg-teal-400/10 px-2 py-1 text-[11px] font-medium text-teal-200 hover:bg-teal-400/20"
                    >
                      <ExternalLink className="h-3 w-3" /> Open P&R preview page
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cinematic output */}
        <div className="panel-solid relative overflow-hidden rounded-xl">
          {/* letterbox bars */}
          <div className="absolute inset-x-0 top-0 h-3 bg-black z-10" />
          <div className="absolute inset-x-0 bottom-0 h-3 bg-black z-10" />
          <div className="p-5 pt-7 min-h-[420px] flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-500">
                <span className="h-2 w-2 rounded-full bg-red-500 amber-dot" />
                production monitor · {format.aspect}
              </div>
              {script && <ProvenanceBadge kind="ai">AI-drafted script</ProvenanceBadge>}
            </div>

            {loading && (
              <div className="space-y-3">
                <Skeleton className="h-6 w-2/3 bg-white/5" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-4 w-14 bg-white/5" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full bg-white/5" />
                      <Skeleton className="h-4 w-4/5 bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !script && (
              <div className="flex flex-1 flex-col items-center justify-center text-center text-zinc-600">
                <Clapperboard className="mb-3 h-8 w-8 text-zinc-700" />
                <p className="max-w-xs text-sm">
                  One product becomes a full storyboard: scene-by-scene VO, b-roll
                  direction and a continuous narration read.
                </p>
              </div>
            )}

            {!loading && script && (
              <div className="scroll-slim max-h-[560px] flex-1 space-y-4 overflow-y-auto pr-2">
                <div>
                  <h4 className="text-lg font-bold text-white">{script.title}</h4>
                  <p className="mt-1 text-sm text-teal-300/90">{script.logline}</p>
                </div>

                <div className="space-y-2.5">
                  {script.scenes.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-white/10 bg-black/40 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-amber-400/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                          SC {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">{s.time}</span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                        <span className="font-mono text-[10px] tracking-widest text-teal-400/80">VO · </span>
                        {s.vo}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                        <span className="font-mono text-[10px] tracking-widest text-zinc-600">B-ROLL · </span>
                        {s.visual}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                  <p className="kicker mb-2">Continuous narration read</p>
                  <p className="text-sm leading-relaxed text-zinc-300">{script.narration}</p>
                  <div className="mt-3 border-t border-white/5 pt-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="font-mono text-[9px] tracking-widest uppercase text-zinc-600">
                        Narration preview
                      </span>
                      <span className="font-mono text-[9px] text-zinc-600">
                        {audioJob.phase === "done" ? "P&R voiced take ready" : "silent (demo)"}
                      </span>
                    </div>
                    <Waveform active={audioJob.phase === "rendering" || audioJob.phase === "done"} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Honest MCP note */}
      {audioJob.phase === "unavailable" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4">
          <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-xs leading-relaxed text-amber-200/90">
            <strong className="font-semibold">Integrity note:</strong> this deployment
            does not hold a Plunder &amp; Riffle API key, so live video/audio rendering
            is disabled. Video results here are AI-drafted scripts — clearly labeled —
            and nothing is presented as a rendered MP4.
          </p>
        </div>
      )}
    </div>
  );
}
