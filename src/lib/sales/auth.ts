import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { clientIp, guessesBlocked, recordFailedGuess } from "@/lib/ai";

/**
 * Two access levels. Anyone can open the dashboard and see the leads with
 * contact details hidden ("public"). Everything that changes something or
 * shows a secret (status changes, retries, the Telegram panel and its connect
 * links) needs the admin passcode, sent as x-dashboard-passcode.
 *
 * With ADMIN_PASSCODE unset, admin is open outside production (local demos)
 * and unavailable in production, where only the masked public view works.
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

export type DashboardRole = "admin" | "public" | "denied";

/** "denied" means a passcode was sent and it was wrong (or the address is locked out). */
export function dashboardRole(req: NextRequest): DashboardRole {
  if (req.headers.get("x-dashboard-passcode") === null) {
    return dashboardAllowed(req) ? "admin" : "public";
  }
  return dashboardAllowed(req) ? "admin" : "denied";
}
