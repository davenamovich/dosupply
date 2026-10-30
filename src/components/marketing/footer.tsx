"use client";

import { ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-black/50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          {/* Lockup */}
          <div className="text-center md:text-left">
            <p className="font-mono text-xs tracking-[0.28em] text-zinc-300">
              DO SUPPLY <span className="text-amber-300">×</span> PLUNDER &amp; RIFFLE
            </p>
            <p className="mt-1.5 text-xs text-zinc-500">
              An experimental marketing concept powered by Plunder &amp; Riffle.
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Footer links" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a
              href="https://www.dosupply.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-amber-300"
            >
              dosupply.com <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://plunderandriffle.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-amber-300"
            >
              plunderandriffle.com <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://bot.plunderandriffle.com/api/mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-teal-400/80 transition-colors hover:text-teal-300"
            >
              P&amp;R MCP endpoint <ExternalLink className="h-3 w-3" />
            </a>
          </nav>
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 text-center">
          <p className="mx-auto max-w-3xl text-[11px] leading-relaxed text-zinc-600">
            Content integrity: engine output is labeled at all times —{" "}
            <span className="text-teal-400/80">Generated via P&amp;R MCP</span> for live
            multimedia, <span className="text-amber-400/80">AI-drafted</span> for LLM
            drafts, <span className="text-zinc-400">Demonstration data</span> for sample
            datasets. Reviews and testimonials shown are fictional demonstrations. No
            invented product specifications, availability claims, or customer
            information. This is an independent concept demonstration, not an official
            DO Supply property.
          </p>
          <p className="mt-3 font-mono text-[10px] text-zinc-700">
            © {new Date().getFullYear()} Plunder &amp; Riffle · Built as a personalized
            demonstration for DO Supply LLC
          </p>
        </div>
      </div>
    </footer>
  );
}
