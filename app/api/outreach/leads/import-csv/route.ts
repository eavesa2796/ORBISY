/**
 * POST /api/outreach/leads/import-csv - Import leads from CSV
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/outreach/csv";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csv } = body;

    if (!csv) {
      return NextResponse.json(
        { error: "CSV data is required" },
        { status: 400 }
      );
    }

    const { leads, errors } = parseCsv(csv);

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "CSV parsing errors",
          details: errors,
        },
        { status: 400 }
      );
    }

    // Import leads with deduplication
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const leadData of leads) {
      try {
        // Check for duplicate by email
        if (leadData.email) {
          const existing = await prisma.outreachLead.findUnique({
            where: { email: leadData.email },
          });

          if (existing) {
            results.skipped++;
            continue;
          }
        }

        await prisma.outreachLead.create({
          data: {
            company: leadData.company,
            contactName: leadData.contactName,
            role: leadData.role,
            email: leadData.email,
            phone: leadData.phone,
            website: leadData.website,
            city: leadData.city,
            industry: leadData.industry,
            score: leadData.score || 50,
            tags: leadData.tags ? leadData.tags.split(";") : [],
            notes: leadData.notes,
          },
        });

        results.imported++;
      } catch (err) {
        results.errors.push(
          `Failed to import ${leadData.company}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.imported,
      skipped: results.skipped,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Error importing CSV:", error);
    return NextResponse.json(
      { error: "Failed to import CSV" },
      { status: 500 }
    );
  }
}
