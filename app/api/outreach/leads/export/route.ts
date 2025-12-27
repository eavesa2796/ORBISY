/**
 * GET /api/outreach/leads/export - Export leads to CSV
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exportToCsv, LeadCsvRow } from "@/lib/outreach/csv";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const leads = await prisma.outreachLead.findMany({
      orderBy: { createdAt: "desc" },
    });

    const csvData: LeadCsvRow[] = leads.map((lead) => ({
      company: lead.company,
      contactName: lead.contactName,
      role: lead.role || undefined,
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      website: lead.website || undefined,
      city: lead.city || undefined,
      industry: lead.industry || undefined,
      score: lead.score,
      tags: lead.tags.join(";"),
      notes: lead.notes || undefined,
    }));

    const csv = exportToCsv(csvData);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=leads.csv",
      },
    });
  } catch (error) {
    console.error("Error exporting leads:", error);
    return NextResponse.json(
      { error: "Failed to export leads" },
      { status: 500 }
    );
  }
}
