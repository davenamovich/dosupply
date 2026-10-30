import { NextRequest, NextResponse } from "next/server";
import { dashboardAllowed } from "@/lib/sales/auth";
import { getLead, transact } from "@/lib/sales/store";
import { notifyLead } from "@/lib/sales/telegram";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/sales/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  if (!dashboardAllowed(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const lead = await getLead((await ctx.params).id);
  return lead ? NextResponse.json({ lead }) : NextResponse.json({ error: "Not found." }, { status: 404 });
}

/** body: { status?: LeadStatus, retryAlert?: true } */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!dashboardAllowed(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await ctx.params;
  let body: { status?: string; retryAlert?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.status !== undefined && !LEAD_STATUSES.includes(body.status as LeadStatus)) {
    return NextResponse.json({ error: `status must be one of ${LEAD_STATUSES.join(", ")}.` }, { status: 400 });
  }
  const found = await transact((d) => {
    const lead = d.leads.find((l) => l.id === id);
    if (!lead) return false;
    if (body.status) {
      lead.status = body.status as LeadStatus;
      lead.updatedAt = new Date().toISOString();
    }
    return true;
  });
  if (!found) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (body.retryAlert) await notifyLead(id, { force: true });
  return NextResponse.json({ lead: await getLead(id) });
}
