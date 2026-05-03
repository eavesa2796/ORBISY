import { describe, expect, it } from "vitest";
import {
  applyCatalogItemToTierForm,
  buildCatalogEquipmentLabel,
  buildDefaultTierFormsFromSettings,
  calculateTierFormPricingPreview,
} from "./builder-defaults";

describe("buildDefaultTierFormsFromSettings", () => {
  it("uses settings defaults for labor, financing, warranty, permit, and tax", () => {
    const tiers = buildDefaultTierFormsFromSettings({
      defaultLaborCost: 1650,
      defaultFinancingApr: 7.25,
      defaultFinancingMonths: 96,
      defaultWarrantyGood: "8-year parts",
      defaultWarrantyBetter: "10-year parts + 1-year labor",
      defaultWarrantyBest: "12-year parts + 10-year labor",
      permitFeeDefault: 175,
      taxRatePercent: 8.5,
      companyProposalFooter: "Footer",
      proposalDisclaimer: "Disclaimer",
    });

    expect(tiers).toHaveLength(3);
    expect(tiers[0].laborCost).toBe("1650");
    expect(tiers[1].financingApr).toBe("7.25");
    expect(tiers[2].financingMonths).toBe("96");
    expect(tiers[0].warrantyLabel).toBe("8-year parts");
    expect(tiers[1].warrantyLabel).toBe("10-year parts + 1-year labor");
    expect(tiers[2].warrantyLabel).toBe("12-year parts + 10-year labor");
    expect(tiers[0].permitFee).toBe("175");
    expect(tiers[0].taxRatePercent).toBe("8.5");
  });
});

describe("applyCatalogItemToTierForm", () => {
  const [baseTier] = buildDefaultTierFormsFromSettings();

  it("fills tier title, selected item, and fixed sell price from catalog equipment", () => {
    const tier = applyCatalogItemToTierForm(baseTier, {
      id: "item_1",
      equipmentType: "HEAT_PUMP",
      brand: "Carrier",
      modelNumber: "25VNA4",
      sizeTonnage: "4 ton",
      efficiencyRating: "20 SEER2",
      cost: 7200,
      pricingMode: "FIXED_SELL_PRICE",
      sellPrice: 12950,
      marginPercent: null,
    });

    expect(tier.equipmentItemId).toBe("item_1");
    expect(tier.title).toBe("Good - Carrier 25VNA4");
    expect(tier.pricingMode).toBe("FIXED_SELL_PRICE");
    expect(tier.sellPrice).toBe("12950");
  });

  it("fills cost-plus margin and clears stale fixed sell price", () => {
    const tier = applyCatalogItemToTierForm(
      { ...baseTier, sellPrice: "10000", marginPercent: "35" },
      {
        id: "item_2",
        equipmentType: "FURNACE",
        brand: "Trane",
        modelNumber: "S9V2",
        cost: 4100,
        pricingMode: "COST_PLUS_MARGIN",
        sellPrice: null,
        marginPercent: 42,
      },
    );

    expect(tier.equipmentItemId).toBe("item_2");
    expect(tier.pricingMode).toBe("COST_PLUS_MARGIN");
    expect(tier.marginPercent).toBe("42");
    expect(tier.sellPrice).toBe("");
  });

  it("builds a readable catalog label from available equipment specs", () => {
    expect(
      buildCatalogEquipmentLabel({
        id: "item_3",
        equipmentType: "CONDENSER",
        brand: "Lennox",
        modelNumber: "EL18XCV",
        sizeTonnage: "3 ton",
        efficiencyRating: "18 SEER2",
        cost: 5300,
        pricingMode: "COST_PLUS_MARGIN",
      }),
    ).toBe("Lennox - EL18XCV - CONDENSER - 3 ton - 18 SEER2");
  });

  it("calculates live pricing preview from tier form inputs and catalog cost", () => {
    const tier = {
      ...baseTier,
      laborCost: "2000",
      pricingMode: "COST_PLUS_MARGIN" as const,
      marginPercent: "50",
      addon: "500",
      discount: "250",
      rebate: "100",
      permitFee: "150",
      taxRatePercent: "8",
      financingApr: "0",
      financingMonths: "60",
    };

    const preview = calculateTierFormPricingPreview(tier, {
      id: "item_4",
      equipmentType: "HEAT_PUMP",
      brand: "Daikin",
      modelNumber: "DZ6VS",
      cost: 6000,
      pricingMode: "COST_PLUS_MARGIN",
      marginPercent: 50,
    });

    expect(preview.totalCost).toBe(8650);
    expect(preview.preTaxCustomerPrice).toBe(12625);
    expect(preview.taxAmount).toBe(1010);
    expect(preview.finalCustomerPrice).toBe(13635);
    expect(preview.monthlyPaymentEstimate).toBe(227.25);
  });
});
