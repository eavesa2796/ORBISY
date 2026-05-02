import type { Prisma, SalesHvacCatalogItem } from "@prisma/client";
import {
  AuthError,
  isHvacRole,
  type ValidatedSession,
} from "@/lib/session";

export function getCatalogVisibilityWhere(
  session: ValidatedSession,
  extra?: Prisma.SalesHvacCatalogItemWhereInput,
): Prisma.SalesHvacCatalogItemWhereInput {
  const scopedWhere = isHvacRole(session.userRole)
    ? {
        OR: [
          { companyId: requireCatalogCompanyId(session) },
          { companyId: null },
        ],
      }
    : {};

  if (!extra || Object.keys(extra).length === 0) {
    return scopedWhere;
  }

  if (Object.keys(scopedWhere).length === 0) {
    return extra;
  }

  return { AND: [scopedWhere, extra] };
}

export function getCatalogMutableWhere(
  session: ValidatedSession,
  id: string,
): Prisma.SalesHvacCatalogItemWhereInput {
  if (!isHvacRole(session.userRole)) {
    return { id };
  }

  return {
    id,
    companyId: requireCatalogCompanyId(session),
  };
}

export function getCatalogWriteCompanyId(
  session: ValidatedSession,
  requestedCompanyId?: string | null,
) {
  if (isHvacRole(session.userRole)) {
    return requireCatalogCompanyId(session);
  }

  return requestedCompanyId?.trim() || null;
}

export function requireCatalogCompanyId(session: ValidatedSession) {
  if (!session.customerCompanyId) {
    throw new AuthError("HVAC user is not linked to a company workspace", 403);
  }

  return session.customerCompanyId;
}

export function serializeCatalogItem(item: SalesHvacCatalogItem) {
  return {
    id: item.id,
    companyId: item.companyId,
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
    sourceProvider: item.sourceProvider,
    sourceProductId: item.sourceProductId,
    sourceDatasetId: item.sourceDatasetId,
    sourceSyncedAt: item.sourceSyncedAt,
    energyStarCertified: item.energyStarCertified,
    ahriReferenceNumber: item.ahriReferenceNumber,
    productType: item.productType,
    coldClimate: item.coldClimate,
    taxCreditEligible: item.taxCreditEligible,
    seer2: item.seer2,
    eer2: item.eer2,
    hspf2: item.hspf2,
    afue: item.afue,
    coolingCapacityBtu: item.coolingCapacityBtu,
    heatingCapacityBtu47: item.heatingCapacityBtu47,
    heatingCapacityBtu17: item.heatingCapacityBtu17,
    heatingCapacityBtu5: item.heatingCapacityBtu5,
    copAt5: item.copAt5,
    refrigerantType: item.refrigerantType,
    isActive: item.isActive,
  };
}
