"use client";

import { useCallback, useEffect, useState } from "react";
import type { TelegramCheck } from "@/lib/sales/telegram";
import type { ConnectionState } from "@/lib/sales/telegram-connect";

/**
 * Dashboard panel for Telegram alerts: shows who is subscribed, gives the
 * one-click links that add the bot to a group or start a private chat, turns
 * on the webhook that lets the bot notice those events, and sends a test.
 */
export default function TelegramPanel({ passcode }: { passcode: string }) {
  const [state, setState] = useState<ConnectionState | null>(null);
  const [report, setReport] = useState<TelegramCheck | "testing" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const headers = useCallback((): HeadersInit => (passcode ? { "x-dashboard-passcode": passcode } : {}), [passcode]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/sales/telegram", { headers: headers(), cache: "no-store" });
    if (res.ok) setState(await res.json());
  }, [headers]);

  useEffect(() => {
    refresh().catch(() => {});
    const t = setInterval(() => refresh().catch(() => {}), 6000);
    return () => clearInterval(t);
  }, [refresh]);

  const post = async (body: Record<string, unknown>) => {
    setWorking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sales/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify(body),
      });
      return await res.json();
    } finally {
      setWorking(false);
    }
  };

  const enable = async () => {
    const r = await post({ action: "setup-webhook" });
    setMessage(r.ok ? "Auto-connect is on. Use the links below to add a chat." : `Could not turn on auto-connect: ${r.error}`);
    await refresh();
  };

  const test = async () => {
    setReport("testing");
    const res = await fetch("/api/sales/telegram-check", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      body: JSON.stringify({ send: true }),
    });
    setReport(res.ok ? await res.json() : { configured: false, problem: "Could not run the test (unauthorized or server error)." });
  };

  const webhookOn = Boolean(state?.webhook?.url?.endsWith("/api/telegram/webhook"));
  const chats = state?.chats ?? [];

  return (
    <section className="mb-5 rounded-2xl border border-white/10 bg-[#12151b] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Telegram alerts {state?.bot && <span className="ml-1 font-mono text-xs font-normal text-zinc-400">{state.bot}</span>}</h2>
        <button
          onClick={test}
          disabled={report === "testing"}
          className="rounded-full border border-teal-400/40 bg-teal-400/10 px-3 py-1 text-xs font-semibold text-teal-200 transition hover:bg-teal-400/20 disabled:opacity-50"
        >
          {report === "testing" ? "Testing…" : "Send test alert"}
        </button>
      </div>

      {state?.problem && <p className="mt-2 text-xs font-medium text-rose-300">{state.problem}</p>}

      {state && !state.problem && (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Chats getting alerts</p>
            {chats.length === 0 ? (
              <p className="mt-1.5 text-xs text-zinc-400">None connected yet. Use a link on the right.</p>
            ) : (
              <ul className="mt-1.5 space-y-1.5">
                {chats.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
                    <span>
                      <b className="text-zinc-100">{c.title || "Chat"}</b> <span className="text-zinc-400">· {c.type}</span>
                    </span>
                    <button
                      onClick={async () => {
                        await post({ action: "remove", chatId: c.id });
                        await refresh();
                      }}
                      className="text-zinc-400 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Connect a chat</p>
            {webhookOn ? (
              <div className="mt-1.5 flex flex-wrap gap-2">
                <a href={state.links?.group} target="_blank" rel="noreferrer" className="rounded-full bg-teal-400 px-3 py-1.5 text-xs font-bold text-black hover:bg-teal-300">
                  Add bot to a group
                </a>
                <a href={state.links?.private} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:border-amber-400/50">
                  Start a private chat
                </a>
              </div>
            ) : (
              <div className="mt-1.5">
                <p className="text-xs text-zinc-400">One step first: let the bot receive chat events on this site.</p>
                <button
                  onClick={enable}
                  disabled={working}
                  className="mt-2 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-300 disabled:opacity-50"
                >
                  Turn on auto-connect
                </button>
                {state.webhook?.url && !webhookOn && (
                  <p className="mt-1.5 text-[11px] text-amber-200/80">
                    This bot's webhook points somewhere else ({state.webhook.url}). Turning this on replaces it, so use a bot that is only for DO Supply alerts.
                  </p>
                )}
              </div>
            )}
            {webhookOn && state.webhook?.lastError && <p className="mt-1.5 text-[11px] text-rose-300">Telegram reported: {state.webhook.lastError}</p>}
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-xs text-zinc-300">{message}</p>}

      {report && report !== "testing" && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            report.problem ? "border-rose-400/40 bg-rose-400/10 text-rose-100" : "border-teal-400/40 bg-teal-400/10 text-teal-100"
          }`}
        >
          {report.problem ? <p className="font-semibold">{report.problem}</p> : <p className="font-semibold">Test alert sent. Check Telegram.</p>}
          {report.chats?.map((c) => (
            <p key={c.id} className="mt-0.5 opacity-90">
              {c.title || c.id} ({c.type ?? "unknown"}): {c.ok ? (c.sent ? "delivered" : "reachable") : `failed, ${c.error}`}
            </p>
          ))}
          {report.hint && <p className="mt-1 opacity-80">{report.hint}</p>}
        </div>
      )}
    </section>
  );
}
