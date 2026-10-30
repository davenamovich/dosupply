"use client";

import { useEffect, useState } from "react";
import { McpStatusPill } from "./shared";
import { Cpu, Menu, X } from "lucide-react";

const LINKS = [
  { href: "#command-center", label: "Command Center" },
  { href: "#live-demo", label: "Live Demo" },
  { href: "#roadmap", label: "30-Day Plan" },
  { href: "#final", label: "Contact" },
];

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

        <div className="hidden md:block">
          <McpStatusPill />
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
