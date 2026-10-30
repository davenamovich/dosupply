import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * GET /api/mcp/media?url=<https-url>
 *
 * In-page playback proxy for P&R engine assets. The engine returns *pages*,
 * not files: MP4 results are HTML wrappers around the real <video> source
 * (verified: bot.plunderandriffle.com/m/… pages set
 * `frame-ancestors 'self' …` so they cannot be iframed, and the mp4Url page
 * embeds a relative "ralph.mp4"). This route:
 *   1. fetches the page (host allowlisted — no open proxy),
 *   2. if it is HTML, extracts the first <video>/<source> src,
 *   3. streams the actual media back, relaying Range requests so the
 *      <video> element can seek.
 * The browser stays on this site the whole time.
 */

const ALLOWED_HOSTS = new Set([
  "bot.plunderandriffle.com",
  "plunderandriffle.com",
  "www.plunderandriffle.com",
]);

function hostAllowed(host: string, pathname = ""): boolean {
  const h = host.toLowerCase();
  if (ALLOWED_HOSTS.has(h)) return true;
  // here.now hosts the rendered MP4 pages (e.g. brisk-oyster-4drj.here.now)
  if (h.endsWith(".here.now") && h.length > ".here.now".length) return true;
  // The engine 302s creatives/MP4s to pre-signed Cloudflare R2 URLs. Allow only
  // its own bucket prefix, so this cannot become a general-purpose proxy.
  if (
    h.endsWith(".r2.cloudflarestorage.com") &&
    h.length > ".r2.cloudflarestorage.com".length &&
    pathname.startsWith("/memes/")
  ) {
    return true;
  }
  return false;
}

function isAllowedUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    if (!hostAllowed(u.hostname, u.pathname)) return null;
    return u;
  } catch {
    return null;
  }
}

function firstMatch(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? m[1] : null;
}

function extractVideoSrc(html: string, baseUrl: URL): URL | null {
  const raw =
    firstMatch(html, /<video[^>]*\ssrc=["']?([^"'\s>]+)/i) ??
    firstMatch(html, /<source[^>]*\ssrc=["']?([^"'\s>]+)/i) ??
    firstMatch(html, /"((?:https?:\/\/|\/)[^"']{8,300}\.mp4[^"']*)"/i);
  if (!raw) return null;
  try {
    return new URL(raw, baseUrl);
  } catch {
    return null;
  }
}

async function fetchFollowing(url: URL, range: string | null, depth = 0): Promise<Response> {
  if (depth > 3) throw new Error("too many redirects");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const headers: Record<string, string> = {
      "User-Agent": "DO-Supply-Demo-Player/1.0",
      Accept: "video/*,audio/*,image/*,text/html;q=0.8,*/*;q=0.5",
    };
    if (range) headers.Range = range;
    const res = await fetch(url.toString(), {
      headers,
      redirect: "manual",
      signal: controller.signal,
      cache: "no-store",
    });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      res.body?.cancel().catch(() => {});
      if (!loc) throw new Error("redirect without location");
      const next = new URL(loc, url);
      if (next.protocol !== "https:" || !hostAllowed(next.hostname, next.pathname)) {
        throw new Error("redirect left the allowed hosts");
      }
      return fetchFollowing(next, range, depth + 1);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) return jsonError("url query param is required.", 400);

  let target = isAllowedUrl(rawUrl);
  if (!target) {
    return jsonError(
      "Only https media from bot.plunderandriffle.com, plunderandriffle.com or *.here.now can be played.",
      400
    );
  }

  const range = req.headers.get("range");

  // First hop WITHOUT Range: the HTML wrapper must be fetched in full for
  // extraction, and some CDNs would otherwise return a 206 slice of HTML.
  let upstream: Response;
  try {
    upstream = await fetchFollowing(target, null);
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === "AbortError"
          ? "media fetch timed out"
          : err.message
        : "fetch failed";
    return jsonError(`Could not reach the engine's media host: ${msg}`, 502);
  }

  let ctype = (upstream.headers.get("content-type") || "").toLowerCase();

  if (ctype.includes("text/html")) {
    // HTML wrapper → find the real media URL, then fetch it honoring Range.
    const html = await upstream.text().catch(() => "");
    upstream.body?.cancel().catch(() => {});
    const videoSrc = extractVideoSrc(html, target);
    if (!videoSrc) {
      return jsonError(
        "The engine's page is HTML and no playable media could be extracted from it. Open the preview link instead.",
        415
      );
    }
    if (!hostAllowed(videoSrc.hostname, videoSrc.pathname)) {
      return jsonError("The extracted media URL is outside the allowed hosts.", 400);
    }
    target = videoSrc;
    try {
      upstream = await fetchFollowing(target, range);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "AbortError"
            ? "media fetch timed out"
            : err.message
          : "fetch failed";
      return jsonError(`Found the media URL but could not fetch it: ${msg}`, 502);
    }
    ctype = (upstream.headers.get("content-type") || "").toLowerCase();
  } else if (range && upstream.body) {
    // Direct media URL with a Range request — re-fetch with the Range header.
    upstream.body.cancel().catch(() => {});
    try {
      upstream = await fetchFollowing(target, range);
      ctype = (upstream.headers.get("content-type") || "").toLowerCase();
    } catch {
      // Fall back to the full response we already have rather than failing.
      upstream = await fetchFollowing(target, null);
      ctype = (upstream.headers.get("content-type") || "").toLowerCase();
    }
  }

  const isMedia =
    ctype.startsWith("video/") || ctype.startsWith("audio/") || ctype.startsWith("image/");
  if (!upstream.ok || !upstream.body || !isMedia) {
    upstream.body?.cancel().catch(() => {});
    return jsonError(
      `The engine host did not return playable media (HTTP ${upstream.status}, ${ctype || "unknown type"}).`,
      upstream.ok ? 415 : 502
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", ctype);
  for (const h of ["Content-Length", "Content-Range", "Accept-Ranges"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!headers.has("Accept-Ranges")) headers.set("Accept-Ranges", "bytes");

  /**
   * Cache per browser session. Creatives are content-addressed by their
   * /m/<id>/ path, so a re-mounted <img> must not pull 1.2 MB again.
   *   - 206 slices are never cached: a partial body reused as a whole object
   *     would corrupt video seeking.
   *   - images: long-lived and immutable (the path changes per generation).
   *   - video/audio: cached, but revalidated sooner since a signed URL may
   *     expire underneath it.
   */
  const cacheControl =
    upstream.status === 206
      ? "no-store"
      : ctype.startsWith("image/")
        ? "private, max-age=86400, immutable"
        : "private, max-age=3600";
  headers.set("Cache-Control", cacheControl);
  headers.set("X-Content-Type-Options", "nosniff");

  // Honour revalidation even after max-age: answer 304 without a body rather
  // than shipping the bytes again.
  const etag = upstream.headers.get("etag");
  if (etag) headers.set("ETag", etag);
  const ifNoneMatch = req.headers.get("if-none-match");
  if (etag && ifNoneMatch && ifNoneMatch === etag) {
    upstream.body?.cancel().catch(() => {});
    const notModified = new Headers();
    notModified.set("Cache-Control", cacheControl);
    notModified.set("ETag", etag);
    return new NextResponse(null, { status: 304, headers: notModified });
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
