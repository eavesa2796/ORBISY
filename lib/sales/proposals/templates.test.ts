import { describe, expect, it } from "vitest";
import {
  applyTemplateToTierDefaults,
  listActiveTemplatesFromCollection,
  type ProposalTemplate,
} from "./templates";

function buildTemplate(): ProposalTemplate {
  return {
    id: "tpl_test",
    name: "Test Template",
    jobType: "CUSTOM",
    description: "Test",
    isActive: true,
    isBuiltIn: false,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    tiers: [
      {
        tier: "GOOD",
        title: "Good",
        laborCost: 1000,
        pricingMode: "COST_PLUS_MARGIN",
        marginPercent: 35,
        sellPrice: null,
        permitFee: 150,
        taxRatePercent: 8,
        warrantyLabel: "10-year parts",
        financingApr: 8.99,
        financingMonths: 120,
        defaultAddons: [{ type: "ADDON", label: "Pad", amount: 120 }],
        pricingNotes: "Base",
      },
      {
        tier: "BETTER",
        title: "Better",
        laborCost: 1400,
        pricingMode: "COST_PLUS_MARGIN",
        marginPercent: 40,
        sellPrice: null,
        permitFee: 175,
        taxRatePercent: 8.25,
        warrantyLabel: "10-year + 2-year labor",
        financingApr: 8.49,
        financingMonths: 120,
        defaultAddons: [],
        pricingNotes: "Mid",
      },
      {
        tier: "BEST",
        title: "Best",
        laborCost: 1800,
        pricingMode: "FIXED_SELL_PRICE",
        marginPercent: 45,
        sellPrice: 18000,
        permitFee: 200,
        taxRatePercent: 8.5,
        warrantyLabel: "10-year + 10-year labor",
        financingApr: 7.49,
        financingMonths: 144,
        defaultAddons: [],
        pricingNotes: "Top",
      },
    ],
  };
}

describe("proposal template application", () => {
  it("applying template creates exactly 3 options", () => {
    const template = buildTemplate();
    const applied = applyTemplateToTierDefaults(template);
    expect(applied).toHaveLength(3);
    expect(applied.map((entry) => entry.tier)).toEqual(["GOOD", "BETTER", "BEST"]);
  });

  it("user overrides still win over template defaults", () => {
    const template = buildTemplate();
    const applied = applyTemplateToTierDefaults(template, [
      {
        tier: "BETTER",
        title: "Better Custom",
        laborCost: 1650,
        pricingMode: "FIXED_SELL_PRICE",
        marginPercent: 44,
        sellPrice: 15000,
        permitFee: 250,
        taxRatePercent: 7.75,
        financingApr: 6.99,
        financingMonths: 132,
        warrantyLabel: "12-year parts",
        pricingNotes: "Custom notes",
      },
    ]);

    const better = applied.find((entry) => entry.tier === "BETTER");
    expect(better?.title).toBe("Better Custom");
    expect(better?.laborCost).toBe(1650);
    expect(better?.pricingMode).toBe("FIXED_SELL_PRICE");
    expect(better?.marginPercent).toBe(44);
    expect(better?.sellPrice).toBe(15000);
    expect(better?.permitFee).toBe(250);
    expect(better?.taxRatePercent).toBe(7.75);
    expect(better?.financingApr).toBe(6.99);
    expect(better?.financingMonths).toBe(132);
    expect(better?.warrantyLabel).toBe("12-year parts");
    expect(better?.pricingNotes).toBe("Custom notes");
  });

  it("inactive templates are not shown", () => {
    const templates: ProposalTemplate[] = [
      buildTemplate(),
      {
        ...buildTemplate(),
        id: "tpl_inactive",
        name: "Inactive Template",
        isActive: false,
      },
    ];

    const visible = listActiveTemplatesFromCollection(templates);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe("tpl_test");
  });
});
