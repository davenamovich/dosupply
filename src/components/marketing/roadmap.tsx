"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckSquare, Square, Target } from "lucide-react";
import Image from "next/image";
import { ROADMAP_WEEKS } from "@/lib/demo-content";
import { SectionHeading } from "./section-heading";

export default function Roadmap() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const total = ROADMAP_WEEKS.reduce((a, w) => a + w.items.length, 0);
  const done = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((done / total) * 100);

  function toggle(key: string) {
    setChecked((c) => ({ ...c, [key]: !c[key] }));
  }

  return (
    <section id="roadmap" className="relative py-20 sm:py-24">
      {/* warehouse operations backdrop (AI-generated concept imagery) */}
      <div className="pointer-events-none absolute inset-0 select-none">
        <Image
          src="/img/warehouse.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.05] [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]"
        />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="The 30-Day Implementation Plan"
          title={
            <>
              Not a slide deck. <span className="text-amber-glow">A schedule.</span>
            </>
          }
          desc="What the first month looks like actually operating this engine for DO Supply. Click the items to simulate progress — this is the plan that has the engine running in week one."
        />

        {/* progress bar */}
        <div className="mx-auto mt-8 max-w-xl">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            <span>plan progress (simulated)</span>
            <span className="text-amber-300">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ROADMAP_WEEKS.map((week, wi) => {
            const weekDone = week.items.filter((_, i) => checked[`w${wi}-${i}`]).length;
            const complete = weekDone === week.items.length;
            return (
              <motion.div
                key={week.week}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: wi * 0.08 }}
                className={`panel lift relative flex flex-col rounded-2xl p-5 ${
                  complete ? "border-teal-400/40" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-sm font-bold ${
                      complete
                        ? "bg-teal-400/15 text-teal-300"
                        : "bg-amber-400/15 text-amber-300"
                    }`}
                  >
                    W{week.week}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
                    {weekDone}/{week.items.length} done
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-white">{week.title}</h3>
                <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-snug text-zinc-500">
                  <Target className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/70" />
                  {week.goal}
                </p>
                <ul className="mt-4 flex-1 space-y-2.5">
                  {week.items.map((item, i) => {
                    const key = `w${wi}-${i}`;
                    const isOn = !!checked[key];
                    return (
                      <li key={key}>
                        <button
                          onClick={() => toggle(key)}
                          className="group flex w-full items-start gap-2.5 text-left"
                          aria-pressed={isOn}
                        >
                          {isOn ? (
                            <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                          ) : (
                            <Square className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600 group-hover:text-amber-300/70" />
                          )}
                          <span
                            className={`text-[12.5px] leading-snug transition-colors ${
                              isOn
                                ? "text-zinc-500 line-through"
                                : "text-zinc-300 group-hover:text-white"
                            }`}
                          >
                            {item}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
