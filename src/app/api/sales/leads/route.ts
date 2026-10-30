import { NextRequest, NextResponse } from "next/server";
import { dashboardRole } from "@/lib/sales/auth";
import { maskLead } from "@/lib/sales/mask";
import { alertMode } from "@/lib/sales/conversation";
import { inventoryMode } from "@/lib/sales/inventory";
import { listLeads } from "@/lib/sales/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const role = dashboardRole(req);
  if (role === "denied") {
    return NextResponse.json({ error: "That passcode did not work." }, { status: 401 });
  }
  const leads = await listLeads();
  return NextResponse.json({
    role,
    // The public view hides emails and phone numbers everywhere they can appear.
    leads: role === "admin" ? leads : leads.map(maskLead),
    mode: { inventory: inventoryMode(), alerts: await alertMode() },
  });
}
