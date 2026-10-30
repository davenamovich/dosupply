#!/usr/bin/env bun
/**
 * Dashboard access levels: anyone gets a public view with contact details
 * hidden everywhere; only the admin passcode shows them or allows changes.
 *
 *   bun run tests/dashboard-access.ts
 */
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";

process.chdir(mkdtempSync(path.join(tmpdir(), "dash-access-")));
delete process.env.TELEGRAM_BOT_TOKEN;
delete process.env.TELEGRAM_CHAT_ID;
process.env.ADMIN_PASSCODE = "right";

const { dashboardRole, dashboardAllowed } = await import("../src/lib/sales/auth");
const { maskLead, maskText, maskEmail, maskPhone } = await import("../src/lib/sales/mask");
const { processMessage } = await import("../src/lib/sales/conversation");
const { listLeads } = await import("../src/lib/sales/store");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `\n        ${detail}` : ""}`);
}

const req = (code: string | null, ip = "1.1.1.1") =>
  ({ headers: new Headers({ "x-real-ip": ip, ...(code === null ? {} : { "x-dashboard-passcode": code }) }) }) as unknown as import("next/server").NextRequest;

// Roles
check("no passcode gives the public view, not an error", dashboardRole(req(null)) === "public");
check("the right passcode gives admin", dashboardRole(req("right")) === "admin");
check("a wrong passcode is denied", dashboardRole(req("wrong", "2.2.2.2")) === "denied");
check("changing things still needs the passcode", dashboardAllowed(req(null)) === false && dashboardAllowed(req("right")) === true);

// Masking
check("email is masked but keeps the domain", maskEmail("dana.reyes@brightpack.com") === "d***@brightpack.com");
check("phone keeps only the last four digits", maskPhone("919-555-0188") === "***-***-0188");
check("free text is masked", maskText("mail dana@acme.com or call (919) 555-0142 please") === "mail d***@acme.com or call ***-***-0142 please");

// A real lead, masked everywhere
let sid: string | undefined;
for (const line of ["I need 2 of 1756-L83E", "new", "dana.reyes@brightpack.com", "Dana Reyes, BrightPack, 919-555-0188"]) {
  sid = (await processMessage(sid, line)).sessionId;
}
const lead = (await listLeads())[0];
const raw = JSON.stringify(lead);
check("the raw lead does contain the contact details", raw.includes("dana.reyes@brightpack.com") && raw.includes("919-555-0188"));
const masked = JSON.stringify(maskLead(lead));
check("the public lead contains no email address", !masked.includes("dana.reyes@brightpack.com"), masked.match(/[\w.]+@[\w.]+/g)?.join(","));
check("the public lead contains no full phone number", !masked.includes("919-555-0188") && !masked.includes("555-0188"));
check("the public lead keeps the useful parts", masked.includes("1756-L83E") && masked.includes("Dana Reyes") && masked.includes("BrightPack"));
check("the Telegram message is masked too", !maskLead(lead).telegram.message.includes("dana.reyes@"));

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
