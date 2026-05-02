import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorToHttp, requireInternalUser } from "@/lib/session";
import { getCatalogVisibilityWhere } from "@/lib/sales/catalog/access";
import { exportCatalogCsv } from "@/lib/sales/catalog/csv";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let session: Awaited<ReturnType<typeof requireInternalUser>>;
  try {
    session = await requireInternalUser();
  } catch (error) {
    const auth = authErrorToHttp(error);
    if (auth) {
      return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
    }
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeOnly = new URL(request.url).searchParams.get("activeOnly") === "true";
    const where = getCatalogVisibilityWhere(
      session,
      activeOnly ? { isActive: true } : undefined,
    );
    const items = await prisma.salesHvacCatalogItem.findMany({
      where,
      orderBy: [{ equipmentType: "asc" }, { brand: "asc" }, { modelNumber: "asc" }],
    });

    const csv = exportCatalogCsv(
      items.map((item) => ({
        equipmentType: item.equipmentType,
        brand: item.brand,
        modelNumber: item.modelNumber,
        sizeTonnage: item.sizeTonnage,
        efficiencyRating: item.efficiencyRating,
        cost: Number(item.cost),
        pricingMode: item.pricingMode,
        sellPrice: item.sellPrice ? Number(item.sellPrice) : null,
        marginPercent: item.marginPercent,
        description: item.description,
        imageUrl: item.imageUrl,
        brochureUrl: item.brochureUrl,
        isActive: item.isActive,
      })),
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=hvac-catalog.csv",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
