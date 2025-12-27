/**
 * GET /api/outreach/metrics/dashboard - Get dashboard metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { getDashboardMetrics } from "@/lib/outreach/metrics";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const metrics = await getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
