import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import type { Lead, Session } from "./types";

/**
 * Lead database.
 *
 * A JSON file under db/ (gitignored), matching the runtime-keys store. All
 * mutations run through one in-process queue and write atomically, so two
 * concurrent chat turns cannot lose each other's updates.
 *
 * Integration point: swap this module for Prisma/Postgres or a CRM write by
 * keeping the same exported functions. Container filesystems are ephemeral
 * (Railway), so mount a volume or move to a real database for anything beyond
 * a demo.
 */

type Shape = { leads: Lead[]; sessions: Session[] };

const FILE = path.join(process.cwd(), "db", "sales-leads.json");
const MAX_SESSIONS = 500;

let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<Shape> {
  try {
    const data = JSON.parse(await readFile(FILE, "utf8")) as Partial<Shape>;
    return { leads: data.leads || [], sessions: data.sessions || [] };
  } catch {
    return { leads: [], sessions: [] };
  }
}

async function write(data: Shape): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, FILE);
}

/** Run a read-modify-write transaction. The mutator returns the result to hand back. */
export function transact<T>(fn: (data: Shape) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const data = await read();
    const result = await fn(data);
    data.sessions = data.sessions.slice(-MAX_SESSIONS);
    await write(data);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function readOnly<T>(fn: (data: Shape) => T): Promise<T> {
  await queue;
  return fn(await read());
}

export const getSession = (id: string) =>
  readOnly((d) => d.sessions.find((s) => s.id === id) || null);

export const listLeads = () =>
  readOnly((d) => [...d.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

export const getLead = (id: string) => readOnly((d) => d.leads.find((l) => l.id === id) || null);
