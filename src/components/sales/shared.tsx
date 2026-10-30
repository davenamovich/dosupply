"use client";

import type { Product } from "@/lib/sales/types";

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex items-center justify-center rounded-lg border border-amber-400/40 bg-amber-400/10 font-mono font-bold tracking-tight text-amber-300 ${
          small ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
        }`}
      >
        DO
      </span>
      <span className="leading-tight">
        <span className="block font-mono text-[12px] font-semibold tracking-[0.2em] text-zinc-100">DO SUPPLY</span>
        <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-amber-300">
          Sales Assistant
        </span>
      </span>
    </div>
  );
}

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300 ${className}`}
    >
      Demo data
    </span>
  );
}

const AVAIL_STYLE: Record<Product["availability"], string> = {
  "In Stock": "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  Limited: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  "Lead Time": "bg-sky-400/10 text-sky-300 border-sky-400/30",
  "Obsolete / Sourcing": "bg-rose-400/10 text-rose-300 border-rose-400/30",
};

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-[#12151b] p-3 shadow-sm">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-16 w-16 shrink-0 rounded-xl border border-white/5 bg-white/5 object-cover"
        />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-xl bg-white/5" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            {product.manufacturer}
          </span>
          {product.demo && <DemoBadge />}
        </div>
        <p className="truncate text-sm font-semibold text-zinc-100">{product.name}</p>
        <p className="font-mono text-xs text-zinc-400">{product.partNumber}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className={`rounded-full border px-2 py-0.5 font-medium ${AVAIL_STYLE[product.availability]}`}>
            {product.availability}
          </span>
          {product.qtyAvailable !== undefined && (
            <span className="text-zinc-400">Qty listed: {product.qtyAvailable}</span>
          )}
          <span className="text-zinc-400">
            {product.price !== undefined ? `$${product.price.toLocaleString()}` : "Price on quote"}
          </span>
          {product.productUrl && (
            <a
              href={product.productUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-amber-300 underline-offset-2 hover:underline"
            >
              View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
