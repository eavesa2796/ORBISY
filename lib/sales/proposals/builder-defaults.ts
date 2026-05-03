import {
  type ProposalPricingSettings,
  DEFAULT_PROPOSAL_PRICING_SETTINGS,
} from "./settings-shared";

export type BuilderTierForm = {
  tier: "GOOD" | "BETTER" | "BEST";
  title: string;
  equipmentItemId: string;
  laborCost: string;
  pricingMode: "FIXED_SELL_PRICE" | "COST_PLUS_MARGIN";
  marginPercent: string;
  sellPrice: string;
  financingApr: string;
  financingMonths: string;
  addon: string;
  discount: string;
  rebate: string;
  permitFee: string;
  taxRatePercent: string;
  warrantyLabel: string;
};

export type BuilderCatalogItem = {
  id: string;
  equipmentType: string;
  brand: string;
  modelNumber: string;
  sizeTonnage?: string | null;
  efficiencyRating?: string | null;
  pricingMode: "FIXED_SELL_PRICE" | "COST_PLUS_MARGIN";
  sellPrice?: number | null;
  marginPercent?: number | null;
};

export function buildDefaultTierFormsFromSettings(
  settings: ProposalPricingSettings = DEFAULT_PROPOSAL_PRICING_SETTINGS,
): BuilderTierForm[] {
  return [
    {
      tier: "GOOD",
      title: "Good Option",
      equipmentItemId: "",
      laborCost: String(settings.defaultLaborCost),
      pricingMode: "COST_PLUS_MARGIN",
      marginPercent: "35",
      sellPrice: "",
      financingApr: String(settings.defaultFinancingApr),
      financingMonths: String(settings.defaultFinancingMonths),
      addon: "0",
      discount: "0",
      rebate: "0",
      permitFee: String(settings.permitFeeDefault),
      taxRatePercent: String(settings.taxRatePercent),
      warrantyLabel: settings.defaultWarrantyGood,
    },
    {
      tier: "BETTER",
      title: "Better Option",
      equipmentItemId: "",
      laborCost: String(settings.defaultLaborCost),
      pricingMode: "COST_PLUS_MARGIN",
      marginPercent: "40",
      sellPrice: "",
      financingApr: String(settings.defaultFinancingApr),
      financingMonths: String(settings.defaultFinancingMonths),
      addon: "0",
      discount: "0",
      rebate: "0",
      permitFee: String(settings.permitFeeDefault),
      taxRatePercent: String(settings.taxRatePercent),
      warrantyLabel: settings.defaultWarrantyBetter,
    },
    {
      tier: "BEST",
      title: "Best Option",
      equipmentItemId: "",
      laborCost: String(settings.defaultLaborCost),
      pricingMode: "COST_PLUS_MARGIN",
      marginPercent: "45",
      sellPrice: "",
      financingApr: String(settings.defaultFinancingApr),
      financingMonths: String(settings.defaultFinancingMonths),
      addon: "0",
      discount: "0",
      rebate: "0",
      permitFee: String(settings.permitFeeDefault),
      taxRatePercent: String(settings.taxRatePercent),
      warrantyLabel: settings.defaultWarrantyBest,
    },
  ];
}

export function buildCatalogEquipmentLabel(item: BuilderCatalogItem) {
  return [
    item.brand,
    item.modelNumber,
    item.equipmentType,
    item.sizeTonnage,
    item.efficiencyRating,
  ]
    .filter(Boolean)
    .join(" - ");
}

export function applyCatalogItemToTierForm(
  tier: BuilderTierForm,
  item: BuilderCatalogItem | null,
): BuilderTierForm {
  if (!item) {
    return {
      ...tier,
      equipmentItemId: "",
    };
  }

  const next: BuilderTierForm = {
    ...tier,
    equipmentItemId: item.id,
    title: `${tier.tier[0]}${tier.tier.slice(1).toLowerCase()} - ${item.brand} ${item.modelNumber}`,
    pricingMode: item.pricingMode,
  };

  if (item.pricingMode === "FIXED_SELL_PRICE") {
    return {
      ...next,
      sellPrice:
        item.sellPrice === null || item.sellPrice === undefined
          ? tier.sellPrice
          : String(item.sellPrice),
      marginPercent:
        item.marginPercent === null || item.marginPercent === undefined
          ? tier.marginPercent
          : String(item.marginPercent),
    };
  }

  return {
    ...next,
    marginPercent:
      item.marginPercent === null || item.marginPercent === undefined
        ? tier.marginPercent
        : String(item.marginPercent),
    sellPrice: "",
  };
}
