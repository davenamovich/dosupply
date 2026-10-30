"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { postJson, McpStatusPill } from "./shared";
import PhonePlayer, { loadStudioPhone, type PhoneContent } from "./phone-player";
import { cn } from "@/lib/utils";
import {
  Image as ImageIcon,
  Languages,
  AudioLines,
  KeyRound,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Check,
  Terminal,
  Eye,
  EyeOff,
  Clapperboard,
  Film,
  Play,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Shared types                                                        */
/* ------------------------------------------------------------------ */

type KeyStatus = {
  service: string;
  configured: boolean;
  masked: string | null;
  source: "runtime" | "env" | null;
  setAt: string | null;
};

type StatusData = {
  mcp: { connected: boolean; serverName: string | null; error: string | null };
  keys?: Record<string, { configured: boolean; masked: string | null; source: string | null }>;
};

const FORMATS: { id: string; label: string }[] = [
  { id: "image", label: "Single meme" },
  { id: "carousel", label: "Carousel" },
  { id: "hottake", label: "Hot take" },
  { id: "hybrid", label: "iMessage thread" },
  { id: "confession", label: "Confession" },
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Russian", "Japanese", "Korean", "Chinese", "Arabic", "Hindi",
  "Dutch", "Turkish", "Polish", "Indonesian", "Thai", "Vietnamese",
  "Filipino", "Bengali", "Urdu", "Swedish", "Ukrainian",
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Recursively collect image URLs from an unknown MCP payload. */
function collectImages(value: unknown, depth = 0, seen = new Set<string>()): { url: string; label?: string }[] {
  if (depth > 8 || seen.size > 40) return [];
  if (typeof value === "string") {
    if (/^https:\/\/\S+\.(png|jpe?g|webp|gif)(\?\S*)?$/i.test(value) && !seen.has(value)) {
      seen.add(value);
      return [{ url: value }];
    }
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((v) => collectImages(v, depth + 1, seen));
  }
  if (value && typeof value === "object") {
    const out: { url: string; label?: string }[] = [];
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === "string" && /^https/i.test(obj.url) && /\.(png|jpe?g|webp|gif)(\?\S*)?$/i.test(obj.url) && !seen.has(obj.url)) {
      seen.add(obj.url);
      out.push({ url: obj.url, label: typeof obj.size === "string" ? obj.size : typeof obj.language === "string" ? obj.language : undefined });
    }
    for (const v of Object.values(obj)) out.push(...collectImages(v, depth + 1, seen));
    return out;
  }
  return [];
}

/** Collect temp-page preview URLs. */
function collectPageUrls(value: unknown, depth = 0, seen = new Set<string>()): string[] {
  if (depth > 8 || seen.size > 20) return [];
  if (Array.isArray(value)) return value.flatMap((v) => collectPageUrls(v, depth + 1, seen));
  if (value && typeof value === "object") {
    const out: string[] = [];
    const obj = value as Record<string, unknown>;
    if (typeof obj.pageUrl === "string" && obj.pageUrl.startsWith("http") && !seen.has(obj.pageUrl)) {
      seen.add(obj.pageUrl);
      out.push(obj.pageUrl);
    }
    for (const v of Object.values(obj)) out.push(...collectPageUrls(v, depth + 1, seen));
    return out;
  }
  return [];
}

function stringifyPayload(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/* ------------------------------------------------------------------ */
/* Keys hook                                                           */
/* ------------------------------------------------------------------ */

function useKeys() {
  const [keys, setKeys] = useState<KeyStatus[] | null>(null);
  const refresh = useCallback(() => {
    fetch("/api/keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys ?? []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { keys, refresh };
}

function KeyCard({ status, icon }: { status: KeyStatus | undefined; icon: React.ReactNode }) {
  const configured = status?.configured;
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        configured ? "border-teal-400/30 bg-teal-400/5" : "border-white/10 bg-black/30"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          {icon}
          {status?.service === "plunder_riffle" ? "Plunder & Riffle MCP" : "Exa Search API"}
        </span>
        <span
          className={cn(
            "rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase",
            configured ? "border-teal-400/40 text-teal-300" : "border-amber-400/40 text-amber-300"
          )}
        >
          {configured ? "connected" : "not set"}
        </span>
      </div>
      <p className="mt-2 font-mono text-xs text-zinc-500">
        {configured ? status?.masked : "paste a key below to unlock live calls"}
      </p>
      {configured && status?.source && (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-zinc-600">
          source: {status.source}
          {status.setAt ? ` · set ${new Date(status.setAt).toLocaleDateString()}` : ""}
        </p>
      )}
    </div>
  );
}

/* ================================================================== */
/* Main component                                                      */
/* ================================================================== */

const STUDIO_TABS = ["creative", "multilang", "video", "audio", "setup"] as const;

export default function PrStudio() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [tab, setTab] = useState<string>("creative");
  const { keys, refresh: refreshKeys } = useKeys();

  /* The studio phone — the in-page delivery surface for engine assets. */
  const [phone, setPhone] = useState<PhoneContent | null>(null);
  const phoneRailRef = useRef<HTMLDivElement>(null);
  const [videoRequest, setVideoRequest] = useState<{ topic: string; nonce: number } | null>(null);
  const [creativeRequest, setCreativeRequest] = useState<{ input: string; nonce: number } | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: StatusData) => setStatus(d))
      .catch(() => {});
  }, []);

  /* Deep-link channel: window.dispatchEvent(new CustomEvent("pr-studio:tab", { detail: "video" })) */
  useEffect(() => {
    function onTabRequest(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && (STUDIO_TABS as readonly string[]).includes(detail)) {
        setTab(detail);
      }
    }
    window.addEventListener("pr-studio:tab", onTabRequest);
    return () => window.removeEventListener("pr-studio:tab", onTabRequest);
  }, []);

  /* Studio phone channel — any tab (or the engine console) can push an asset. */
  useEffect(() => {
    function onPhoneLoad(e: Event) {
      const detail = (e as CustomEvent<PhoneContent>).detail;
      if (!detail || typeof detail !== "object") return;
      setPhone(detail);
      // On narrow screens the phone lives below the tabs — bring it into view.
      if (window.innerWidth < 1280) {
        window.setTimeout(
          () => phoneRailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
          150
        );
      }
    }
    window.addEventListener("studio-phone:load", onPhoneLoad);
    return () => window.removeEventListener("studio-phone:load", onPhoneLoad);
  }, []);

  /* Quick-create commands from the Live Demo engine console. */
  useEffect(() => {
    function onQuickVideo(e: Event) {
      const detail = (e as CustomEvent<{ topic?: string }>).detail;
      setTab("video");
      if (detail?.topic) setVideoRequest({ topic: detail.topic, nonce: Date.now() });
    }
    function onQuickCreative(e: Event) {
      const detail = (e as CustomEvent<{ input?: string }>).detail;
      setTab("creative");
      if (detail?.input) setCreativeRequest({ input: detail.input, nonce: Date.now() });
    }
    window.addEventListener("pr-studio:quick-video", onQuickVideo);
    window.addEventListener("pr-studio:quick-creative", onQuickCreative);
    return () => {
      window.removeEventListener("pr-studio:quick-video", onQuickVideo);
      window.removeEventListener("pr-studio:quick-creative", onQuickCreative);
    };
  }, []);

  const mcpLive = status?.mcp.connected ?? false;

  return (
    <section id="pr-studio" className="relative py-20 sm:py-24">
      <div className="absolute inset-0 atmosphere-teal pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="kicker">The P&amp;R Studio</span>
            <McpStatusPill />
            {status?.keys?.plunder_riffle?.configured ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/40 bg-teal-400/10 px-3 py-1 font-mono text-[10px] tracking-widest uppercase text-teal-300">
                <KeyRound className="h-3 w-3" /> BYOK active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-mono text-[10px] tracking-widest uppercase text-amber-300">
                <KeyRound className="h-3 w-3" /> BYOK: demo mode
              </span>
            )}
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            The multimedia studio,{" "}
            <span className="text-amber-glow">running on real MCP calls.</span>
          </h2>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            Ad creatives, native multilanguage campaigns, a ~60s phone-demo
            video and a voiced take — all generated server-side through the
            Plunder &amp; Riffle MCP. Every result is the engine&apos;s actual output,
            with its temp-page preview link. If a call can&apos;t complete, you see
            the honest error — never a fake success message.
          </p>
        </div>

        {/* Studio: tabs + results on the left, the beveled delivery phone on the right */}
        <div className="mx-auto mt-10 grid max-w-6xl gap-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <Tabs value={tab} onValueChange={setTab} className="w-full min-w-0">
            <TabsList className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/50 p-1 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { id: "creative", label: "Ad Creative", icon: ImageIcon },
                { id: "multilang", label: "Multilang", icon: Languages },
                { id: "video", label: "Video", icon: Clapperboard },
                { id: "audio", label: "Audio Take", icon: AudioLines },
                { id: "setup", label: "BYOK Setup", icon: KeyRound },
              ].map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="rounded-lg font-mono text-[10px] uppercase tracking-widest text-zinc-400 data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-200"
                >
                  <t.icon className="mr-1.5 h-3.5 w-3.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="creative" className="mt-6">
              <CreativeTab mcpLive={mcpLive} request={creativeRequest} />
            </TabsContent>
            <TabsContent value="multilang" className="mt-6">
              <MultilangTab mcpLive={mcpLive} />
            </TabsContent>
            <TabsContent value="video" className="mt-6">
              <VideoTab mcpLive={mcpLive} request={videoRequest} />
            </TabsContent>
            <TabsContent value="audio" className="mt-6">
              <AudioTab mcpLive={mcpLive} />
            </TabsContent>
            <TabsContent value="setup" className="mt-6">
              <SetupTab keys={keys} refreshKeys={refreshKeys} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* Tab 1 — Ad Creative (generate_ad_creative / shop)                   */
/* ================================================================== */

function CreativeTab({ mcpLive }: { mcpLive: boolean }) {
  const [input, setInput] = useState("PanelView Plus 1000 HMI terminals just restocked");
  const [format, setFormat] = useState("carousel");
  const [kind, setKind] = useState<"creative" | "shop">("creative");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    const { ok, data } = await postJson<Record<string, unknown>>("/api/mcp/creative", {
      input,
      kind,
      format,
    });
    if (ok && data.mode === "live") setResult(data);
    else setError((data.error as string) || "The P&R MCP call failed — honest error, no fake success.");
    setLoading(false);
  }

  const images = result ? collectImages(result) : [];
  const pageUrls = result ? collectPageUrls(result) : [];

  return (
    <div className="panel rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Product or brief…"
            className="h-11 border-white/15 bg-black/50 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-400/50"
            aria-label="Creative brief"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={cn(
                  "rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  format === f.id
                    ? "border-amber-400/60 bg-amber-400/10 text-amber-200"
                    : "border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:w-44">
          <Button
            onClick={generate}
            disabled={loading || !input.trim()}
            className="h-11 bg-teal-400 font-bold text-black hover:bg-teal-300"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            <span className="ml-2">Generate</span>
          </Button>
          <div className="flex rounded-lg border border-white/10 p-0.5">
            {(["creative", "shop"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors",
                  kind === k ? "bg-white/10 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                )}
                title={k === "shop" ? "shop tool — researched copy + creatives from a product link/description" : "generate_ad_creative — one creative from a brief"}
              >
                {k === "creative" ? "ad_creative" : "shop pack"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 font-mono text-[10px] text-zinc-600">
        tool: {kind === "shop" ? "shop" : "generate_ad_creative"} · returns the MCP&apos;s temp-page
        preview + PNG assets + post copy exactly as produced
        {!mcpLive && " · BYOK key not set yet (see BYOK Setup)"}
      </p>

      {loading && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl bg-white/5" />
          ))}
        </div>
      )}

      {error && (
        <p className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-5 rounded-xl border border-teal-400/25 bg-teal-400/5 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-300" />
            <span className="text-sm font-semibold text-teal-200">P&amp;R MCP responded — real output</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-600">
              meme-engine · {new Date().toLocaleTimeString()}
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
                    alt={`P&R MCP generated creative ${i + 1}`}
                    className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">No PNG assets in this run — check the raw payload below.</p>
          )}
          {pageUrls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {pageUrls.slice(0, 3).map((u, i) => (
                <a
                  key={i}
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-400/20"
                >
                  <ExternalLink className="h-3 w-3" /> Temp-page preview {pageUrls.length > 1 ? i + 1 : ""}
                </a>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
          >
            {showRaw ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showRaw ? "hide" : "show"} raw MCP payload
          </button>
          {showRaw && (
            <pre className="scroll-slim mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-zinc-400">
              {stringifyPayload(result)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Tab 2 — Multilanguage (generate_multilanguage_ads)                  */
/* ================================================================== */

function MultilangTab({ mcpLive }: { mcpLive: boolean }) {
  const [input, setInput] = useState("DO Supply: hard-to-find automation parts, shipped fast");
  const [format, setFormat] = useState("image");
  const [langs, setLangs] = useState<string[]>(["English", "Spanish", "German"]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  function toggleLang(l: string) {
    setLangs((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : prev.length >= 6 ? prev : [...prev, l]
    );
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    const { ok, data } = await postJson<Record<string, unknown>>("/api/mcp/multilang", {
      input,
      languages: langs,
      format,
    });
    if (ok && data.mode === "live") setResult(data);
    else setError((data.error as string) || "The multilanguage call failed.");
    setLoading(false);
  }

  const images = result ? collectImages(result) : [];
  const pageUrls = result ? collectPageUrls(result) : [];

  return (
    <div className="panel rounded-2xl p-5 sm:p-6">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Product or campaign brief…"
        className="h-11 border-white/15 bg-black/50 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-400/50"
        aria-label="Multilanguage brief"
      />

      <p className="kicker mb-2 mt-4">
        Languages — pick up to 6 (generated natively per language, not translated) · selected {langs.length}/6
      </p>
      <div className="flex flex-wrap gap-1.5">
        {LANGUAGES.map((l) => (
          <button
            key={l}
            onClick={() => toggleLang(l)}
            className={cn(
              "rounded border px-2 py-1 font-mono text-[10px] transition-colors",
              langs.includes(l)
                ? "border-teal-400/60 bg-teal-400/10 text-teal-200"
                : "border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300"
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={cn(
                "rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                format === f.id
                  ? "border-amber-400/60 bg-amber-400/10 text-amber-200"
                  : "border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button
          onClick={generate}
          disabled={loading || langs.length === 0 || !input.trim()}
          className="h-11 bg-teal-400 font-bold text-black hover:bg-teal-300"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          <span className="ml-2">Generate {langs.length} Languages</span>
        </Button>
      </div>

      <p className="mt-3 font-mono text-[10px] text-zinc-600">
        tool: generate_multilanguage_ads · one result per language, failures reported per
        language{!mcpLive && " · BYOK key not set yet (see BYOK Setup)"}
      </p>

      {loading && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {langs.map((l) => (
            <div key={l} className="space-y-2">
              <Skeleton className="h-40 rounded-xl bg-white/5" />
              <p className="text-center font-mono text-[10px] text-zinc-500">{l} · rendering…</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-5 rounded-xl border border-teal-400/25 bg-teal-400/5 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-300" />
            <span className="text-sm font-semibold text-teal-200">
              Multilanguage batch returned — {langs.join(", ")}
            </span>
          </div>
          {images.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {images.slice(0, 12).map((img, i) => (
                <a
                  key={i}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40"
                >
                  <img
                    src={img.url}
                    alt={`P&R MCP multilanguage creative ${i + 1}${img.label ? ` — ${img.label}` : ""}`}
                    className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  {img.label && (
                    <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] uppercase text-zinc-200">
                      {img.label}
                    </span>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">
              No PNG assets detected in the payload — open the raw payload or preview links.
            </p>
          )}
          {pageUrls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {pageUrls.slice(0, 6).map((u, i) => (
                <a
                  key={i}
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-400/20"
                >
                  <ExternalLink className="h-3 w-3" /> Preview {i + 1}
                </a>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
          >
            {showRaw ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showRaw ? "hide" : "show"} raw MCP payload
          </button>
          {showRaw && (
            <pre className="scroll-slim mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-zinc-400">
              {stringifyPayload(result)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Tab 3 — Video Demo (create_phone_demo + get_job_status polling)     */
/* ================================================================== */

type VideoState = {
  jobId: string | null;
  status: string | null;
  pageUrl: string | null;
  error: string | null;
};

type Mp4State = {
  jobId: string | null;
  status: string | null;
  mp4Url: string | null;
  error: string | null;
};

function VideoTab({ mcpLive }: { mcpLive: boolean }) {
  const [topic, setTopic] = useState(
    "Why maintenance teams wait weeks for hard-to-find automation parts — and how DO Supply fixes it"
  );
  const [shape, setShape] = useState<"mixed" | "ranked">("mixed");
  const [starting, setStarting] = useState(false);
  const [video, setVideo] = useState<VideoState | null>(null);
  const [mp4, setMp4] = useState<Mp4State | null>(null);
  const [mp4Busy, setMp4Busy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mp4PollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopMp4Polling = useCallback(() => {
    if (mp4PollRef.current) {
      clearInterval(mp4PollRef.current);
      mp4PollRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      stopPolling();
      stopMp4Polling();
    },
    [stopPolling, stopMp4Polling]
  );

  async function start() {
    setStarting(true);
    setMp4(null);
    setVideo({ jobId: null, status: "starting", pageUrl: null, error: null });
    const { ok, data } = await postJson<{
      mode?: string;
      jobId?: string | null;
      status?: string;
      pageUrl?: string | null;
      error?: string;
      code?: string;
    }>("/api/mcp/video", { topic, shape });
    if (ok && data.mode === "live") {
      const st: VideoState = {
        jobId: data.jobId ?? null,
        status: data.status ?? "queued",
        pageUrl: data.pageUrl ?? null,
        error: null,
      };
      setVideo(st);
      if (st.jobId) startPolling(st.jobId);
    } else {
      setVideo({
        jobId: null,
        status: null,
        pageUrl: null,
        error: (data.error as string) || "create_phone_demo failed.",
      });
    }
    setStarting(false);
  }

  function startPolling(jobId: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const { ok, data } = await postJson<{
        status?: string;
        pageUrl?: string | null;
        error?: string | null;
      }>("/api/mcp/job", { kind: "sitdown", jobId });
      if (!ok) return; // transient — keep polling
      setVideo((prev) =>
        prev
          ? {
              ...prev,
              status: data.status ?? prev.status,
              pageUrl: data.pageUrl ?? prev.pageUrl,
              error: data.error ?? prev.error,
            }
          : prev
      );
      if (data.status === "done" || data.status === "failed") stopPolling();
    }, 15_000);
  }

  /** Human approval step — clicking IS the approval request_mp4 requires. */
  async function requestMp4() {
    if (!video?.pageUrl) return;
    setMp4Busy(true);
    setMp4({ jobId: null, status: "starting", mp4Url: null, error: null });
    const { ok, data } = await postJson<{
      mode?: string;
      jobId?: string | null;
      status?: string;
      mp4Url?: string | null;
      error?: string;
      code?: string;
    }>("/api/mcp/mp4", { pageUrl: video.pageUrl });
    if (ok && data.mode === "live") {
      const st: Mp4State = {
        jobId: data.jobId ?? null,
        status: data.status ?? "queued",
        mp4Url: data.mp4Url ?? null,
        error: null,
      };
      setMp4(st);
      if (st.jobId && !st.mp4Url) startMp4Polling(st.jobId);
    } else {
      setMp4({
        jobId: null,
        status: null,
        mp4Url: null,
        error: (data.error as string) || "request_mp4 failed.",
      });
    }
    setMp4Busy(false);
  }

  function startMp4Polling(jobId: string) {
    stopMp4Polling();
    mp4PollRef.current = setInterval(async () => {
      const { ok, data } = await postJson<{
        status?: string;
        mp4Url?: string | null;
        error?: string | null;
      }>("/api/mcp/job", { kind: "mp4", jobId });
      if (!ok) return; // transient — keep polling
      setMp4((prev) =>
        prev
          ? {
              ...prev,
              status: data.status ?? prev.status,
              mp4Url: data.mp4Url ?? prev.mp4Url,
              error: data.error ?? prev.error,
            }
          : prev
      );
      if (data.status === "done" || data.status === "failed") stopMp4Polling();
    }, 15_000);
  }

  const done = video?.status === "done";
  const failed = video?.status === "failed";
  const mp4Done = mp4?.status === "done" || !!mp4?.mp4Url;
  const mp4Failed = mp4?.status === "failed";

  return (
    <div className="panel rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What should the ~60s video be about?"
          className="h-11 flex-1 border-white/15 bg-black/50 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-400/50"
          aria-label="Video demo topic"
        />
        <Button
          onClick={start}
          disabled={starting || !topic.trim() || (video?.jobId != null && !done && !failed)}
          className="h-11 bg-teal-400 font-bold text-black hover:bg-teal-300"
        >
          {starting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />}
          <span className="ml-2">Start Video Demo</span>
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">cut:</span>
        {(["mixed", "ranked"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setShape(s)}
            className={cn(
              "rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
              shape === s
                ? "border-amber-400/60 bg-amber-400/10 text-amber-200"
                : "border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300"
            )}
            title={
              s === "mixed"
                ? "memes, a ranked list or a carousel land on the host's phone"
                : "a ranked list, read out by the host"
            }
          >
            {s}
          </button>
        ))}
      </div>

      <p className="mt-3 font-mono text-[10px] text-zinc-600">
        tool: create_phone_demo → get_job_status (kind sitdown) polled every 15s ·
        the engine returns a captioned preview page; the MP4 renders only after
        you approve it{!mcpLive && " · BYOK key not set yet (see BYOK Setup)"}
      </p>

      {video && (
        <div
          className={cn(
            "mt-5 rounded-xl border p-4",
            failed ? "border-red-400/30 bg-red-400/5" : done ? "border-teal-400/25 bg-teal-400/5" : "border-white/10 bg-black/30"
          )}
        >
          {video.error ? (
            <p className="text-sm text-red-300">{video.error}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    done ? "bg-teal-400" : failed ? "bg-red-400" : "bg-amber-400 amber-dot"
                  )}
                />
                <span className="font-mono text-xs uppercase tracking-widest text-zinc-300">
                  video job: {video.status ?? "unknown"}
                </span>
                {video.jobId && (
                  <span className="font-mono text-[10px] text-zinc-600">jobId: {video.jobId}</span>
                )}
              </div>
              {(video.status === "rendering" || video.status === "queued" || video.status === "starting") && (
                <p className="mt-2 text-xs text-amber-200/80">
                  The engine is writing, voicing and shooting the ~60s phone demo — polling
                  every 15s. Usually done in 1–2 minutes; the link below goes live as soon as
                  the preview page exists.
                </p>
              )}

              {/* THE video link — the point of this tab */}
              {video.pageUrl && (
                <div className="mt-4">
                  <a
                    href={video.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-5 py-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-400/20 sm:text-base"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {done ? "Watch the video — finished preview" : "Watch the video — live preview"}
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                  </a>
                  <p className="mt-1.5 font-mono text-[10px] text-zinc-600">
                    opens the engine&apos;s captioned preview page in a new tab
                  </p>
                </div>
              )}

              {done && video.pageUrl && (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3.5">
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Happy with the preview? Approving it unlocks an MP4 render — the
                    engine&apos;s one explicit human-approval step. We never fire it
                    automatically.
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                    <Button
                      onClick={requestMp4}
                      disabled={mp4Busy || (mp4 != null && !mp4Done && !mp4Failed)}
                      className="h-9 bg-teal-400 font-bold text-black hover:bg-teal-300"
                    >
                      {mp4Busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Film className="h-3.5 w-3.5" />}
                      <span className="ml-1.5">Approve &amp; render MP4</span>
                    </Button>
                    {mp4 && !mp4.error && (
                      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                        mp4 job: {mp4.status ?? "unknown"}
                        {mp4.jobId ? ` · ${mp4.jobId}` : ""}
                      </span>
                    )}
                  </div>
                  {mp4?.error && <p className="mt-2 text-xs text-red-300">{mp4.error}</p>}
                  {mp4?.status === "rendering" && (
                    <p className="mt-2 text-xs text-amber-200/80">
                      Rendering the MP4 — usually 1–3 minutes; polling every 15s.
                    </p>
                  )}
                  {mp4Done && mp4?.mp4Url && (
                    <a
                      href={mp4.mp4Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-teal-400/40 bg-teal-400/10 px-4 py-2.5 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-400/20"
                    >
                      <Film className="h-4 w-4" /> Open the rendered MP4
                      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Tab 4 — Audio Take (create_one_minute + get_job_status polling)     */
/* ================================================================== */

type AudioState = {
  jobId: string | null;
  status: string | null;
  pageUrl: string | null;
  mp4Url: string | null;
  error: string | null;
};

function AudioTab({ mcpLive }: { mcpLive: boolean }) {
  const [topic, setTopic] = useState("Why downtime waits are the real cost of legacy automation parts");
  const [starting, setStarting] = useState(false);
  const [audio, setAudio] = useState<AudioState | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  async function start() {
    setStarting(true);
    setAudio({ jobId: null, status: "starting", pageUrl: null, mp4Url: null, error: null });
    const { ok, data } = await postJson<{
      mode?: string;
      jobId?: string | null;
      status?: string;
      pageUrl?: string | null;
      error?: string;
      code?: string;
    }>("/api/mcp/audio", { topic });
    if (ok && data.mode === "live") {
      const st: AudioState = {
        jobId: data.jobId ?? null,
        status: data.status ?? "queued",
        pageUrl: data.pageUrl ?? null,
        mp4Url: null,
        error: null,
      };
      setAudio(st);
      if (st.jobId) startPolling(st.jobId);
    } else {
      setAudio({
        jobId: null,
        status: null,
        pageUrl: null,
        mp4Url: null,
        error: (data.error as string) || "create_one_minute failed.",
      });
    }
    setStarting(false);
  }

  function startPolling(jobId: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const { ok, data } = await postJson<{
        status?: string;
        pageUrl?: string | null;
        mp4Url?: string | null;
        error?: string | null;
      }>("/api/mcp/job", { kind: "one_minute", jobId });
      if (!ok) return; // transient — keep polling
      setAudio((prev) =>
        prev
          ? {
              ...prev,
              status: data.status ?? prev.status,
              pageUrl: data.pageUrl ?? prev.pageUrl,
              mp4Url: data.mp4Url ?? prev.mp4Url,
              error: data.error ?? prev.error,
            }
          : prev
      );
      if (data.status === "done" || data.status === "failed") stopPolling();
    }, 15_000);
  }

  const done = audio?.status === "done";
  const failed = audio?.status === "failed";

  return (
    <div className="panel rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic for the ~60s voiced take…"
          className="h-11 flex-1 border-white/15 bg-black/50 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-400/50"
          aria-label="Audio take topic"
        />
        <Button
          onClick={start}
          disabled={starting || !topic.trim() || (audio?.jobId != null && !done && !failed)}
          className="h-11 bg-teal-400 font-bold text-black hover:bg-teal-300"
        >
          {starting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}
          <span className="ml-2">Start ~60s Take</span>
        </Button>
      </div>

      <p className="mt-3 font-mono text-[10px] text-zinc-600">
        tool: create_one_minute → get_job_status polled every 15s · the engine returns a
        captioned page preview; an MP4 is a separate approval-gated step we never
        auto-trigger{!mcpLive && " · BYOK key not set yet (see BYOK Setup)"}
      </p>

      {audio && (
        <div
          className={cn(
            "mt-5 rounded-xl border p-4",
            failed ? "border-red-400/30 bg-red-400/5" : done ? "border-teal-400/25 bg-teal-400/5" : "border-white/10 bg-black/30"
          )}
        >
          {audio.error ? (
            <p className="text-sm text-red-300">{audio.error}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    done ? "bg-teal-400" : failed ? "bg-red-400" : "bg-amber-400 amber-dot"
                  )}
                />
                <span className="font-mono text-xs uppercase tracking-widest text-zinc-300">
                  job status: {audio.status ?? "unknown"}
                </span>
                {audio.jobId && (
                  <span className="font-mono text-[10px] text-zinc-600">jobId: {audio.jobId}</span>
                )}
              </div>
              {(audio.status === "rendering" || audio.status === "queued" || audio.status === "starting") && (
                <p className="mt-2 text-xs text-amber-200/80">
                  The engine is writing and voicing the take — polling every 15s. This can take
                  a few minutes; the page keeps polling until done or failed.
                </p>
              )}
              {audio.pageUrl && (
                <a
                  href={audio.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3.5 py-2 text-sm font-medium text-amber-200 hover:bg-amber-400/20"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {done ? "Open the finished captioned page" : "Open the in-progress preview page"}
                </a>
              )}
              {audio.mp4Url && (
                <a
                  href={audio.mp4Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-teal-400/40 bg-teal-400/10 px-3.5 py-2 text-sm font-medium text-teal-200 hover:bg-teal-400/20"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Rendered MP4 (as returned by the engine)
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Tab 5 — BYOK Setup                                                  */
/* ================================================================== */

function SetupTab({
  keys,
  refreshKeys,
}: {
  keys: KeyStatus[] | null;
  refreshKeys: () => void;
}) {
  const [passcode, setPasscode] = useState("");
  const [prKey, setPrKey] = useState("");
  const [exaKey, setExaKey] = useState("");
  const [showKeys, setShowKeys] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const prStatus = keys?.find((k) => k.service === "plunder_riffle");
  const exaStatus = keys?.find((k) => k.service === "exa");

  async function save(which: "plunder_riffle" | "exa") {
    setBusy(true);
    setMsg(null);
    const key = which === "plunder_riffle" ? prKey.trim() : exaKey.trim();
    const { ok, data } = await postJson<{
      saved?: Record<string, { saved: boolean; probe?: string; account?: string }>;
      error?: string;
    }>("/api/keys", {
      passcode,
      keys: which === "plunder_riffle" ? { plunder_riffle: key } : { exa: key },
    });
    if (ok) {
      const saved = data.saved?.[which];
      const account = saved?.account ? ` Account: ${saved.account}` : "";
      setMsg({
        kind: "ok",
        text:
          which === "plunder_riffle"
            ? `P&R key saved and verified against bot.plunderandriffle.com.${account} Live multimedia calls are now enabled.`
            : `Exa key saved (${saved?.probe ?? "saved"}). Research now runs through api.exa.ai.`,
      });
      if (which === "plunder_riffle") setPrKey("");
      else setExaKey("");
      refreshKeys();
      fetch("/api/status").catch(() => {});
    } else {
      setMsg({ kind: "err", text: data.error || "Saving the key failed." });
    }
    setBusy(false);
  }

  async function clearKey(which: "plunder_riffle" | "exa") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, service: which }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: d.error || "Clearing the key failed." });
        setBusy(false);
        return;
      }
      setMsg({ kind: "ok", text: "Key cleared from the runtime store." });
      refreshKeys();
    } catch {
      setMsg({ kind: "err", text: "Network error while clearing the key." });
    }
    setBusy(false);
  }

  return (
    <div className="panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4">
        <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <p className="text-xs leading-relaxed text-amber-100/80">
          <strong className="font-semibold">BYOK — bring your own key.</strong> Keys are
          stored server-side only (a 0600 file on this machine) and never sent back to the
          browser — the UI shows a masked preview only. P&amp;R keys are verified with a
          real <code className="font-mono">tools/list</code> probe before being saved. Demo
          deployment passcode: <code className="font-mono text-amber-200">demo</code>{" "}
          (override with the ADMIN_PASSCODE env var).
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <KeyCard status={prStatus} icon={<Terminal className="h-4 w-4 text-teal-300" />} />
        <KeyCard status={exaStatus} icon={<Languages className="h-4 w-4 text-teal-300" />} />
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="kicker mb-1.5 block" htmlFor="setup-passcode">
            Setup passcode
          </label>
          <Input
            id="setup-passcode"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="demo"
            className="max-w-xs border-white/15 bg-black/50 font-mono text-sm text-zinc-100 placeholder:text-zinc-600"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              {
                id: "plunder_riffle" as const,
                label: "Plunder & Riffle API key",
                value: prKey,
                set: setPrKey,
                placeholder: "pr_live_…",
                hint: "Enables generate_ad_creative, shop, generate_multilanguage_ads, create_one_minute and MP4 jobs.",
              },
              {
                id: "exa" as const,
                label: "Exa API key",
                value: exaKey,
                set: setExaKey,
                placeholder: "uuid-…",
                hint: "Enables Exa neural web research (api.exa.ai) for grounded SEO + content. Without it, the built-in SDK web search is used.",
              },
            ] as const
          ).map((f) => (
            <div key={f.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
              <label className="kicker mb-1.5 block" htmlFor={`key-${f.id}`}>
                {f.label}
              </label>
              <div className="flex gap-2">
                <Input
                  id={`key-${f.id}`}
                  type={showKeys ? "text" : "password"}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="border-white/15 bg-black/50 font-mono text-sm text-zinc-100 placeholder:text-zinc-600"
                  autoComplete="off"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 border-white/15"
                  onClick={() => setShowKeys(!showKeys)}
                  aria-label={showKeys ? "Hide keys" : "Show keys"}
                >
                  {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{f.hint}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={() => save(f.id)}
                  disabled={busy || !passcode || f.value.trim().length <= 8}
                  className="h-9 bg-amber-400 text-black hover:bg-amber-300"
                >
                  {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span className="ml-1.5">Save &amp; verify</span>
                </Button>
                {keys?.find((k) => k.service === f.id)?.configured && (
                  <Button
                    variant="outline"
                    onClick={() => clearKey(f.id)}
                    disabled={busy || !passcode}
                    className="h-9 border-red-400/30 text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="ml-1.5">Clear</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {msg && (
          <p
            className={cn(
              "rounded-lg border px-4 py-3 text-sm",
              msg.kind === "ok"
                ? "border-teal-400/30 bg-teal-400/10 text-teal-200"
                : "border-red-400/30 bg-red-400/10 text-red-300"
            )}
          >
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}
