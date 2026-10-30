"use client";

import { Button } from "@/components/ui/button";
import { Phone, Presentation } from "lucide-react";
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
              <span className="text-amber-glow">TRY WHAT I BUILT.</span>
            </>
          }
          provenance={<span />}
        />

        <div className="mx-auto mt-8 max-w-2xl space-y-5 text-left sm:text-center">
          <p className="leading-relaxed text-zinc-300">
            Thank you for taking the time to look at this. I know a page like this is an
            unusual way to apply, so I&apos;ll keep the letter short.
          </p>
          <p className="leading-relaxed text-zinc-300">
            I&apos;ve spent more than 20 years in lending, business development and
            advertising sales, and I&apos;m currently selling programmatic advertising at
            Consult TV. Relationships and follow-through are what I do best. For the last
            12 months I&apos;ve been learning AI, and in the short time since I saw your
            posting I built everything on this page: a sales assistant that turns a quote request into a conversation
            and alerts your team the moment a lead is ready, a content engine for social,
            email, video, SEO and review replies, and a 90-day plan to measure the results.
          </p>
          <p className="leading-relaxed text-zinc-300">
            If your work is moving bits around on a computer, there is little left that a
            person has to do by hand. What matters now is knowing what to build and why, and
            that is the skill I have spent the past year sharpening.
          </p>
          <p className="leading-relaxed text-zinc-300">
            I&apos;ve lived in Morrisville for six years and worked remotely the whole time,
            and I&apos;ve been looking for a place to put an ever-evolving skillset to use.
            DO Supply, with its parts, its expertise and its customers, looks like that
            place. I&apos;d welcome a conversation about the Multimedia Marketing Specialist
            role and a 90-day pilot, which I&apos;ve outlined in a short presentation below.
            Thank you again for your time.
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2">
          <span className="text-2xl font-bold text-white">Dave Namovich</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
            Morrisville, NC · Multimedia Marketing Specialist applicant
          </span>
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            <a href="/future-outlook">
              <Presentation className="mr-2 h-4 w-4" />
              View the Future Outlook presentation
            </a>
          </Button>
          <Button asChild size="lg" className="bg-amber-400 font-semibold text-black hover:bg-amber-300 glow-amber">
            <a href="tel:+15133171760" aria-label="Call Dave at 513-317-1760 to talk about the role">
              <Phone className="mr-2 h-4 w-4" />
              Call to Talk About the Role
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
