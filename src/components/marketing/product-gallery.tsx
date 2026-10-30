"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { SectionHeading } from "./section-heading";

const SHOTS = [
  {
    src: "/img/plc-module.png",
    title: "PLC Modules",
    caption: "Tested processors, staged for need-it-now dispatch",
    span: "md:col-span-2 md:row-span-2",
    h: "h-64 md:h-full",
  },
  {
    src: "/img/hmi-terminal.png",
    title: "HMI Terminals",
    caption: "Operator interfaces, bench-verified before shipping",
    span: "md:col-span-2",
    h: "h-56",
  },
  {
    src: "/img/drive-unit.png",
    title: "Drives & VFDs",
    caption: "From PowerFlex-class platforms to servo drives",
    span: "md:col-span-1",
    h: "h-44",
  },
  {
    src: "/img/servo-motor.png",
    title: "Servo & Motors",
    caption: "Calibrated motion components for critical lines",
    span: "md:col-span-1",
    h: "h-44",
  },
];

/**
 * Concept imagery for the demonstration. All shots are AI-generated
 * (labeled below) — they set the industrial platform mood and are NOT
 * presented as actual DO Supply catalog photography.
 */
export default function ProductGallery() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="The catalog comes alive"
          title={
            <>
              Every product, <span className="text-amber-glow">a story waiting to ship.</span>
            </>
          }
          provenance={
            <span className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-400">
              <Camera className="h-2.5 w-2.5" /> AI-generated concept imagery
            </span>
          }
          desc="The engine pairs every product line with cinematic photography concepts — this gallery sets the visual tone for the content a full-time specialist would produce."
        />

        <div className="mt-12 grid auto-rows-min grid-cols-1 gap-4 md:grid-cols-4">
          {SHOTS.map((s, i) => (
            <motion.figure
              key={s.src}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.09, duration: 0.5 }}
              className={`lift group relative overflow-hidden rounded-2xl border border-white/10 ${s.span}`}
            >
              <div className={`relative ${s.h} w-full`}>
                <Image
                  src={s.src}
                  alt={`${s.title} — AI-generated concept photography`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              </div>
              <figcaption className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-sm font-bold text-white">{s.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">{s.caption}</p>
              </figcaption>
              <span className="absolute right-3 top-3 rounded border border-white/20 bg-black/60 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-zinc-400">
                Concept
              </span>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
