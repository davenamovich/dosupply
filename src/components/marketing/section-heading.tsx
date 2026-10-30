"use client";

import { ProvenanceBadge } from "./shared";

export function SectionHeading({
  kicker,
  title,
  desc,
  provenance,
}: {
  kicker: string;
  title: React.ReactNode;
  desc?: string;
  provenance?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="flex items-center justify-center gap-3">
        <span className="kicker">{kicker}</span>
        {provenance ?? <ProvenanceBadge kind="ai">AI-drafted outputs below</ProvenanceBadge>}
      </div>
      <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-white">
        {title}
      </h2>
      {desc && <p className="mt-4 text-zinc-400 leading-relaxed">{desc}</p>}
    </div>
  );
}
