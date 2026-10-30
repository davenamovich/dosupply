import { readFile } from "fs/promises";
import { DEMO_PRODUCTS } from "./demo-products";
import type { LookupResult, MatchType, Product } from "./types";

/**
 * Inventory search service.
 *
 * Provider order (first provider that finds something wins):
 *   1. DO Supply live catalog/API      — DOSUPPLY_CATALOG_API_URL (+ _KEY)
 *   2. Connected inventory database    — integration point, not wired yet
 *   3. Imported product CSV            — INVENTORY_CSV_PATH
 *   4. Built-in DEMO DATA              — always available
 *
 * Only (1) is ever treated as `verified`. A CSV is a snapshot and demo data is
 * simulated, so neither may be presented as confirmed stock to a customer.
 */

export type SearchQuery = {
  partNumber?: string;
  manufacturer?: string;
  text?: string;
};

type Provider = {
  name: string;
  verified: boolean;
  search: (q: SearchQuery) => Promise<Product[] | null>;
};

export const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/* ------------------------------ matching ------------------------------ */

const CATEGORY_WORDS: Record<string, string[]> = {
  PLC: ["plc", "plcs", "controller", "controllers", "cpu", "processor", "processors"],
  HMI: ["hmi", "hmis", "panelview", "operator", "terminal", "touchscreen", "touch"],
  "Drive / VFD": ["drive", "drives", "vfd", "vfds", "inverter", "inverters"],
  Servo: ["servo", "servos", "amplifier"],
  "Power Supply": ["power supply", "power supplies", "psu"],
  "I/O Module": ["i/o", "io", "input module", "output module"],
};

export function detectCategory(text: string): string | undefined {
  const t = ` ${text.toLowerCase()} `;
  for (const [cat, words] of Object.entries(CATEGORY_WORDS)) {
    if (words.some((w) => new RegExp(`(^|[^a-z0-9])${w.replace("/", "\\/")}([^a-z0-9]|$)`).test(t))) {
      return cat;
    }
  }
  return undefined;
}

function sameManufacturer(a: string, b?: string) {
  return !b || norm(a) === norm(b);
}

function matchProducts(catalog: Product[], q: SearchQuery): { type: MatchType; products: Product[] } {
  const pn = q.partNumber ? norm(q.partNumber) : "";

  if (pn.length >= 4) {
    const exact = catalog.filter(
      (p) =>
        norm(p.partNumber) === pn || (p.relatedParts || []).some((r) => norm(r) === pn)
    );
    if (exact.length) return { type: "exact", products: exact.slice(0, 3) };

    // Same family: one number is a prefix of the other and they share a long stem.
    const near = catalog.filter((p) => {
      const c = norm(p.partNumber);
      if (c.startsWith(pn) || pn.startsWith(c)) return Math.min(c.length, pn.length) >= 5;
      let i = 0;
      while (i < c.length && i < pn.length && c[i] === pn[i]) i++;
      return i >= 7 || (i >= 5 && i >= Math.min(c.length, pn.length) - 2);
    });
    if (near.length) return { type: "possible", products: near.slice(0, 3) };
  }

  const text = (q.text || "").toLowerCase();
  const category = detectCategory(text);
  const tokens = text.split(/[^a-z0-9/.-]+/).filter((t) => t.length > 2);
  if (!q.manufacturer && !category && tokens.length === 0) return { type: "none", products: [] };

  const scored = catalog
    .filter((p) => sameManufacturer(p.manufacturer, q.manufacturer))
    .map((p) => {
      const hay = `${p.name} ${p.description} ${(p.keywords || []).join(" ")}`.toLowerCase();
      let score = 0;
      if (category && p.category === category) score += 3;
      for (const t of tokens) if (hay.includes(t)) score += 1;
      if (q.manufacturer) score += 1;
      return { p, score };
    })
    // A bare manufacturer is a weak signal; a category or keyword hit is required.
    .filter((x) => x.score >= (q.manufacturer && !category && tokens.length === 0 ? 1 : 2))
    .sort((a, b) => b.score - a.score);

  // Obsolete parts are only worth surfacing for explicit part-number or legacy queries.
  const wantsLegacy = /legacy|obsolete|discontinued|old|slc|plc-?5/.test(text);
  const filtered = scored.filter(
    (x) => x.p.availability !== "Obsolete / Sourcing" || wantsLegacy
  );
  const products = filtered.slice(0, 4).map((x) => x.p);
  return { type: products.length ? "possible" : "none", products };
}

/* ------------------------------ providers ------------------------------ */

const liveProvider: Provider = {
  name: "live-api",
  verified: true,
  async search(q) {
    const url = (process.env.DOSUPPLY_CATALOG_API_URL || "").trim();
    if (!url) return null;
    try {
      const u = new URL(url);
      if (q.partNumber) u.searchParams.set("partNumber", q.partNumber);
      if (q.manufacturer) u.searchParams.set("manufacturer", q.manufacturer);
      if (q.text) u.searchParams.set("q", q.text);
      const key = (process.env.DOSUPPLY_CATALOG_API_KEY || "").trim();
      const res = await fetch(u, {
        headers: key ? { Authorization: `Bearer ${key}` } : undefined,
        signal: AbortSignal.timeout(6_000),
        cache: "no-store",
      });
      if (!res.ok) return null;
      // Contract: { products: Product[] } with the fields in ./types (demo=false).
      const body = (await res.json()) as { products?: Product[] };
      return (body.products || []).map((p) => ({ ...p, demo: false }));
    } catch (err) {
      console.error("[sales/inventory] live catalog lookup failed:", err);
      return null;
    }
  },
};

// Integration point: connect a DO Supply inventory database here.
const databaseProvider: Provider = {
  name: "database",
  verified: true,
  async search() {
    return null;
  },
};

let csvCache: { path: string; at: number; rows: Product[] } | null = null;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Header names: manufacturer, part_number, name, category, description, availability, qty, price, url, image */
async function loadCsv(): Promise<Product[]> {
  const path = (process.env.INVENTORY_CSV_PATH || "").trim();
  if (!path) return [];
  if (csvCache && csvCache.path === path && Date.now() - csvCache.at < 60_000) return csvCache.rows;
  try {
    const lines = (await readFile(path, "utf8")).split(/\r?\n/).filter(Boolean);
    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const col = (row: string[], name: string) => row[header.indexOf(name)] || "";
    const rows = lines.slice(1).map((l, i): Product => {
      const r = parseCsvLine(l);
      const qty = Number(col(r, "qty"));
      const price = Number(col(r, "price"));
      return {
        id: `csv-${i}`,
        manufacturer: col(r, "manufacturer"),
        partNumber: col(r, "part_number"),
        name: col(r, "name") || col(r, "part_number"),
        category: col(r, "category"),
        description: col(r, "description"),
        availability: (col(r, "availability") as Product["availability"]) || "Lead Time",
        qtyAvailable: Number.isFinite(qty) && col(r, "qty") ? qty : undefined,
        price: Number.isFinite(price) && col(r, "price") ? price : undefined,
        productUrl: col(r, "url") || undefined,
        imageUrl: col(r, "image") || undefined,
        demo: false,
      };
    });
    csvCache = { path, at: Date.now(), rows };
    return rows;
  } catch (err) {
    console.error("[sales/inventory] CSV import failed:", err);
    return [];
  }
}

const csvProvider: Provider = {
  name: "csv",
  verified: false,
  async search(q) {
    const rows = await loadCsv();
    if (!rows.length) return null;
    return matchProducts(rows, q).products;
  },
};

const demoProvider: Provider = {
  name: "demo",
  verified: false,
  async search(q) {
    return matchProducts(DEMO_PRODUCTS, q).products;
  },
};

const PROVIDERS = [liveProvider, databaseProvider, csvProvider, demoProvider];

/** Deterministic classification of whatever a provider returned against the query. */
function classify(products: Product[], q: SearchQuery): MatchType {
  if (!products.length) return "none";
  const pn = q.partNumber ? norm(q.partNumber) : "";
  if (pn && products.some((p) => norm(p.partNumber) === pn || (p.relatedParts || []).some((r) => norm(r) === pn))) {
    return "exact";
  }
  return "possible";
}

export async function searchInventory(q: SearchQuery): Promise<LookupResult> {
  const label = [q.manufacturer, q.partNumber, q.text].filter(Boolean).join(" ").trim();
  for (const provider of PROVIDERS) {
    const products = await provider.search(q);
    if (products && products.length) {
      return {
        query: label,
        matchType: classify(products, q),
        products,
        source: provider.name,
        verified: provider.verified,
        checkedAt: new Date().toISOString(),
      };
    }
  }
  return {
    query: label,
    matchType: "none",
    products: [],
    source: "none",
    verified: false,
    checkedAt: new Date().toISOString(),
  };
}

export function inventoryMode(): "live" | "csv" | "demo" {
  if ((process.env.DOSUPPLY_CATALOG_API_URL || "").trim()) return "live";
  if ((process.env.INVENTORY_CSV_PATH || "").trim()) return "csv";
  return "demo";
}
