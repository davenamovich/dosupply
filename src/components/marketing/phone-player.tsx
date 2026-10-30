"use client";

import { useEffect, useRef } from "react";
import { Clapperboard, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type PhoneContent =
  | { kind: "video"; src: string; label?: string }
  | { kind: "image"; src: string; label?: string }
  | { kind: "page"; src: string; label?: string }
  | { kind: "placeholder"; title: string; body: string; tone?: "idle" | "working" };

/**
 * Dispatch an asset to the studio phone from anywhere on the page:
 *   loadStudioPhone({ kind: "video", src: mp4Url, label: "…" })
 * The PrStudio section listens and plays it in the beveled phone.
 */
export function loadStudioPhone(content: PhoneContent) {
  window.dispatchEvent(
    new CustomEvent<PhoneContent>("studio-phone:load", { detail: content })
  );
}

/**
 * Beveled phone delivery surface — assets play INSIDE the page so nobody
 * has to click away to bot.plunderandriffle.com. Videos stream through
 * /api/mcp/media (the engine returns HTML pages that can't be iframed;
 * the proxy extracts and streams the real media, Range included).
 */
export default function PhonePlayer({
  content,
  className,
}: {
  content: PhoneContent | null;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Autoplay policies: try to play on load and whenever the source changes.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {
      /* browser refused — controls are visible, user can press play */
    });
  }, [content]);

  const label =
    content &&
    (content.kind === "video" || content.kind === "image" || content.kind === "page")
      ? content.label
      : undefined;

  return (
    <div className={cn("relative mx-auto", className)} aria-live="polite">
      <div className="absolute -inset-10 rounded-full bg-teal-400/5 blur-2xl pointer-events-none" />
      <div className="phone-bevel max-w-full">
        <div className="phone-screen">
          <div className="phone-notch" />
          <div className="phone-gloss" />

          {/* status bar */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-2.5 font-mono text-[9px] text-zinc-500">
            <span>9:41</span>
            <span className="tracking-widest">DO SUPPLY ENGINE</span>
            <span className="flex items-center gap-1">
              {(content?.kind === "video" || content?.kind === "page") && (
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              )}
            </span>
          </div>

          {/* content surface */}
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            {!content || content.kind === "placeholder" ? (
              <div className="px-8 text-center">
                {content?.tone === "working" ? (
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-amber-300" aria-hidden="true" />
                ) : (
                  <Clapperboard className="mx-auto h-7 w-7 text-zinc-700" aria-hidden="true" />
                )}
                <p className="mt-3 text-sm font-semibold text-zinc-300">
                  {content?.kind === "placeholder" ? content.title : "Nothing loaded yet"}
                </p>
                <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-zinc-600">
                  {content?.kind === "placeholder"
                    ? content.body
                    : "Generate in the studio — videos and creatives land in this phone automatically."}
                </p>
              </div>
            ) : content.kind === "page" ? (
              <iframe
                key={content.src}
                src={`/api/mcp/preview?url=${encodeURIComponent(content.src)}`}
                className="h-full w-full border-0 bg-black"
                /* Sandboxed WITHOUT allow-same-origin — the proxied page runs
                   in an opaque origin and cannot touch this site. */
                sandbox="allow-scripts allow-popups"
                allow="autoplay"
                title={label ?? "P&R engine preview page"}
                referrerPolicy="no-referrer"
              />
            ) : content.kind === "video" ? (
              <video
                key={content.src}
                ref={videoRef}
                src={`/api/mcp/media?url=${encodeURIComponent(content.src)}`}
                className="h-full w-full object-contain"
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label={label ?? "Generated P&R video playing in phone"}
              />
            ) : (
              <div className="relative h-full w-full">
                <img
                  key={content.src}
                  /* Same proxy as video: the engine 302s creatives to a signed
                     R2 URL, which the browser cannot hotlink reliably. */
                  src={`/api/mcp/media?url=${encodeURIComponent(content.src)}`}
                  alt={label ?? "Generated P&R creative shown in phone"}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
                {content.label && (
                  <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] uppercase text-zinc-200">
                    {content.label}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* bottom engine bar */}
          <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/70 px-4 py-2.5 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="truncate font-mono text-[9px] tracking-widest text-zinc-300 uppercase">
                {content?.kind === "video"
                  ? "Playing · P&R engine output"
                  : content?.kind === "page"
                    ? "Preview page · P&R engine output"
                    : content?.kind === "image"
                      ? "Creative · P&R engine output"
                      : "Studio phone standing by"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
        <ImageIcon className="mr-1 inline h-3 w-3" aria-hidden="true" />
        {label ?? "beveled delivery · no click-away"}
      </p>
    </div>
  );
}
