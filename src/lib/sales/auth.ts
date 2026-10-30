import type { NextRequest } from "next/server";

/**
 * Dashboard gate. Leads contain customer contact details, so when
 * ADMIN_PASSCODE is set the dashboard API requires it (x-dashboard-passcode).
 * With it unset, access is open outside production for local demos and closed
 * in production.
 */
export function dashboardAllowed(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSCODE?.trim();
  if (!expected) return process.env.NODE_ENV !== "production";
  return req.headers.get("x-dashboard-passcode") === expected;
}

export function dashboardNeedsPasscode(): boolean {
  return Boolean(process.env.ADMIN_PASSCODE?.trim());
}
