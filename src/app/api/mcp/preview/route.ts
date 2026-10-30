import { NextRequest, NextResponse } from "next/server";

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

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: NextRequest) {
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
