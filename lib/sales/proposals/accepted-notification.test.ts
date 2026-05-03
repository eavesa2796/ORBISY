import { describe, expect, it } from "vitest";
import { buildAcceptedWorkOrderEmail } from "./accepted-notification";

describe("buildAcceptedWorkOrderEmail", () => {
  it("creates a work-order style email from an accepted proposal summary", () => {
    const email = buildAcceptedWorkOrderEmail({
      id: "proposal_1",
      publicToken: "token_1",
      publicUrl: "https://app.orbisy.com/proposal/token_1",
      title: "Heat Pump Replacement",
      notes: "Install in attic",
      status: "ACCEPTED",
      acceptedAt: new Date("2026-05-03T15:30:00.000Z"),
      opportunity: { id: "opp_1", title: "4-ton heat pump replacement" },
      company: { id: "company_1", name: "Acme HVAC", slug: "acme-hvac" },
      contact: {
        id: "contact_1",
        fullName: "Taylor Homeowner",
        email: "taylor@example.com",
        phone: "555-0100",
      },
      selectedOption: {
        id: "option_1",
        tier: "BETTER",
        title: "Better - Variable Speed",
        summary: null,
        equipmentSnapshot: { brand: "Carrier", modelNumber: "25VNA4" },
        equipmentLabel: "Carrier 25VNA4 HEAT_PUMP",
        warrantyLabel: "10-year parts and labor",
        financingApr: 7.99,
        financingMonths: 120,
        monthlyPaymentEstimate: 196.52,
        equipmentCost: 7200,
        laborCost: 1800,
        addonsTotal: 500,
        discountsTotal: 250,
        rebatesTotal: 100,
        totalCost: 9500,
        grossMarginAmount: 4100,
        grossMarginPercent: 31.7,
        finalCustomerPrice: 13600,
        addonLines: [
          { id: "line_1", type: "ADDON", label: "Smart thermostat", amount: 500 },
          { id: "line_2", type: "REBATE", label: "Utility rebate", amount: 100 },
        ],
      },
      timeline: [],
    });

    expect(email.subject).toBe("Accepted HVAC proposal: Acme HVAC - BETTER");
    expect(email.text).toContain("Customer: Taylor Homeowner");
    expect(email.text).toContain("Selected option: BETTER - Better - Variable Speed");
    expect(email.text).toContain("Equipment: Carrier 25VNA4 HEAT_PUMP");
    expect(email.text).toContain("Final customer price: $13,600");
    expect(email.text).toContain("Financing estimate: $197/mo");
    expect(email.text).toContain("Public proposal: https://app.orbisy.com/proposal/token_1");
  });
});
