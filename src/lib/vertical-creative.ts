/**
 * Pick the vertical (9:16) creative out of an MCP payload.
 *
 * Tool shapes differ: ad creative uses `adAssets[].url` with format/label/width,
 * multilang nests assets under `payload.results[]` and may add `imageUrl`, and
 * some results arrive as JSON text rather than an object. The routes call this
 * so the response names the asset explicitly, instead of every client having to
 * walk an unknown shape.
 */

export type VerticalCreative = { url: string; label: string };

export function pickVerticalCreative(value: unknown): VerticalCreative | null {
  const found: { url: string; hint: string }[] = [];
  const IMG = /\.(png|jpe?g|webp|gif)(\?\S*)?$/i;
  const has = (u: string) => found.some((f) => f.url === u);

  const pickUrl = (o: Record<string, unknown>): string | null => {
    for (const k of ["url", "imageUrl", "image_url", "media_url", "image", "src", "asset"]) {
      const v = o[k];
      if (typeof v === "string" && /^https:\/\//i.test(v) && IMG.test(v)) return v;
    }
    return null;
  };

  const walk = (v: unknown, depth: number) => {
    if (depth > 8) return;
    if (typeof v === "string") {
      if (/^https:\/\/\S+/i.test(v) && IMG.test(v) && !has(v)) {
        found.push({ url: v, hint: "" });
      } else if (/^[\[{]/.test(v.trim()) && v.includes("http")) {
        // Some tools return their payload as a JSON string.
        try {
          walk(JSON.parse(v), depth + 1);
        } catch {
          /* not JSON — ignore */
        }
      }
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v) walk(x, depth + 1);
      return;
    }
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    const url = pickUrl(o);
    if (url && !has(url)) {
      const w = typeof o.width === "number" ? o.width : null;
      const h = typeof o.height === "number" ? o.height : null;
      const hint = [o.format, o.label, o.size, o.aspect, o.ratio, o.language]
        .filter((x): x is string => typeof x === "string")
        .join(" ")
        .toLowerCase();
      found.push({ url, hint: w && h ? `${hint} ${w}x${h}` : hint });
    }
    for (const x of Object.values(o)) walk(x, depth + 1);
  };
  walk(value, 0);

  const explicit = found.find((f) =>
    /9\s*[:x/]\s*16|story|vertical|reel|shorts/.test(f.hint)
  );
  const byRatio = found.find((f) => {
    const m = f.hint.match(/(\d{3,4})x(\d{3,4})/);
    return m ? Number(m[2]) / Number(m[1]) > 1.2 : false;
  });
  const pick = explicit ?? byRatio;
  return pick ? { url: pick.url, label: "9:16 creative" } : null;
}
