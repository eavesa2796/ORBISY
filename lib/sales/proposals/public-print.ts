export type PublicPrintAddonLine = {
  id: string;
  type: "ADDON" | "DISCOUNT" | "REBATE";
  label: string;
  amount: number;
};

export type PublicPrintOption = {
  id: string;
  tier: "GOOD" | "BETTER" | "BEST";
  title: string;
  summary: string | null;
  warrantyLabel: string | null;
  financingApr: number | null;
  financingMonths: number | null;
  monthlyPaymentEstimate: number | null;
  equipmentSnapshot: {
    brand?: string;
    modelNumber?: string;
    equipmentType?: string;
    efficiencyRating?: string;
    sizeTonnage?: string;
  } | null;
  permitFee: number;
  taxRatePercent: number;
  taxAmount: number;
  preTaxCustomerPrice: number;
  addonsTotal: number;
  discountsTotal: number;
  rebatesTotal: number;
  finalCustomerPrice: number;
  addonLines: PublicPrintAddonLine[];
};

export type PublicPrintProposalInput = {
  id: string;
  publicToken: string;
  title: string;
  notes: string | null;
  companyProposalFooter: string | null;
  proposalDisclaimer: string | null;
  status: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED";
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  selectedOptionId: string | null;
  company: {
    name: string;
    website?: string | null;
    phone?: string | null;
    logoUrl?: string | null;
    brandColor?: string | null;
  } | null;
  contact: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  options: PublicPrintOption[];
};

export function tierRank(tier: PublicPrintOption["tier"]) {
  if (tier === "GOOD") return 0;
  if (tier === "BETTER") return 1;
  return 2;
}

function equipmentLabel(option: PublicPrintOption) {
  if (!option.equipmentSnapshot) return null;
  const brand = option.equipmentSnapshot.brand || "";
  const modelNumber = option.equipmentSnapshot.modelNumber || "";
  const equipmentType = option.equipmentSnapshot.equipmentType || "";
  const label = [brand, modelNumber, equipmentType].filter(Boolean).join(" ");
  return label || null;
}

export function serializePublicProposalForPrint(
  proposal: PublicPrintProposalInput,
) {
  const sortedOptions = [...proposal.options].sort(
    (a, b) => tierRank(a.tier) - tierRank(b.tier),
  );

  return {
    ...proposal,
    isAccepted: proposal.status === "ACCEPTED",
    sortedOptions: sortedOptions.map((option) => ({
      basePriceBeforeAdjustments:
        option.preTaxCustomerPrice -
        option.permitFee -
        option.addonsTotal +
        option.discountsTotal +
        option.rebatesTotal,
      ...option,
      isSelected: proposal.selectedOptionId === option.id,
      equipmentLabel: equipmentLabel(option),
      priceBreakdown: {
        basePriceBeforeAdjustments:
          option.preTaxCustomerPrice -
          option.permitFee -
          option.addonsTotal +
          option.discountsTotal +
          option.rebatesTotal,
        addonsTotal: option.addonsTotal,
        discountsTotal: option.discountsTotal,
        rebatesTotal: option.rebatesTotal,
        permitFee: option.permitFee,
        preTaxCustomerPrice: option.preTaxCustomerPrice,
        taxRatePercent: option.taxRatePercent,
        taxAmount: option.taxAmount,
        finalCustomerPrice: option.finalCustomerPrice,
      },
    })),
  };
}
