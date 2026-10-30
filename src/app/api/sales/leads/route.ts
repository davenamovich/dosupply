import { NextRequest, NextResponse } from "next/server";
import { dashboardAllowed, dashboardNeedsPasscode } from "@/lib/sales/auth";
import { alertMode } from "@/lib/sales/conversation";
import { inventoryMode } from "@/lib/sales/inventory";
import { listLeads } from "@/lib/sales/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!dashboardAllowed(req)) {
    return NextResponse.json(
      { error: "Dashboard passcode required.", needsPasscode: dashboardNeedsPasscode() },
      { status: 401 }
    );
  }
  const leads = await listLeads();
  return NextResponse.json({
    leads,
    mode: { inventory: inventoryMode(), alerts: await alertMode() },
  });
}
