import { prisma } from "@/lib/prisma";
export {
  DEFAULT_PROPOSAL_PRICING_SETTINGS,
  normalizeProposalPricingSettings,
  type ProposalPricingSettings,
} from "./settings-shared";
import {
  DEFAULT_PROPOSAL_PRICING_SETTINGS,
  normalizeProposalPricingSettings,
  type ProposalPricingSettings,
} from "./settings-shared";

function serializeProposalSettingsRow(row: {
  defaultLaborCost: { toString(): string } | number;
  defaultFinancingApr: number;
  defaultFinancingMonths: number;
  defaultWarrantyGood: string;
  defaultWarrantyBetter: string;
  defaultWarrantyBest: string;
  permitFeeDefault: { toString(): string } | number;
  taxRatePercent: number;
  companyProposalFooter: string;
  proposalDisclaimer: string;
}) {
  return normalizeProposalPricingSettings({
    defaultLaborCost: Number(row.defaultLaborCost),
    defaultFinancingApr: row.defaultFinancingApr,
    defaultFinancingMonths: row.defaultFinancingMonths,
    defaultWarrantyGood: row.defaultWarrantyGood,
    defaultWarrantyBetter: row.defaultWarrantyBetter,
    defaultWarrantyBest: row.defaultWarrantyBest,
    permitFeeDefault: Number(row.permitFeeDefault),
    taxRatePercent: row.taxRatePercent,
    companyProposalFooter: row.companyProposalFooter,
    proposalDisclaimer: row.proposalDisclaimer,
  });
}

export function getProposalSettingsId(companyId?: string | null) {
  return companyId ? `company:${companyId}` : "default";
}

export async function getProposalPricingSettings(
  companyId?: string | null,
): Promise<ProposalPricingSettings> {
  if (companyId) {
    const companyRow = await prisma.salesProposalSettings.findUnique({
      where: { companyId },
    });

    if (companyRow) {
      return serializeProposalSettingsRow(companyRow);
    }
  }

  const row = await prisma.salesProposalSettings.findUnique({
    where: { id: "default" },
  });

  if (!row) {
    return DEFAULT_PROPOSAL_PRICING_SETTINGS;
  }

  return serializeProposalSettingsRow(row);
}
