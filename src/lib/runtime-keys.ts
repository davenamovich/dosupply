import { readFile, writeFile, chmod } from "fs/promises";
import path from "path";

/**
 * Server-side BYOK (bring-your-own-key) runtime store.
 *
 * Purpose: let the site owner (Dave) paste API keys ONCE from the P&R Studio
 * setup panel. Keys are stored server-side only (a 0600 JSON file under db/),
 * never returned raw to any client — every API response masks them.
 * Resolution order for each service: runtime store first, then env var.
 */

export type ServiceKey = "plunder_riffle" | "exa";

const STORE_PATH = path.join(process.cwd(), "db", "runtime-keys.json");
const SERVICES: ServiceKey[] = ["plunder_riffle", "exa"];

type KeyEntry = { value: string; setAt: string };
type StoreShape = Partial<Record<ServiceKey, KeyEntry>>;

let cache: { data: StoreShape; at: number } | null = null;
const CACHE_TTL_MS = 3_000;

function envName(service: ServiceKey): string {
  return service === "plunder_riffle" ? "PLUNDER_RIFFLE_API_KEY" : "EXA_API_KEY";
}

async function readStore(): Promise<StoreShape> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const data = JSON.parse(raw) as StoreShape;
    cache = { data, at: Date.now() };
    return data;
  } catch {
    cache = { data: {}, at: Date.now() };
    return cache.data;
  }
}

async function writeStore(data: StoreShape): Promise<void> {
  const body = JSON.stringify(data, null, 2);
  try {
    await writeFile(STORE_PATH, body, { mode: 0o600 });
    await chmod(STORE_PATH, 0o600).catch(() => {});
    cache = { data, at: Date.now() };
  } catch (err) {
    cache = { data, at: Date.now() };
    console.error("[runtime-keys] persist failed (kept in memory):", err);
  }
}

/** The resolved raw key for a service (runtime first, then env). Server-side only. */
export async function resolveKey(service: ServiceKey): Promise<string | null> {
  const store = await readStore();
  const entry = store[service];
  if (entry && entry.value.trim()) return entry.value.trim();
  const env = process.env[envName(service)];
  if (env && env.trim()) return env.trim();
  return null;
}

export async function setRuntimeKey(service: ServiceKey, value: string): Promise<void> {
  const store = await readStore();
  store[service] = { value: value.trim(), setAt: new Date().toISOString() };
  await writeStore(store);
}

export async function clearRuntimeKey(service: ServiceKey): Promise<void> {
  const store = await readStore();
  delete store[service];
  await writeStore(store);
}

/** Masked preview — safe to send to the client. Never includes the raw key. */
export function maskKey(value: string): string {
  const v = value.trim();
  if (v.length <= 8) return "••••••••";
  return `${v.slice(0, 3)}${"•".repeat(Math.min(10, Math.max(4, v.length - 8)))}${v.slice(-4)}`;
}

export type KeyStatus = {
  service: ServiceKey;
  configured: boolean;
  masked: string | null;
  source: "runtime" | "env" | null;
  setAt: string | null;
};

export async function keyStatus(service: ServiceKey): Promise<KeyStatus> {
  const store = await readStore();
  const entry = store[service];
  if (entry && entry.value.trim()) {
    return {
      service,
      configured: true,
      masked: maskKey(entry.value),
      source: "runtime",
      setAt: entry.setAt,
    };
  }
  const env = process.env[envName(service)];
  if (env && env.trim()) {
    return {
      service,
      configured: true,
      masked: maskKey(env),
      source: "env",
      setAt: null,
    };
  }
  return { service, configured: false, masked: null, source: null, setAt: null };
}

export async function allKeyStatuses(): Promise<KeyStatus[]> {
  return Promise.all(SERVICES.map(keyStatus));
}

/** Simple passcode gate for the setup panel (demo deployment). */
export function passcodeValid(input: string | undefined | null): boolean {
  const expected = process.env.ADMIN_PASSCODE || "demo";
  return typeof input === "string" && input.length > 0 && input === expected;
}
