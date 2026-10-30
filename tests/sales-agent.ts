#!/usr/bin/env bun
/**
 * Engine-level test for the DO Supply Sales Agent. Runs the real conversation
 * engine, lead store and (simulated) Telegram service against a throwaway
 * database, so it needs no server and no credentials.
 *
 *   bun run tests/sales-agent.ts
 */
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";

// The store resolves db/ from cwd, so point cwd at a scratch directory first.
const scratch = mkdtempSync(path.join(tmpdir(), "sales-agent-"));
process.chdir(scratch);
delete process.env.TELEGRAM_BOT_TOKEN;
delete process.env.TELEGRAM_CHAT_ID;
delete process.env.DOSUPPLY_CATALOG_API_URL;
delete process.env.INVENTORY_CSV_PATH;

const { processMessage } = await import("../src/lib/sales/conversation");
const { listLeads, getSession } = await import("../src/lib/sales/store");
const { searchInventory } = await import("../src/lib/sales/inventory");
const { DEMO_PRODUCTS } = await import("../src/lib/sales/demo-products");
const { extract } = await import("../src/lib/sales/extract");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `\n        ${detail}` : ""}`);
}

async function convo(lines: string[]) {
  let sessionId: string | undefined;
  const replies: string[] = [];
  let last: Awaited<ReturnType<typeof processMessage>> | undefined;
  for (const line of lines) {
    last = await processMessage(sessionId, line);
    sessionId = last.sessionId;
    replies.push(last.messages.map((m) => m.text).join("\n"));
  }
  return { sessionId: sessionId!, replies, last: last! };
}

// --- Catalog sanity -------------------------------------------------------
check("demo catalog has 20-30 products", DEMO_PRODUCTS.length >= 20 && DEMO_PRODUCTS.length <= 30, String(DEMO_PRODUCTS.length));
const mfrs = new Set(DEMO_PRODUCTS.map((p) => p.manufacturer));
check(
  "all seven manufacturers covered",
  ["Allen-Bradley", "Siemens", "Mitsubishi", "Omron", "Schneider Electric", "GE/Emerson", "Eaton"].every((m) => mfrs.has(m))
);
check("no invented prices", DEMO_PRODUCTS.every((p) => p.price === undefined));

// --- Extraction -----------------------------------------------------------
const e1 = extract("I need 3 of 1756-L83E and 10 x 1756-IB16, email me at buyer@acme.com or 919-555-0142");
check("extracts part numbers", e1.parts.join() === "1756-L83E,1756-IB16", e1.parts.join());
check("extracts email and phone", e1.email === "buyer@acme.com" && !!e1.phone);
check("recognizes manufacturer", extract("looking for an Allen-Bradley PLC").manufacturers[0] === "Allen-Bradley");
check("spaced Siemens number", extract("6ES7 315-2AH14-0AB0 please").parts[0] === "6ES7315-2AH14-0AB0");
check("spelled quantity", extract("Three.", "qty").quantity === 3);

// --- Inventory ------------------------------------------------------------
const exact = await searchInventory({ partNumber: "1756 l83e" });
check("exact part lookup ignores punctuation/case", exact.matchType === "exact" && exact.products[0].partNumber === "1756-L83E");
check("demo lookups are never marked verified", exact.verified === false);
const none = await searchInventory({ partNumber: "ZZ9999-NOPE" });
check("unknown part is 'none', not guessed", none.matchType === "none" && none.products.length === 0);
const byMfr = await searchInventory({ manufacturer: "Siemens", text: "I need a Siemens HMI" });
check("manufacturer + type search", byMfr.products.length > 0 && byMfr.products.every((p) => p.manufacturer === "Siemens" && p.category === "HMI"));

// --- Acceptance scenario --------------------------------------------------
const a = await convo([
  "I'm looking for an Allen-Bradley PLC.",
  "1756-L83E",
  "Three.",
  "New please",
  "dave@acmeplastics.com",
  "Dave Miller, Acme Plastics",
]);
const askedQty = a.replies[1].toLowerCase().includes("how many");
check("agent asks for quantity after part number", askedQty, a.replies[1]);
check("agent shows product card for exact match", a.last.messages.length > 0 && (await getSession(a.sessionId))!.items[0]?.lookup?.matchType === "exact");
check("no question repeated", new Set(a.replies.map((r) => r.split("\n").pop())).size === a.replies.length);
const leads1 = await listLeads();
check("lead saved after details complete", leads1.length === 1, String(leads1.length));
const lead = leads1[0];
check("lead has contact + product + qty", lead?.customer.email === "dave@acmeplastics.com" && lead.customer.name === "Dave Miller" && lead.customer.company === "Acme Plastics" && lead.items[0]?.partNumber === "1756-L83E" && lead.items[0]?.quantity === 3, JSON.stringify(lead?.customer) + JSON.stringify(lead?.items.map((i) => [i.partNumber, i.quantity])));
check("lead carries full transcript", (lead?.transcript.length || 0) >= 12, String(lead?.transcript.length));
check("simulated Telegram message generated", lead?.telegram.status === "simulated" && lead.telegram.message.startsWith("🚨 NEW DO SUPPLY SALES LEAD") && lead.telegram.message.includes("Part Number: 1756-L83E"));
check("customer is NOT told a (simulated) alert was sent", !a.replies[5].includes("I'm sending this to our sales team now"), a.replies[5]);
check("lead does not show Notified without delivery", lead?.status === "New");

// Extra messages after the lead exists must not create a second lead or alert.
const more = await processMessage(a.sessionId, "Also need a PowerFlex 525 drive, ship to Raleigh NC");
check("later messages reuse the same lead", (await listLeads()).length === 1 && more.leadId === lead.id);

// --- Scenario: unknown part -> sourcing request ---------------------------
const b = await convo(["Need 2 of ABC-12345-XYZ", "bob@plant.io", "Bob, Plant Co"]);
const leadB = (await listLeads()).find((l) => l.items[0]?.partNumber === "ABC-12345-XYZ");
check("not-found part uses the exact fallback wording", b.replies[0].includes("I can help you request a quote for that part. Let me collect a few details so our sales team can confirm availability and pricing."), b.replies[0]);
check("not-found part becomes a Sourcing Request", leadB?.kind === "Sourcing Request", leadB?.kind);

// --- Scenario: obsolete part ----------------------------------------------
const c = await convo(["Do you have a 1747-L542?", "1", "no preference", "ops@millworks.com", "Sam Ortiz at Millworks"]);
check("obsolete part flagged as sourcing, not stock", /legacy part/.test(c.replies[0]) && !/in stock/i.test(c.replies[0]), c.replies[0]);

// --- Scenario: multiple parts ---------------------------------------------
const d = await convo(["I need 2 of 1756-L83E and 10 of 1756-IB16", "new", "pat@fab.com", "Pat Lee, Fab Inc"]);
const leadD = (await listLeads()).find((l) => l.customer.email === "pat@fab.com");
check("multiple parts captured with their own quantities", leadD?.items.length === 2 && leadD.items[0].quantity === 2 && leadD.items[1].quantity === 10, JSON.stringify(leadD?.items.map((i) => [i.partNumber, i.quantity])));
check("multi-part Telegram message lists both", (leadD?.telegram.message.match(/🔧 PRODUCT REQUEST/g) || []).length === 2);

// --- Scenario: replacement -------------------------------------------------
const r = await convo(["Find a replacement", "1756-L73", "2", "any", "eng@mill.com", "Eve Kim, Mill Co"]);
const leadR = (await listLeads()).find((l) => l.customer.email === "eng@mill.com");
check("replacement request never claims interchangeability", /can't confirm|verify/i.test(r.replies[1]) && !/direct replacement|drop-in replacement for/i.test(r.replies[1]), r.replies[1]);
check("replacement lead kind", leadR?.kind === "Replacement Request", leadR?.kind);

// --- Scenario: talk to sales ------------------------------------------------
const h = await convo(["Talk to sales", "lee@shop.com", "Lee Park, Shop LLC"]);
const leadH = (await listLeads()).find((l) => l.customer.email === "lee@shop.com");
check("human request becomes a callback lead", leadH?.kind === "Sales Callback Request", leadH?.kind);

// --- Manufacturer only ------------------------------------------------------
const m = await convo(["I need a Siemens HMI"]);
check("manufacturer-only request shows catalog cards", m.last.messages.some((x) => (x.cards?.length || 0) > 0));

// --- The six on-screen demo scenarios each produce a lead -----------------
const { SCENARIOS } = await import("../src/components/sales/scenarios");
for (const sc of SCENARIOS) {
  const before = (await listLeads()).length;
  const run = await convo(sc.lines);
  const after = await listLeads();
  check(`scenario "${sc.title}" ends in a saved lead`, after.length === before + 1 && !!run.last.leadId, run.replies.slice(-2).join(" || "));
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
