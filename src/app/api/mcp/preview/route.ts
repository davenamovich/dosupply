import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/mcp/preview?url=<https-url>
 *
 * In-phone preview proxy for P&R engine *pages*. The engine's captioned
 * preview pages (bot.plunderandriffle.com/m/…) ship a CSP of
 * `frame-ancestors 'self' …`, so they cannot be iframed directly from this
 * origin. This route fetches the page server-side (host allowlisted — no
 * open proxy), injects a <base> tag so relative assets (e.g. talk.wav)
 * resolve against the engine host, and re-serves the HTML from our own
 * origin so the sandboxed phone iframe can render it.
 *
 * The iframe embedding this is sandboxed WITHOUT allow-same-origin, so the
 * page runs in an opaque origin — it can't touch this site's storage or
 * credentials.
 */

const ALLOWED_HOSTS = new Set([
  "bot.plunderandriffle.com",
  "plunderandriffle.com",
  "www.plunderandriffle.com",
]);

function isAllowedUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    if (!ALLOWED_HOSTS.has(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}

/** Removes the page's own phone shell so it fills whatever frame embeds it. */
const FIT_TO_PHONE_CSS = `<style data-fit-to-phone>
html, html body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; display: block !important; }
html body .iphone-frame.iphone-frame.iphone-frame {
  width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important;
  aspect-ratio: auto !important; margin: 0 !important; padding: 0 !important;
  border-radius: 0 !important; box-shadow: none !important; background: #000 !important;
}
html body .iphone-notch.iphone-notch.iphone-notch { display: none !important; }
html body .iphone-screen.iphone-screen.iphone-screen { width: 100% !important; height: 100% !important; border-radius: 0 !important; }
html body .meme-stage.meme-stage.meme-stage {
  width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important;
  aspect-ratio: auto !important; border-radius: 0 !important; box-shadow: none !important;
}
html body .meme-stage video, html body .meme-stage .meme-bg { width: 100% !important; height: 100% !important; object-fit: cover !important; }
html body .action-bar { display: none !important; }
</style>`;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: NextRequest) {
  if (!rateLimit(`preview:${clientIp(req)}`, 60, 60_000)) return jsonError("Too many requests.", 429);
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) return jsonError("url query param is required.", 400);

  const target = isAllowedUrl(rawUrl);
  if (!target) {
    return jsonError(
      "Only https preview pages from bot.plunderandriffle.com or plunderandriffle.com can be shown.",
      400
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent": "DO-Supply-Demo-Phone/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === "AbortError"
          ? "preview fetch timed out"
          : err.message
        : "fetch failed";
    return jsonError(`Could not reach the engine's preview page: ${msg}`, 502);
  } finally {
    clearTimeout(timer);
  }

  const ctype = (upstream.headers.get("content-type") || "").toLowerCase();
  if (!upstream.ok || !ctype.includes("text/html")) {
    upstream.body?.cancel().catch(() => {});
    return jsonError(
      `The engine did not return an HTML preview page (HTTP ${upstream.status}, ${ctype || "unknown type"}).`,
      upstream.ok ? 415 : 502
    );
  }

  const html = await upstream.text().catch(() => "");
  if (!html) return jsonError("The engine's preview page came back empty.", 502);

  // <base> injection: relative assets (talk.wav, sub-resources) resolve
  // against the engine host. Placed right after <head> (or prepended).
  const baseTag = `<base href="${target.origin}${target.pathname.replace(/[^/]*$/, "")}">`;
  let out: string;
  if (/<head[^>]*>/i.test(html)) {
    out = html.replace(/<head[^>]*>/i, (m) => `${m}\n${baseTag}`);
  } else {
    out = `${baseTag}\n${html}`;
  }

  // The engine's pages draw their own iPhone bezel, which would nest a phone
  // inside the studio phone. Strip the shell so the page fills the screen,
  // injected last (and repeated-class specific) so it beats the page's own
  // `.record-mode`/media-query rules.
  out = /<\/head>/i.test(out)
    ? out.replace(/<\/head>/i, `${FIT_TO_PHONE_CSS}\n</head>`)
    : `${out}\n${FIT_TO_PHONE_CSS}`;

  return new NextResponse(out, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
