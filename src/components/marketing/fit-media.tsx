"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * The engine bakes an iPhone bezel into its 9:16 PNGs and recorded MP4s
 * (dark backdrop, a #18181b ring, black padding, then the real screen).
 * Dropped into the studio phone as-is, that is a phone inside a phone.
 *
 * `detectBezel` finds the real screen inside such a frame; `FitMedia` then
 * scales and offsets the media so only that screen fills the studio phone.
 * Media without the bezel signature is shown untouched.
 */

export type Crop = { x: number; y: number; w: number; h: number }; // fractions of the source

const lum = (r: number, g: number, b: number) => 0.3 * r + 0.59 * g + 0.11 * b;

export function detectBezel(src: CanvasImageSource, w: number, h: number): Crop | null {
  if (!w || !h) return null;
  const sc = Math.min(1, 360 / w);
  const cw = Math.max(1, Math.round(w * sc));
  const ch = Math.max(1, Math.round(h * sc));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  let data: Uint8ClampedArray;
  try {
    ctx.drawImage(src, 0, 0, cw, ch);
    data = ctx.getImageData(0, 0, cw, ch).data;
  } catch {
    return null; // tainted or not decodable yet
  }
  const at = (x: number, y: number) => {
    const i = (y * cw + x) * 4;
    return lum(data[i], data[i + 1], data[i + 2]);
  };
  // Ring pixels sit between the backdrop (~10) and any real content (>42).
  const isRing = (x: number, y: number) => {
    const l = at(x, y);
    return l > 17 && l < 34;
  };

  /** Walk inward from one edge; report the first content pixel and whether the ring was seen first. */
  const scan = (start: [number, number], step: [number, number], len: number) => {
    let ring = false;
    for (let t = 0; t < len; t++) {
      const x = start[0] + step[0] * t;
      const y = start[1] + step[1] * t;
      if (isRing(x, y)) ring = true;
      if (at(x, y) >= 42) return { t, ring };
    }
    return null;
  };

  const fracs = [0.3, 0.5, 0.7];
  const edge = (kind: "l" | "r" | "t" | "b") => {
    const hits = (kind === "l" || kind === "r" ? fracs : [0.2, 0.8]).map((f) => {
      const y = Math.round(f * (ch - 1));
      const x = Math.round(f * (cw - 1));
      if (kind === "l") return scan([0, y], [1, 0], Math.floor(cw * 0.3));
      if (kind === "r") return scan([cw - 1, y], [-1, 0], Math.floor(cw * 0.3));
      if (kind === "t") return scan([x, 0], [0, 1], Math.floor(ch * 0.3));
      return scan([x, ch - 1], [0, -1], Math.floor(ch * 0.3));
    });
    if (hits.some((h) => !h) || hits.filter((h) => h?.ring).length < 1) return null;
    return Math.min(...hits.map((h) => h!.t)); // least aggressive across the sampled lines
  };

  const l = edge("l");
  const r = edge("r");
  const t = edge("t");
  const b = edge("b");
  if (l == null || r == null || t == null || b == null) return null;
  // A real bezel is a visible but modest border on every side.
  const side = (v: number, total: number) => v / total > 0.05 && v / total < 0.25;
  if (!side(l, cw) || !side(r, cw) || !side(t, ch) || !side(b, ch)) return null;

  // Trim a little more to drop the screen's rounded corners and the engine's notch.
  const insetX = 0.03;
  const x = l / cw + insetX;
  const y = t / ch + 0.035;
  return { x, y, w: 1 - r / cw - insetX - x, h: 1 - b / ch - 0.02 - y };
}

/** Position an element of natural size (nw x nh) so `crop` covers a box of bw x bh. */
export function coverStyle(crop: Crop, nw: number, nh: number, bw: number, bh: number): CSSProperties {
  const cwPx = crop.w * nw;
  const chPx = crop.h * nh;
  const s = Math.max(bw / cwPx, bh / chPx);
  return {
    position: "absolute",
    width: nw * s,
    height: nh * s,
    maxWidth: "none",
    left: (bw - cwPx * s) / 2 - crop.x * nw * s,
    top: (bh - chPx * s) / 2 - crop.y * nh * s,
  };
}

/** Tracks the pixel size of a box. */
export function useBoxSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}

/** An image that shows only the real screen when the engine baked a phone bezel into it. */
export function FitImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const { ref, size } = useBoxSize();
  const [state, setState] = useState<{ src: string; crop: Crop | null; nw: number; nh: number } | null>(null);
  const crop = state && state.src === src ? state : null;

  const onLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setState({ src, crop: detectBezel(img, img.naturalWidth, img.naturalHeight), nw: img.naturalWidth, nh: img.naturalHeight });
    },
    [src]
  );

  const style = crop?.crop && size.w ? coverStyle(crop.crop, crop.nw, crop.nh, size.w, size.h) : undefined;
  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      <img
        key={src}
        src={src}
        alt={alt}
        onLoad={onLoad}
        style={style}
        className={style ? undefined : className}
        loading="eager"
      />
    </div>
  );
}

/** A video that shows only the real screen when the engine baked a phone bezel into the recording. */
export const FitVideo = function FitVideo({
  src,
  label,
  videoRef,
}: {
  src: string;
  label: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const { ref, size } = useBoxSize();
  const [state, setState] = useState<{ src: string; crop: Crop | null; nw: number; nh: number; decided: boolean } | null>(null);
  const cur = state && state.src === src ? state : null;

  const probe = useCallback(
    (final: boolean) => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      const crop = detectBezel(v, v.videoWidth, v.videoHeight);
      // A first frame can be black/blank; keep looking until it has content or we give up.
      setState({ src, crop, nw: v.videoWidth, nh: v.videoHeight, decided: final || !!crop });
    },
    [src, videoRef]
  );

  const style = cur?.crop && size.w ? coverStyle(cur.crop, cur.nw, cur.nh, size.w, size.h) : undefined;
  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      <video
        key={src}
        ref={videoRef}
        src={src}
        style={style}
        className={style ? undefined : "h-full w-full object-contain"}
        controls={!style}
        onClick={(e) => {
          // Native controls would sit off-screen on a cropped video, so tap to pause/play instead.
          if (!style) return;
          const v = e.currentTarget;
          if (v.paused) void v.play();
          else v.pause();
        }}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        onLoadedData={() => probe(false)}
        onTimeUpdate={(e) => {
          if (!cur?.decided && e.currentTarget.currentTime > 0.4) probe(true);
        }}
      />
    </div>
  );
};
