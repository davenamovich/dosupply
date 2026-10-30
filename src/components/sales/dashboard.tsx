"use client";

import { useCallback, useEffect, useState } from "react";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/sales/types";
import { Brand, DemoBadge, ProductCard } from "./shared";

type Mode = { inventory: string; alerts: string };

const PASS_KEY = "dosupply-dashboard-passcode";

const STATUS_STYLE: Record<LeadStatus, string> = {
  New: "bg-blue-50 text-blue-700 border-blue-200",
  Notified: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Contacted: "bg-sky-50 text-sky-700 border-sky-200",
  Quoted: "bg-amber-50 text-amber-800 border-amber-200",
  Won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Lost: "bg-slate-100 text-slate-600 border-slate-200",
};

const ALERT_STYLE: Record<Lead["telegram"]["status"], { label: string; cls: string }> = {
  sent: { label: "Telegram delivered", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  simulated: { label: "Telegram simulated", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  failed: { label: "Telegram failed", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  pending: { label: "Alert pending", cls: "bg-slate-100 text-slate-600 border-slate-200" },
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
  const [locked, setLocked] = useState<false | "needs" | "wrong">(false);
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
        const body = await res.json().catch(() => ({}));
        setLocked(code ? "wrong" : body.needsPasscode ? "needs" : "needs");
        setLoaded(true);
        return;
      }
      const data = await res.json();
      setLocked(false);
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
    if (locked) return;
    const t = setInterval(() => load(passcode).catch(() => {}), 5000);
    return () => clearInterval(t);
  }, [load, locked, passcode]);

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

  if (locked) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
        <Brand />
        <h1 className="text-lg font-semibold">Sales dashboard</h1>
        <p className="text-sm text-slate-600">
          {locked === "wrong" ? "That passcode didn't work." : "Enter the dashboard passcode to view leads."}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sessionStorage.setItem(PASS_KEY, passcode);
            load(passcode);
          }}
          className="flex gap-2"
        >
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-[#2563EB]"
            placeholder="Passcode"
          />
          <button className="rounded-full bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white">Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Brand />
          <span className="hidden h-6 w-px bg-slate-200 sm:block" />
          <h1 className="text-base font-semibold">Sales leads</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium">
            Alerts: {mode?.alerts === "telegram" ? "Telegram (live)" : "Telegram (simulated)"}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium">
            Inventory: {mode?.inventory === "demo" ? "Simulated" : mode?.inventory} {mode?.inventory === "demo" && <DemoBadge />}
          </span>
          <a href="/sales-agent" className="font-semibold text-[#2563EB] hover:underline">
            ← Back to chat
          </a>
        </div>
      </header>

      {!loaded ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold">No leads yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Finish a conversation in the chat and the lead will appear here within a few seconds.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <ul className="space-y-2 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
            {leads.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => setSelectedId(l.id)}
                  className={`w-full rounded-2xl border bg-white p-3.5 text-left transition hover:border-[#2563EB] ${
                    l.id === selectedId ? "border-[#2563EB] ring-2 ring-[#2563EB]/15" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500">{l.id}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[l.status]}`}>
                      {l.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold">
                    {l.customer.name || l.customer.email || "Unknown"}
                    {l.customer.company ? ` · ${l.customer.company}` : ""}
                  </p>
                  <p className="truncate text-xs text-slate-600">
                    {l.items.length
                      ? l.items.map((i) => `${i.quantity ?? "?"}× ${i.partNumber || i.description || "part"}`).join(", ")
                      : l.kind}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{l.kind}</span>
                    <span>{when(l.createdAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {selected && <Detail lead={selected} busy={busy} onPatch={(b) => patch(selected.id, b)} />}
        </div>
      )}
    </div>
  );
}

function Detail({
  lead,
  busy,
  onPatch,
}: {
  lead: Lead;
  busy: boolean;
  onPatch: (b: { status?: LeadStatus; retryAlert?: boolean }) => void;
}) {
  const alert = ALERT_STYLE[lead.telegram.status];
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-slate-500">{lead.id}</p>
            <h2 className="text-lg font-semibold">{lead.kind}</h2>
            <p className="text-xs text-slate-500">Created {when(lead.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500" htmlFor="status">
              Follow-up
            </label>
            <select
              id="status"
              value={lead.status}
              disabled={busy}
              onChange={(e) => onPatch({ status: e.target.value as LeadStatus })}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium outline-none focus:border-[#2563EB]"
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {lead.updatedAfterAlert && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
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
              <dt className="w-16 shrink-0 text-slate-500">{k}</dt>
              <dd className="font-medium">{v || <span className="font-normal text-slate-400">Not provided</span>}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold">Products requested</h3>
        <div className="mt-3 space-y-4">
          {lead.items.length === 0 && <p className="text-sm text-slate-500">No specific part. Customer asked for a rep.</p>}
          {lead.items.map((i) => (
            <div key={i.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-semibold">
                {i.quantity ?? "Qty TBD"} × {itemName(i)}
                {i.condition && <span className="ml-2 text-xs font-medium text-slate-500">{i.condition}</span>}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Inventory result:{" "}
                <strong className="text-[#0B1F3A]">
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Telegram alert</h3>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${alert.cls}`}>{alert.label}</span>
            {lead.telegram.status === "failed" && (
              <button
                disabled={busy}
                onClick={() => onPatch({ retryAlert: true })}
                className="rounded-full bg-[#0B1F3A] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50"
              >
                Retry now
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Attempts: {lead.telegram.attempts}
          {lead.telegram.sentAt && ` · delivered ${when(lead.telegram.sentAt)}`}
          {lead.telegram.status === "simulated" && " · no Telegram credentials configured, so this is the message that would be sent"}
          {lead.telegram.error && ` · last error: ${lead.telegram.error}`}
        </p>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-[#0B1F3A] p-4 font-mono text-xs leading-relaxed text-slate-100">
          {lead.telegram.message}
        </pre>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold">Conversation transcript</h3>
        <div className="mt-3 space-y-2.5">
          {lead.transcript.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${
                  m.role === "user" ? "bg-[#0B1F3A] text-white" : "border border-slate-200 bg-slate-50"
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
