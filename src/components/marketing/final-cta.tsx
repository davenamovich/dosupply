"use client";

import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
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
              <span className="text-amber-glow">LET ME MAKE THE INTRODUCTION.</span>
            </>
          }
          provenance={<span />}
        />

        <div className="mx-auto mt-8 max-w-2xl space-y-5 text-left sm:text-center">
          <p className="leading-relaxed text-zinc-300">
            &ldquo;The asset is not the archive — it is who you know. The plant managers
            and maintenance engineers who call DO Supply first, and the sellers and
            dealers on the other side of the trade, including the ones who have since
            closed. Labs building industrial AI are paying enormous referral fees for an
            introduction to exactly that network.
          </p>
          <p className="leading-relaxed text-zinc-300">
            You&apos;ve built the relationships. Now it&apos;s time to monetize them: you
            authorize what&apos;s in scope, the lab pays the referral, and the
            relationship stays yours.
          </p>
          <p className="leading-relaxed text-zinc-300">
            AI is not going away, and those introductions have a price whether you make
            them or not. Let the contact list collect dust, or put the referral proceeds
            back into operations — more inventory, more service, more reach. I&apos;ll
            make the introductions.&rdquo;
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2">
          <span className="text-2xl font-bold text-white">Dave</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
            Founder, Plunder &amp; Riffle · introductions to AI labs
          </span>
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-amber-400 font-semibold text-black hover:bg-amber-300 glow-amber">
            <a href="tel:+15133171760" aria-label="Call Dave at 513-317-1760 to discuss an introduction">
              <Phone className="mr-2 h-4 w-4" />
              Call to Discuss an Introduction
            </a>
          </Button>
          <span className="w-full font-mono text-xs tracking-[0.18em] text-zinc-400">513-317-1760</span>
        </div>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-600">
          plunderandriffle.com · dosupply.com · bot.plunderandriffle.com/api/mcp
        </p>
      </div>
    </section>
  );
}
