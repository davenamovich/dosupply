"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink, CalendarClock } from "lucide-react";
import { SectionHeading } from "./section-heading";

export default function FinalCta() {
  return (
    <section id="final" className="relative overflow-hidden py-20 sm:py-28">
      <div className="absolute inset-0 industrial-grid-bg opacity-60" />
      <div className="absolute inset-0 atmosphere-amber pointer-events-none" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <SectionHeading
          kicker="Final word"
          title={
            <>
              DON&apos;T TAKE MY WORD FOR IT.
              <br />
              <span className="text-amber-glow">LET ME SHOW YOU.</span>
            </>
          }
          provenance={<span />}
        />

        <div className="mx-auto mt-8 max-w-2xl space-y-5 text-left sm:text-center">
          <p className="leading-relaxed text-zinc-300">
            &ldquo;I&apos;m building Plunder &amp; Riffle because I believe the future of
            marketing isn&apos;t about creating more work. It&apos;s about building
            smarter systems that make great content easier to produce and distribute.
          </p>
          <p className="leading-relaxed text-zinc-300">
            I&apos;d love to bring that mindset, creativity and technical experience to
            DO Supply.
          </p>
          <p className="leading-relaxed text-zinc-300">
            This isn&apos;t just about filling a marketing position. It&apos;s about
            exploring what we could build.&rdquo;
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2">
          <span className="text-2xl font-bold text-white">Dave</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
            Founder, Plunder &amp; Riffle
          </span>
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            <a href="https://plunderandriffle.com/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Explore Plunder &amp; Riffle
            </a>
          </Button>
          <Button asChild size="lg" className="bg-amber-400 font-semibold text-black hover:bg-amber-300 glow-amber">
            <a href="https://plunderandriffle.com/" target="_blank" rel="noopener noreferrer">
              <CalendarClock className="mr-2 h-4 w-4" />
              Schedule a Conversation
            </a>
          </Button>
        </div>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-600">
          plunderandriffle.com · dosupply.com · bot.plunderandriffle.com/api/mcp
        </p>
      </div>
    </section>
  );
}
