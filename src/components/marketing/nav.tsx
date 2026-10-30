"use client";

import { useEffect, useState } from "react";
import { McpStatusPill } from "./shared";
import { Cpu, Menu, X } from "lucide-react";

const LINKS = [
  { href: "#command-center", label: "Command Center" },
  { href: "#live-demo", label: "Live Demo" },
  { href: "#pr-studio", label: "P&R Studio" },
  { href: "#roadmap", label: "30-Day Plan" },
  { href: "#final", label: "Contact" },
];

/** The sales agent entry point: a pill with a glowing orb so it stands out from the plain links. */
function SalesAgentLink({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) {
  return (
    <a
      href="/sales-agent"
      onClick={onClick}
      aria-label="Talk to the Sales Agent"
      className="group inline-flex items-center gap-2.5 rounded-full border border-teal-400/40 bg-teal-400/10 py-1.5 pl-2.5 pr-3.5 text-xs font-semibold text-teal-100 shadow-[0_0_24px_rgba(45,212,191,0.25)] transition hover:border-teal-300/70 hover:bg-teal-400/20 hover:shadow-[0_0_32px_rgba(45,212,191,0.45)]"
    >
      <span className="relative flex h-3.5 w-3.5 items-center justify-center" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-300/70" />
        <span className="absolute -inset-1.5 rounded-full bg-teal-400/40 blur-md" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ccfbf1,#2dd4bf_55%,#0d9488)] shadow-[0_0_10px_3px_rgba(45,212,191,0.8)]" />
      </span>
      <span className={compact ? "hidden sm:inline" : undefined}>Sales Agent</span>
    </a>
  );
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-[#0a0b0d]/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#" className="flex items-center gap-2.5" aria-label="Back to top">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-400/10">
            <Cpu className="h-4 w-4 text-amber-300" />
          </span>
          <span className="font-mono text-[11px] font-semibold tracking-[0.24em] text-zinc-200">
            DO SUPPLY <span className="text-amber-300">×</span> P&amp;R
          </span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-xs font-medium text-zinc-400 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <SalesAgentLink />
          <McpStatusPill />
        </div>

        <div className="ml-auto md:hidden">
          <SalesAgentLink compact />
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-300 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#0a0b0d]/95 px-4 py-4 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 px-3">
            <McpStatusPill />
          </div>
        </div>
      )}
    </header>
  );
}
