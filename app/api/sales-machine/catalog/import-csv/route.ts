import { NextRequest, NextResponse } from "next/server";
import type { SalesEquipmentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authErrorToHttp, requireInternalUser } from "@/lib/session";
import { getCatalogWriteCompanyId } from "@/lib/sales/catalog/access";
import { parseCatalogCsv } from "@/lib/sales/catalog/csv";
import { importCatalogRows } from "@/lib/sales/catalog/import";

export const runtime = "nodejs";

async function readCsvFromRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (file instanceof File) {
      return await file.text();
    }
    const csvText = formData.get("csvText");
    if (typeof csvText === "string") {
      return csvText;
    }
    return "";
  }

  const body = (await request.json().catch(() => ({}))) as { csvText?: string };
  return body.csvText || "";
}

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
    const csvText = await readCsvFromRequest(request);
    if (!csvText.trim()) {
      return NextResponse.json(
        { ok: false, error: "CSV input is required" },
        { status: 400 },
      );
    }

    const parsed = parseCatalogCsv(csvText);
    const companyId = getCatalogWriteCompanyId(session);

    const summary = await importCatalogRows(
      parsed.rows,
      {
        findExisting: async (key) => {
          const existing = await prisma.salesHvacCatalogItem.findFirst({
            where: {
              companyId,
              equipmentType: key.equipmentType as SalesEquipmentType,
              brand: key.brand,
              modelNumber: key.modelNumber,
            },
          });
          if (!existing) return null;
          return {
            id: existing.id,
            equipmentType: existing.equipmentType,
            brand: existing.brand,
            modelNumber: existing.modelNumber,
            sizeTonnage: existing.sizeTonnage,
            efficiencyRating: existing.efficiencyRating,
            cost: Number(existing.cost),
            pricingMode: existing.pricingMode,
            sellPrice: existing.sellPrice ? Number(existing.sellPrice) : null,
            marginPercent: existing.marginPercent,
            description: existing.description,
            imageUrl: existing.imageUrl,
            brochureUrl: existing.brochureUrl,
            isActive: existing.isActive,
          };
        },
        createItem: async (row) => {
          await prisma.salesHvacCatalogItem.create({
            data: {
              companyId,
              equipmentType: row.equipmentType as SalesEquipmentType,
              brand: row.brand,
              modelNumber: row.modelNumber,
              sizeTonnage: row.sizeTonnage,
              efficiencyRating: row.efficiencyRating,
              cost: row.cost,
              pricingMode: row.pricingMode,
              sellPrice: row.sellPrice,
              marginPercent: row.marginPercent,
              description: row.description,
              imageUrl: row.imageUrl,
              brochureUrl: row.brochureUrl,
              sourceProvider: "CSV",
              sourceSyncedAt: new Date(),
              isActive: row.isActive,
            },
          });
        },
        updateItem: async (id, row) => {
          await prisma.salesHvacCatalogItem.update({
            where: { id },
            data: {
              sizeTonnage: row.sizeTonnage,
              efficiencyRating: row.efficiencyRating,
              cost: row.cost,
              pricingMode: row.pricingMode,
              sellPrice: row.sellPrice,
              marginPercent: row.marginPercent,
              description: row.description,
              imageUrl: row.imageUrl,
              brochureUrl: row.brochureUrl,
              isActive: row.isActive,
            },
          });
        },
      },
      parsed.errors,
    );

    return NextResponse.json({
      ok: true,
      summary: {
        created: summary.created,
        updated: summary.updated,
        skipped: summary.skipped,
        errors: summary.errors,
      },
      rowErrors: summary.rowErrors,
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
