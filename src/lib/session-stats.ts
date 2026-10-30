/**
 * Real session counters for LIVE P&R MCP calls only.
 *
 * Integrity rule: these numbers are incremented exclusively after a
 * successful `mode:"live"` MCP response — never by demo/simulated content.
 * The UI labels them "Live engine session — real calls through this site" and
 * pairs them with the clearly-labeled demonstration projections.
 *
 * In-memory by design (no DB): a demo deployment's lifetime is one session.
 * Stored on globalThis so Next.js dev-mode module reloads keep the counts.
 */

export type StatKey =
  | "creative"
  | "multilang"
  | "video"
  | "audio"
  | "jobsCompleted";

type StatStore = {
  counts: Record<StatKey, number>;
  startedAt: number;
};

const g = globalThis as unknown as { __doSupplyEngineStats?: StatStore };

function store(): StatStore {
  if (!g.__doSupplyEngineStats) {
    g.__doSupplyEngineStats = {
      counts: {
        creative: 0,
        multilang: 0,
        video: 0,
        audio: 0,
        jobsCompleted: 0,
      },
      startedAt: Date.now(),
    };
  }
  return g.__doSupplyEngineStats;
}

/** Increment a live-call counter (call exactly once per successful MCP run). */
export function bumpStat(key: StatKey, n = 1): void {
  store().counts[key] += n;
}

export type EngineStats = Record<StatKey, number> & { sessionStartedAt: number };

export function getStats(): EngineStats {
  const s = store();
  return { ...s.counts, sessionStartedAt: s.startedAt };
}
