"use client";

import { useCallback, useEffect, useState } from "react";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/sales/types";
import TelegramPanel from "./telegram-panel";
import { ALERT_GROUP_URL } from "@/lib/sales/links";
import { Brand, DemoBadge, ProductCard } from "./shared";

type Mode = { inventory: string; alerts: string };

const PASS_KEY = "dosupply-dashboard-passcode";

const STATUS_STYLE: Record<LeadStatus, string> = {
  New: "bg-blue-400/10 text-blue-300 border-blue-400/30",
  Notified: "bg-indigo-400/10 text-indigo-300 border-indigo-400/30",
  Contacted: "bg-sky-400/10 text-sky-300 border-sky-400/30",
  Quoted: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  Won: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  Lost: "bg-white/5 text-zinc-300 border-white/10",
};

const ALERT_STYLE: Record<Lead["telegram"]["status"], { label: string; cls: string }> = {
  sent: { label: "Telegram delivered", cls: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30" },
  simulated: { label: "Telegram simulated", cls: "bg-amber-400/10 text-amber-300 border-amber-400/30" },
  failed: { label: "Telegram failed", cls: "bg-rose-400/10 text-rose-300 border-rose-400/30" },
  pending: { label: "Alert pending", cls: "bg-white/5 text-zinc-300 border-white/10" },
};

function itemName(i: Lead["items"][number]) {
  const main = i.partNumber || i.description || "part";
  return i.manufacturer && !main.toLowerCase().includes(i.manufacturer.toLowerCase()) ? `${i.manufacturer} ${main}` : main;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [mode, setMode] = useState<Mode | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [passcode, setPasscode] = useState("");
  const [role, setRole] = useState<"admin" | "public">("public");
  const [wrong, setWrong] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const headers = useCallback(
    (code: string): HeadersInit => (code ? { "x-dashboard-passcode": code } : {}),
    []
  );

  const load = useCallback(
    async (code: string) => {
      const res = await fetch("/api/sales/leads", { headers: headers(code), cache: "no-store" });
      if (res.status === 401) {
        // A wrong passcode: forget it and fall back to the public view.
        sessionStorage.removeItem(PASS_KEY);
        setPasscode("");
        setWrong(true);
        const pub = await fetch("/api/sales/leads", { cache: "no-store" });
        if (pub.ok) {
          const data = await pub.json();
          setRole(data.role);
          setLeads(data.leads);
          setMode(data.mode);
          setSelectedId((cur) => cur ?? data.leads[0]?.id ?? null);
        }
        setLoaded(true);
        return;
      }
      const data = await res.json();
      setWrong(false);
      setRole(data.role);
      setLeads(data.leads);
      setMode(data.mode);
      setSelectedId((cur) => cur ?? data.leads[0]?.id ?? null);
      setLoaded(true);
    },
    [headers]
  );

  useEffect(() => {
    const saved = sessionStorage.getItem(PASS_KEY) || "";
    queueMicrotask(() => setPasscode(saved));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state is set after the request resolves
    load(saved).catch(() => setLoaded(true));
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => load(passcode).catch(() => {}), 5000);
    return () => clearInterval(t);
  }, [load, passcode]);

  const patch = async (id: string, body: { status?: LeadStatus; retryAlert?: boolean }) => {
    setBusy(true);
    await fetch(`/api/sales/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers(passcode) },
      body: JSON.stringify(body),
    });
    await load(passcode);
    setBusy(false);
  };

  const selected = leads.find((l) => l.id === selectedId) || null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Brand />
          <span className="hidden h-6 w-px bg-white/10 sm:block" />
          <h1 className="text-base font-semibold">Sales leads</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="rounded-full border border-white/10 bg-[#12151b] px-3 py-1 font-medium">
            Alerts: {mode?.alerts === "telegram" ? "Telegram (live)" : "Telegram (simulated)"}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#12151b] px-3 py-1 font-medium">
            Inventory: {mode?.inventory === "demo" ? "Simulated" : mode?.inventory} {mode?.inventory === "demo" && <DemoBadge />}
          </span>
          <a href={ALERT_GROUP_URL} target="_blank" rel="noreferrer" className="font-semibold text-teal-300 hover:underline">
            Join alert group
          </a>
          {role === "admin" ? (
            <span className="rounded-full border border-teal-400/40 bg-teal-400/10 px-3 py-1 font-semibold text-teal-200">Admin</span>
          ) : (
            <button onClick={() => setSigningIn((v) => !v)} className="font-semibold text-zinc-300 hover:text-amber-300">
              Admin sign-in
            </button>
          )}
          <a href="/sales-agent" className="font-semibold text-amber-300 hover:underline">
            ← Back to chat
          </a>
          <a href="/" className="rounded-full border border-white/10 px-3 py-1 font-semibold text-zinc-100 hover:border-amber-400/50 hover:text-amber-300">
            Home
          </a>
        </div>
      </header>

      {role === "public" && (
        <div className="mb-5 rounded-xl border border-white/10 bg-[#12151b] px-4 py-3 text-xs text-zinc-300">
          <p>
            <b className="text-zinc-100">Public demo view.</b> Emails and phone numbers are hidden. Everything else, including the
            full conversation and the Telegram alert, is shown as it happened.
          </p>
          {(signingIn || wrong) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sessionStorage.setItem(PASS_KEY, passcode);
                setWrong(false);
                load(passcode);
              }}
              className="mt-3 flex max-w-sm gap-2"
            >
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/30 px-4 py-1.5 text-sm outline-none focus:border-amber-400/60"
                placeholder="Admin passcode"
                autoFocus
              />
              <button className="rounded-full bg-teal-400 px-4 py-1.5 text-sm font-bold text-black">Unlock</button>
            </form>
          )}
          {wrong && <p className="mt-2 text-rose-300">That passcode didn&apos;t work.</p>}
        </div>
      )}

      {loaded && role === "admin" && <TelegramPanel passcode={passcode} />}

      {!loaded ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-[#12151b] p-10 text-center">
          <p className="text-sm font-semibold">No leads yet</p>
          <p className="mt-1 text-sm text-zinc-400">
            Finish a conversation in the chat and the lead will appear here within a few seconds.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <ul className="space-y-2 scroll-slim lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
            {leads.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => setSelectedId(l.id)}
                  className={`w-full rounded-2xl border bg-[#12151b] p-3.5 text-left transition hover:border-amber-400/50 ${
                    l.id === selectedId ? "border-amber-400/60 ring-2 ring-amber-400/15" : "border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-zinc-400">{l.id}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[l.status]}`}>
                      {l.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold">
                    {l.customer.name || l.customer.email || "Unknown"}
                    {l.customer.company ? ` · ${l.customer.company}` : ""}
                  </p>
                  <p className="truncate text-xs text-zinc-300">
                    {l.items.length
                      ? l.items.map((i) => `${i.quantity ?? "?"}× ${i.partNumber || i.description || "part"}`).join(", ")
                      : l.kind}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{l.kind}</span>
                    <span>{when(l.createdAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {selected && <Detail lead={selected} busy={busy} canEdit={role === "admin"} onPatch={(b) => patch(selected.id, b)} />}
        </div>
      )}
    </div>
  );
}

function Detail({
  lead,
  busy,
  canEdit,
  onPatch,
}: {
  lead: Lead;
  busy: boolean;
  canEdit: boolean;
  onPatch: (b: { status?: LeadStatus; retryAlert?: boolean }) => void;
}) {
  const alert = ALERT_STYLE[lead.telegram.status];
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-[#12151b] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-zinc-400">{lead.id}</p>
            <h2 className="text-lg font-semibold">{lead.kind}</h2>
            <p className="text-xs text-zinc-400">Created {when(lead.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-400" htmlFor="status">
              Follow-up
            </label>
            <select
              id="status"
              value={lead.status}
              disabled={busy || !canEdit}
              onChange={(e) => onPatch({ status: e.target.value as LeadStatus })}
              className="rounded-full border border-white/10 bg-[#12151b] px-3 py-1.5 text-sm font-medium outline-none focus:border-amber-400/60"
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {lead.updatedAfterAlert && (
          <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-300">
            The customer added details after the alert went out. The fields and transcript below are current.
          </p>
        )}

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {[
            ["Name", lead.customer.name],
            ["Company", lead.customer.company],
            ["Email", lead.customer.email],
            ["Phone", lead.customer.phone],
            ["Ship to", lead.customer.shipping],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-16 shrink-0 text-zinc-400">{k}</dt>
              <dd className="font-medium">{v || <span className="font-normal text-zinc-500">Not provided</span>}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#12151b] p-5">
        <h3 className="text-sm font-semibold">Products requested</h3>
        <div className="mt-3 space-y-4">
          {lead.items.length === 0 && <p className="text-sm text-zinc-400">No specific part. Customer asked for a rep.</p>}
          {lead.items.map((i) => (
            <div key={i.id} className="rounded-xl border border-white/5 bg-white/5 p-3">
              <p className="text-sm font-semibold">
                {i.quantity ?? "Qty TBD"} × {itemName(i)}
                {i.condition && <span className="ml-2 text-xs font-medium text-zinc-400">{i.condition}</span>}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Inventory result:{" "}
                <strong className="text-zinc-100">
                  {i.lookup ? (i.lookup.matchType === "none" ? "Not found" : i.lookup.matchType === "exact" ? "Exact match" : "Possible match") : "Not searched"}
                </strong>
                {i.lookup && !i.lookup.verified && " · not verified against live inventory"}
              </p>
              {i.lookup && i.lookup.products.length > 0 && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {i.lookup.products.slice(0, 2).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#12151b] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Telegram alert</h3>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${alert.cls}`}>{alert.label}</span>
            {canEdit && lead.telegram.status === "failed" && (
              <button
                disabled={busy}
                onClick={() => onPatch({ retryAlert: true })}
                className="rounded-full bg-teal-400 px-3 py-1 text-xs font-bold text-black hover:bg-teal-300 disabled:opacity-50"
              >
                Retry now
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          Attempts: {lead.telegram.attempts}
          {lead.telegram.sentAt && ` · delivered ${when(lead.telegram.sentAt)}`}
          {lead.telegram.status === "simulated" && " · no Telegram credentials configured, so this is the message that would be sent"}
          {lead.telegram.error && ` · last error: ${lead.telegram.error}`}
        </p>
        <pre className="mt-3 scroll-slim max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-black/60 border border-white/10 p-4 font-mono text-teal-100 text-xs leading-relaxed text-zinc-100">
          {lead.telegram.message}
        </pre>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#12151b] p-5">
        <h3 className="text-sm font-semibold">Conversation transcript</h3>
        <div className="mt-3 space-y-2.5">
          {lead.transcript.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${
                  m.role === "user" ? "bg-amber-400 font-medium text-black" : "border border-white/10 bg-white/5"
                }`}
              >
                {m.text}
                {m.cards && m.cards.length > 0 && (
                  <span className="mt-1 block text-[11px] opacity-70">
                    Showed: {m.cards.map((c) => c.partNumber).join(", ")}
                  </span>
                )}
                <span className="mt-1 block text-[10px] opacity-60">
                  {m.role === "user" ? "Customer" : "Assistant"} · {new Date(m.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
