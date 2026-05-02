import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorToHttp, requireInternalUser } from "@/lib/session";
import {
  getCatalogMutableWhere,
  serializeCatalogItem,
} from "@/lib/sales/catalog/access";

export const runtime = "nodejs";

type UpdateCatalogPayload = {
  equipmentType?:
    | "CONDENSER"
    | "AIR_HANDLER"
    | "FURNACE"
    | "HEAT_PUMP"
    | "COIL"
    | "PACKAGE_UNIT"
    | "THERMOSTAT"
    | "IAQ"
    | "OTHER";
  brand?: string;
  modelNumber?: string;
  sizeTonnage?: string | null;
  efficiencyRating?: string | null;
  cost?: number;
  pricingMode?: "FIXED_SELL_PRICE" | "COST_PLUS_MARGIN";
  sellPrice?: number | null;
  marginPercent?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  brochureUrl?: string | null;
  isActive?: boolean;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  try {
    const body = (await request.json()) as UpdateCatalogPayload;
    const existing = await prisma.salesHvacCatalogItem.findFirst({
      where: getCatalogMutableWhere(session, id),
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Catalog item not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.salesHvacCatalogItem.update({
      where: { id: existing.id },
      data: {
        ...(body.equipmentType !== undefined ? { equipmentType: body.equipmentType } : {}),
        ...(body.brand !== undefined ? { brand: body.brand.trim() } : {}),
        ...(body.modelNumber !== undefined ? { modelNumber: body.modelNumber.trim() } : {}),
        ...(body.sizeTonnage !== undefined ? { sizeTonnage: body.sizeTonnage } : {}),
        ...(body.efficiencyRating !== undefined ? { efficiencyRating: body.efficiencyRating } : {}),
        ...(body.cost !== undefined ? { cost: body.cost } : {}),
        ...(body.pricingMode !== undefined ? { pricingMode: body.pricingMode } : {}),
        ...(body.sellPrice !== undefined ? { sellPrice: body.sellPrice } : {}),
        ...(body.marginPercent !== undefined ? { marginPercent: body.marginPercent } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        ...(body.brochureUrl !== undefined ? { brochureUrl: body.brochureUrl } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      item: serializeCatalogItem(updated),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
