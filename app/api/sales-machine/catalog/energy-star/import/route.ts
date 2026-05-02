import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorToHttp, requireInternalUser } from "@/lib/session";
import { getCatalogWriteCompanyId, serializeCatalogItem } from "@/lib/sales/catalog/access";
import {
  getEnergyStarHeatPumpByProductId,
  type EnergyStarHeatPumpCatalogResult,
} from "@/lib/sales/catalog/energy-star";

export const runtime = "nodejs";

type ImportEnergyStarPayload = {
  sourceProductId: string;
  companyId?: string | null;
  cost?: number;
  pricingMode?: "FIXED_SELL_PRICE" | "COST_PLUS_MARGIN";
  sellPrice?: number | null;
  marginPercent?: number | null;
  isActive?: boolean;
};

export async function POST(request: NextRequest) {
  let session: Awaited<ReturnType<typeof requireInternalUser>>;
  try {
    session = await requireInternalUser();
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
    const body = (await request.json()) as ImportEnergyStarPayload;
    const sourceProductId = body.sourceProductId?.trim();
    if (!sourceProductId) {
      return NextResponse.json(
        { ok: false, error: "sourceProductId is required" },
        { status: 400 },
      );
    }

    const costInput = parseOptionalNonNegative(body.cost, "cost");
    const sellPriceInput = parseOptionalNullableNonNegative(
      body.sellPrice,
      "sellPrice",
    );
    const marginInput = parseOptionalNullableNonNegative(
      body.marginPercent,
      "marginPercent",
    );
    const companyId = getCatalogWriteCompanyId(session, body.companyId);
    const sourceItem = await getEnergyStarHeatPumpByProductId(sourceProductId);

    if (!sourceItem) {
      return NextResponse.json(
        { ok: false, error: "ENERGY STAR product was not found" },
        { status: 404 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.salesHvacCatalogItem.findFirst({
        where: {
          companyId,
          OR: [
            {
              sourceProvider: "ENERGY_STAR",
              sourceProductId: sourceItem.sourceProductId,
            },
            {
              equipmentType: "HEAT_PUMP",
              brand: sourceItem.brand,
              modelNumber: sourceItem.modelNumber,
            },
          ],
        },
      });

      const pricingMode =
        body.pricingMode || existing?.pricingMode || "COST_PLUS_MARGIN";
      const sellPrice =
        sellPriceInput !== undefined
          ? sellPriceInput
          : existing?.sellPrice
            ? Number(existing.sellPrice)
            : null;

      if (pricingMode === "FIXED_SELL_PRICE" && sellPrice === null) {
        throw new Error("sellPrice is required for fixed-price catalog items");
      }

      const data = {
        ...toCatalogSpecData(sourceItem),
        companyId,
        cost:
          costInput !== undefined
            ? costInput
            : existing
              ? Number(existing.cost)
              : 0,
        pricingMode,
        sellPrice,
        marginPercent:
          marginInput !== undefined
            ? marginInput
            : existing?.marginPercent ?? 35,
        isActive: body.isActive ?? existing?.isActive ?? true,
      };

      const item = existing
        ? await tx.salesHvacCatalogItem.update({
            where: { id: existing.id },
            data,
          })
        : await tx.salesHvacCatalogItem.create({ data });

      await tx.salesCatalogImportJob.create({
        data: {
          companyId,
          sourceProvider: "ENERGY_STAR",
          status: "COMPLETED",
          searchQuery: sourceItem.sourceProductId,
          importedCount: 1,
          skippedCount: 0,
          errorCount: 0,
          completedAt: new Date(),
          metadata: {
            created: !existing,
            sourceProductId: sourceItem.sourceProductId,
            brand: sourceItem.brand,
            modelNumber: sourceItem.modelNumber,
          },
        },
      });

      return { item, created: !existing };
    });

    return NextResponse.json({
      ok: true,
      created: result.created,
      item: serializeCatalogItem(result.item),
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

function toCatalogSpecData(sourceItem: EnergyStarHeatPumpCatalogResult) {
  return {
    equipmentType: sourceItem.equipmentType,
    brand: sourceItem.brand,
    modelNumber: sourceItem.modelNumber,
    sizeTonnage: sourceItem.sizeTonnage,
    efficiencyRating: sourceItem.efficiencyRating,
    description: sourceItem.description,
    sourceProvider: "ENERGY_STAR" as const,
    sourceProductId: sourceItem.sourceProductId,
    sourceDatasetId: sourceItem.sourceDatasetId,
    sourceSyncedAt: new Date(),
    sourceMetadata: sourceItem.sourceMetadata as Prisma.InputJsonValue,
    energyStarCertified: sourceItem.energyStarCertified,
    ahriReferenceNumber: sourceItem.ahriReferenceNumber,
    productType: sourceItem.productType,
    coldClimate: sourceItem.coldClimate,
    taxCreditEligible: sourceItem.taxCreditEligible,
    seer2: sourceItem.seer2,
    eer2: sourceItem.eer2,
    hspf2: sourceItem.hspf2,
    coolingCapacityBtu: sourceItem.coolingCapacityBtu,
    heatingCapacityBtu47: sourceItem.heatingCapacityBtu47,
    heatingCapacityBtu17: sourceItem.heatingCapacityBtu17,
    heatingCapacityBtu5: sourceItem.heatingCapacityBtu5,
    copAt5: sourceItem.copAt5,
    refrigerantType: sourceItem.refrigerantType,
  };
}

function parseOptionalNonNegative(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
  return value;
}

function parseOptionalNullableNonNegative(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
  return value;
}
