/**
 * The brand every engine call is made as. The meme engine exposes the DO
 * Supply bot ("dosupply", #NeedItNow) as a brand key, so creatives are written
 * in its voice instead of the key owner's default house brand.
 *
 * Override with PLUNDER_RIFFLE_BRAND (any key from list_ad_options).
 */
export function engineBrand(): string {
  return (process.env.PLUNDER_RIFFLE_BRAND || "").trim() || "dosupply";
}

const FILLER = new Set([
  "a", "an", "the", "for", "and", "or", "of", "to", "in", "on", "with", "just", "new", "now", "our",
  "your", "is", "are", "this", "that", "we", "you", "it", "its", "restocked", "restock", "available",
  "need", "needs", "got", "have", "has", "about",
]);

/**
 * Shirt text for a video: an offer on the video's subject, e.g. "ASK US ABOUT
 * POWERFLEX 525". Deliberately makes no stock, price or speed claim. The
 * engine allows 2-5 words and 40 characters.
 */
export function shirtFor(topic: string): string {
  const words = topic
    .replace(/[^A-Za-z0-9\s.-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w.toLowerCase()));
  for (const n of [2, 1]) {
    const subject = words.slice(0, n).join(" ").toUpperCase();
    const text = `ASK US ABOUT ${subject}`;
    if (subject && text.length <= 40) return text;
  }
  return "NEED IT NOW";
}

/**
 * Look for the talk-show hosted videos (create_phone_demo / create_sitdown).
 * Those tools take no brand key, so the set comes from the key owner's saved
 * set unless provided. The shirt changes per video (see shirtFor); a fixed one
 * can be forced with PLUNDER_RIFFLE_VIDEO_ACCESSORY.
 *   PLUNDER_RIFFLE_VIDEO_SCENE      desk | lounge | podcast | news | stage
 *   PLUNDER_RIFFLE_VIDEO_OUTFIT     tie | tee (an accessory implies tee)
 *   PLUNDER_RIFFLE_VIDEO_ACCESSORY  fixed shirt text, 2-5 words
 */
export function videoLook(topic: string): { scene?: string; outfit?: string; accessory?: string } {
  const scenes = ["desk", "lounge", "podcast", "news", "stage"];
  const scene = (process.env.PLUNDER_RIFFLE_VIDEO_SCENE || "").trim().toLowerCase();
  const outfit = (process.env.PLUNDER_RIFFLE_VIDEO_OUTFIT || "").trim().toLowerCase();
  const fixed = (process.env.PLUNDER_RIFFLE_VIDEO_ACCESSORY || "").trim().slice(0, 40);
  return {
    ...(scenes.includes(scene) ? { scene } : {}),
    ...(outfit === "tie" && !fixed ? { outfit } : {}),
    accessory: fixed || shirtFor(topic),
  };
}
