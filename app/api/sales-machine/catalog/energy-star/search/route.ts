import { NextRequest, NextResponse } from "next/server";
import { authErrorToHttp, requireInternalUser } from "@/lib/session";
import { searchEnergyStarHeatPumps } from "@/lib/sales/catalog/energy-star";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireInternalUser();
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json(
        { ok: false, error: auth.message },
        { status: auth.status },
      );
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
      50,
    );

    if (query.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: "Enter at least 2 characters to search" },
        { status: 400 },
      );
    }

    const results = await searchEnergyStarHeatPumps(query, limit);

    return NextResponse.json({
      ok: true,
      count: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
