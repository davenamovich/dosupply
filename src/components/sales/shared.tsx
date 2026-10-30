"use client";

import type { Product } from "@/lib/sales/types";

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex items-center justify-center rounded-lg bg-[#0B1F3A] font-bold tracking-tight text-white ${
          small ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
        }`}
      >
        DO
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold text-[#0B1F3A]">DO Supply</span>
        <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-[#2563EB]">
          Sales Assistant
        </span>
      </span>
    </div>
  );
}

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 ${className}`}
    >
      Demo data
    </span>
  );
}

const AVAIL_STYLE: Record<Product["availability"], string> = {
  "In Stock": "bg-emerald-50 text-emerald-700 border-emerald-200",
  Limited: "bg-amber-50 text-amber-800 border-amber-200",
  "Lead Time": "bg-sky-50 text-sky-700 border-sky-200",
  "Obsolete / Sourcing": "bg-rose-50 text-rose-700 border-rose-200",
};

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-16 w-16 shrink-0 rounded-xl border border-slate-100 bg-slate-50 object-cover"
        />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-xl bg-slate-100" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#2563EB]">
            {product.manufacturer}
          </span>
          {product.demo && <DemoBadge />}
        </div>
        <p className="truncate text-sm font-semibold text-[#0B1F3A]">{product.name}</p>
        <p className="font-mono text-xs text-slate-500">{product.partNumber}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className={`rounded-full border px-2 py-0.5 font-medium ${AVAIL_STYLE[product.availability]}`}>
            {product.availability}
          </span>
          {product.qtyAvailable !== undefined && (
            <span className="text-slate-500">Qty listed: {product.qtyAvailable}</span>
          )}
          <span className="text-slate-500">
            {product.price !== undefined ? `$${product.price.toLocaleString()}` : "Price on quote"}
          </span>
          {product.productUrl && (
            <a
              href={product.productUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
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
