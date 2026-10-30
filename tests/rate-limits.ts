#!/usr/bin/env bun
/**
 * Rate-limit checks: the shared limiter, client IP detection, passcode
 * lockout and the per-address and global lead caps. No server or network.
 *
 *   bun run tests/rate-limits.ts
 */
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";

process.chdir(mkdtempSync(path.join(tmpdir(), "rate-limits-")));
delete process.env.TELEGRAM_BOT_TOKEN;
delete process.env.TELEGRAM_CHAT_ID;
process.env.ADMIN_PASSCODE = "right";

const { rateLimit, globalLimit, clientIp, guessesBlocked, recordFailedGuess } = await import("../src/lib/ai");
const { dashboardAllowed } = await import("../src/lib/sales/auth");
const { processMessage } = await import("../src/lib/sales/conversation");
const { listLeads } = await import("../src/lib/sales/store");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `\n        ${detail}` : ""}`);
}
const req = (headers: Record<string, string>) => new Request("http://x/", { headers });

// Limiter
const hits = Array.from({ length: 5 }, () => rateLimit("t:a", 3, 60_000));
check("limiter allows up to the limit then refuses", hits.join() === "true,true,true,false,false");
check("buckets are independent per key", rateLimit("t:b", 3, 60_000) === true);
check("a window that has passed resets the bucket", (rateLimit("t:c", 1, 1), true) && (await new Promise((r) => setTimeout(r, 5)), rateLimit("t:c", 1, 1)));
check("global limit is shared by every caller", [globalLimit("g", 2), globalLimit("g", 2), globalLimit("g", 2)].join() === "true,true,false");

// Client IP: a spoofed leading X-Forwarded-For entry must not choose the bucket
check("X-Real-IP wins", clientIp(req({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "9.9.9.9" })) === "1.1.1.1");
check("last forwarded hop is used, not the spoofable first", clientIp(req({ "x-forwarded-for": "6.6.6.6, 2.2.2.2" })) === "2.2.2.2");
check("no headers falls back to local", clientIp(req({})) === "local");

// Passcode lockout
const nreq = (code: string | null, ip: string) =>
  ({ headers: new Headers({ "x-real-ip": ip, ...(code === null ? {} : { "x-dashboard-passcode": code }) }) }) as unknown as import("next/server").NextRequest;
check("the right passcode is accepted", dashboardAllowed(nreq("right", "3.3.3.3")) === true);
check("asking with no passcode is refused but is not counted as a guess", dashboardAllowed(nreq(null, "4.4.4.4")) === false && !guessesBlocked("4.4.4.4"));
for (let i = 0; i < 10; i++) dashboardAllowed(nreq(`wrong${i}`, "5.5.5.5"));
check("ten wrong guesses lock the address out", guessesBlocked("5.5.5.5") === true);
check("even the right passcode is refused while locked out", dashboardAllowed(nreq("right", "5.5.5.5")) === false);
check("another address is unaffected", dashboardAllowed(nreq("right", "6.6.6.6")) === true);
recordFailedGuess("7.7.7.7");
check("a single wrong guess does not lock anyone out", guessesBlocked("7.7.7.7") === false);

// Lead caps
async function lead(email: string, ip: string) {
  let sid: string | undefined;
  let last;
  for (const line of ["I need 1 of 1756-L83E", "new", email, "Al B, BCo"]) {
    last = await processMessage(sid, line, ip);
    sid = last.sessionId;
  }
  return last!;
}
let made = 0;
let blocked = false;
for (let i = 0; i < 42; i++) {
  const out = await lead(`u${i}@x.com`, "8.8.8.8");
  if (out.leadId) made++;
  else if (out.messages.some((m) => m.text.includes("can't submit another request"))) blocked = true;
}
check("one address can create 40 leads an hour, no more", made === 40 && blocked, `made ${made}, blocked ${blocked}`);
check("blocked requests did not create leads", (await listLeads()).length === 40);
const other = await lead("other@x.com", "9.9.9.9");
check("a different address can still submit", Boolean(other.leadId));

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
