import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorToHttp, requireInternalUser } from "@/lib/session";
import {
  getCatalogVisibilityWhere,
  getCatalogWriteCompanyId,
  serializeCatalogItem,
} from "@/lib/sales/catalog/access";

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
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500);
    const where = getCatalogVisibilityWhere(
      session,
      activeOnly ? { isActive: true } : undefined,
    );

    const items = await prisma.salesHvacCatalogItem.findMany({
      where,
      orderBy: [{ companyId: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });

    return NextResponse.json({
      ok: true,
      count: items.length,
      items: items.map(serializeCatalogItem),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}

type CreateCatalogPayload = {
  equipmentType:
    | "CONDENSER"
    | "AIR_HANDLER"
    | "FURNACE"
    | "HEAT_PUMP"
    | "COIL"
    | "PACKAGE_UNIT"
    | "THERMOSTAT"
    | "IAQ"
    | "OTHER";
  brand: string;
  modelNumber: string;
  sizeTonnage?: string;
  efficiencyRating?: string;
  cost: number;
  pricingMode?: "FIXED_SELL_PRICE" | "COST_PLUS_MARGIN";
  sellPrice?: number;
  marginPercent?: number;
  description?: string;
  imageUrl?: string;
  brochureUrl?: string;
  isActive?: boolean;
  companyId?: string | null;
};

export async function POST(request: NextRequest) {
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
    const body = (await request.json()) as CreateCatalogPayload;

    if (!body.equipmentType || !body.brand?.trim() || !body.modelNumber?.trim()) {
      return NextResponse.json(
        { ok: false, error: "equipmentType, brand, and modelNumber are required" },
        { status: 400 },
      );
    }
    if (typeof body.cost !== "number" || !Number.isFinite(body.cost) || body.cost < 0) {
      return NextResponse.json({ ok: false, error: "cost must be a valid non-negative number" }, { status: 400 });
    }

    const pricingMode = body.pricingMode || "COST_PLUS_MARGIN";
    const companyId = getCatalogWriteCompanyId(session, body.companyId);

    if (pricingMode === "FIXED_SELL_PRICE" && (body.sellPrice === undefined || body.sellPrice < 0)) {
      return NextResponse.json(
        { ok: false, error: "sellPrice is required for FIXED_SELL_PRICE mode" },
        { status: 400 },
      );
    }

    const created = await prisma.salesHvacCatalogItem.create({
      data: {
        companyId,
        equipmentType: body.equipmentType,
        brand: body.brand.trim(),
        modelNumber: body.modelNumber.trim(),
        sizeTonnage: body.sizeTonnage?.trim() || undefined,
        efficiencyRating: body.efficiencyRating?.trim() || undefined,
        cost: body.cost,
        pricingMode,
        sellPrice: body.sellPrice,
        marginPercent: body.marginPercent,
        description: body.description?.trim() || undefined,
        imageUrl: body.imageUrl?.trim() || undefined,
        brochureUrl: body.brochureUrl?.trim() || undefined,
        sourceProvider: "MANUAL",
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({
      ok: true,
      item: serializeCatalogItem(created),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
