import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { clientIp, guessesBlocked, recordFailedGuess } from "@/lib/ai";

/**
 * Dashboard gate. Leads contain customer contact details, so when
 * ADMIN_PASSCODE is set the dashboard API requires it (x-dashboard-passcode).
 * With it unset, access is open outside production for local demos and closed
 * in production.
 */
export function dashboardAllowed(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSCODE?.trim();
  if (!expected) return process.env.NODE_ENV !== "production";
  const given = req.headers.get("x-dashboard-passcode");
  if (given === null) return false; // the page asking before the passcode is typed is not a guess
  const ip = clientIp(req);
  if (guessesBlocked(ip)) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length === b.length && timingSafeEqual(a, b)) return true;
  recordFailedGuess(ip);
  return false;
}

export function dashboardNeedsPasscode(): boolean {
  return Boolean(process.env.ADMIN_PASSCODE?.trim());
}
