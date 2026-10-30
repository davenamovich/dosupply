"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/sales/types";
import { Brand, DemoBadge, ProductCard, timeLabel } from "./shared";
import { SCENARIOS, type Scenario } from "./scenarios";

type Mode = { inventory: "live" | "csv" | "demo"; alerts: "telegram" | "simulated" };

const STORAGE_KEY = "dosupply-sales-session";
const STARTERS = ["Find a part", "Request a quote", "Find a replacement", "Check availability", "Talk to sales"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function SalesChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | undefined>();
  const [mode, setMode] = useState<Mode | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const adopt = useCallback((data: { sessionId: string; messages: ChatMessage[]; leadId?: string; mode?: Mode }) => {
    sessionRef.current = data.sessionId;
    setSessionId(data.sessionId);
    setMessages(data.messages);
    setLeadId(data.leadId);
    if (data.mode) setMode(data.mode);
    localStorage.setItem(STORAGE_KEY, data.sessionId);
  }, []);

  const begin = useCallback(
    async (fresh: boolean) => {
      const saved = fresh ? null : localStorage.getItem(STORAGE_KEY);
      const res = await fetch(`/api/sales/chat${saved ? `?sessionId=${encodeURIComponent(saved)}` : ""}`);
      adopt(await res.json());
    },
    [adopt]
  );

  useEffect(() => {
    begin(false).catch(() => setError("Couldn't reach the sales assistant. Please refresh."));
  }, [begin]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy.current) return;
      busy.current = true;
      setError(null);
      setInput("");
      setMessages((m) => [
        ...m,
        { id: `local-${Date.now()}`, role: "user", text: trimmed, ts: new Date().toISOString() },
      ]);
      setTyping(true);
      try {
        const [res] = await Promise.all([
          fetch("/api/sales/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: sessionRef.current, message: trimmed }),
          }),
          sleep(650), // a beat of typing so replies don't snap in
        ]);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Request failed");
        if (data.sessionId && data.sessionId !== sessionRef.current) {
          sessionRef.current = data.sessionId;
          setSessionId(data.sessionId);
          localStorage.setItem(STORAGE_KEY, data.sessionId);
        }
        if (data.leadId) setLeadId(data.leadId);
        if (data.mode) setMode(data.mode);
        setMessages((m) => [...m, ...(data.messages as ChatMessage[])]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setTyping(false);
        busy.current = false;
      }
    },
    []
  );

  const reset = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
    setLeadId(undefined);
    await begin(true);
  }, [begin]);

  const runScenario = useCallback(
    async (s: Scenario) => {
      if (running) return;
      setRunning(s.id);
      await reset();
      await sleep(400);
      for (const line of s.lines) {
        await send(line);
        await sleep(900);
      }
      setRunning(null);
    },
    [reset, running, send]
  );

  const last = messages[messages.length - 1];
  const chips =
    last?.role === "assistant"
      ? last.quickReplies || (messages.length === 1 ? STARTERS : [])
      : [];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* Chat */}
      <section className="flex h-[calc(100dvh-3rem)] min-h-[560px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_40px_-12px_rgba(11,31,58,0.18)] lg:h-[min(760px,calc(100dvh-3rem))]">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <Brand />
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-600 sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              DO Supply Sales Assistant | Online
            </span>
            <button
              onClick={() => send("Talk to sales")}
              disabled={typing}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] transition hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-50"
            >
              Talk to a person
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-[#F8FAFD] px-4 py-5 sm:px-6" aria-live="polite">
          {messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
          {typing && (
            <div className="flex animate-in fade-in items-center gap-1 pl-1" aria-label="Assistant is typing">
              <span className="flex gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </span>
            </div>
          )}
          {leadId && (
            <p className="text-center text-[11px] font-medium text-slate-500">
              Request saved as <span className="font-mono">{leadId}</span> ·{" "}
              <a className="text-[#2563EB] hover:underline" href="/sales-agent/dashboard" target="_blank" rel="noreferrer">
                view on dashboard
              </a>
            </p>
          )}
          <div ref={endRef} />
        </div>

        <footer className="border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
          {error && <p className="mb-2 text-xs font-medium text-rose-600">{error}</p>}
          {chips.length > 0 && !typing && (
            <div className="mb-3 flex flex-wrap gap-2">
              {chips.map((c) => (
                <button
                  key={c}
                  onClick={() => send(c)}
                  className="rounded-full border border-[#2563EB]/30 bg-[#2563EB]/5 px-3.5 py-1.5 text-xs font-semibold text-[#1D4ED8] transition hover:bg-[#2563EB] hover:text-white"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Part number, manufacturer, or what you need…"
              maxLength={1500}
              disabled={!sessionId}
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-[#0B1F3A] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing || !sessionId}
              className="rounded-full bg-[#0B1F3A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </footer>
      </section>

      {/* Side panel */}
      <aside className="space-y-4 lg:pt-1">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-[#0B1F3A]">Demo status</h2>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Inventory</dt>
              <dd className="flex items-center gap-1.5 font-medium text-[#0B1F3A]">
                {mode?.inventory === "live" ? "Live catalog" : mode?.inventory === "csv" ? "Imported CSV" : "Simulated"}
                {mode?.inventory === "demo" && <DemoBadge />}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Sales alerts</dt>
              <dd className="font-medium text-[#0B1F3A]">
                {mode?.alerts === "telegram" ? "Telegram (live)" : "Telegram (simulated)"}
              </dd>
            </div>
          </dl>
          <a
            href="/sales-agent/dashboard"
            className="mt-4 block rounded-full bg-[#0B1F3A] px-4 py-2 text-center text-xs font-semibold text-white transition hover:bg-[#2563EB]"
          >
            Open sales dashboard
          </a>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-[#0B1F3A]">Run a sample conversation</h2>
          <p className="mt-1 text-xs text-slate-500">
            Plays a scripted customer through the real agent, so each one creates a real lead.
          </p>
          <ul className="mt-3 space-y-2">
            {SCENARIOS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => runScenario(s)}
                  disabled={Boolean(running)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-[#2563EB] disabled:opacity-50"
                >
                  <span className="flex items-center justify-between text-sm font-semibold text-[#0B1F3A]">
                    {s.title}
                    <span className="text-xs font-medium text-[#2563EB]">{running === s.id ? "Running…" : "Run"}</span>
                  </span>
                  <span className="block text-xs text-slate-500">{s.blurb}</span>
                </button>
              </li>
            ))}
          </ul>
          <button onClick={reset} disabled={Boolean(running)} className="mt-3 text-xs font-medium text-slate-500 hover:text-[#2563EB] disabled:opacity-50">
            Start a new conversation
          </button>
        </div>
      </aside>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const mine = m.role === "user";
  return (
    <div className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] space-y-2 sm:max-w-[78%] ${mine ? "items-end" : ""}`}>
        <div
          className={`whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            mine
              ? "rounded-br-md bg-[#0B1F3A] text-white"
              : "rounded-bl-md border border-slate-200 bg-white text-[#0B1F3A]"
          }`}
        >
          {m.text}
        </div>
        {m.cards && m.cards.length > 0 && (
          <div className="space-y-2">
            {m.cards.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        <p className={`px-1 text-[10px] text-slate-400 ${mine ? "text-right" : ""}`}>{timeLabel(m.ts)}</p>
      </div>
    </div>
  );
}
