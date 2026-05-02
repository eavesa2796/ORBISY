import { describe, expect, it } from "vitest";
import { validateProposalSettingsForm } from "@/components/pro/ProposalSettingsPage";

const validForm = {
  defaultLaborCost: "1500",
  defaultFinancingApr: "8.99",
  defaultFinancingMonths: "120",
  defaultWarrantyGood: "10-year parts",
  defaultWarrantyBetter: "10-year parts + 2-year labor",
  defaultWarrantyBest: "10-year parts + 10-year labor",
  permitFeeDefault: "0",
  taxRatePercent: "0",
  companyProposalFooter: "Thank you.",
  proposalDisclaimer: "Valid 30 days.",
};

describe("validateProposalSettingsForm", () => {
  it("returns no errors for a valid form", () => {
    const errors = validateProposalSettingsForm(validForm);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("rejects negative labor cost", () => {
    const errors = validateProposalSettingsForm({
      ...validForm,
      defaultLaborCost: "-100",
    });
    expect(errors.defaultLaborCost).toBeDefined();
  });

  it("rejects non-numeric financing APR", () => {
    const errors = validateProposalSettingsForm({
      ...validForm,
      defaultFinancingApr: "abc",
    });
    expect(errors.defaultFinancingApr).toBeDefined();
  });

  it("rejects zero financing months", () => {
    const errors = validateProposalSettingsForm({
      ...validForm,
      defaultFinancingMonths: "0",
    });
    expect(errors.defaultFinancingMonths).toBeDefined();
  });

  it("rejects negative financing months", () => {
    const errors = validateProposalSettingsForm({
      ...validForm,
      defaultFinancingMonths: "-12",
    });
    expect(errors.defaultFinancingMonths).toBeDefined();
  });

  it("rejects negative permit fee", () => {
    const errors = validateProposalSettingsForm({
      ...validForm,
      permitFeeDefault: "-1",
    });
    expect(errors.permitFeeDefault).toBeDefined();
  });

  it("rejects tax rate above 20%", () => {
    const errors = validateProposalSettingsForm({
      ...validForm,
      taxRatePercent: "25",
    });
    expect(errors.taxRatePercent).toBeDefined();
  });

  it("rejects negative tax rate", () => {
    const errors = validateProposalSettingsForm({
      ...validForm,
      taxRatePercent: "-1",
    });
    expect(errors.taxRatePercent).toBeDefined();
  });

  it("rejects empty warranty labels", () => {
    const errors = validateProposalSettingsForm({
      ...validForm,
      defaultWarrantyGood: "",
      defaultWarrantyBetter: "  ",
      defaultWarrantyBest: "",
    });
    expect(errors.defaultWarrantyGood).toBeDefined();
    expect(errors.defaultWarrantyBetter).toBeDefined();
    expect(errors.defaultWarrantyBest).toBeDefined();
  });

  it("accepts boundary values: tax 0 and 20", () => {
    expect(
      Object.keys(
        validateProposalSettingsForm({ ...validForm, taxRatePercent: "0" }),
      ),
    ).toHaveLength(0);
    expect(
      Object.keys(
        validateProposalSettingsForm({ ...validForm, taxRatePercent: "20" }),
      ),
    ).toHaveLength(0);
  });

  it("accepts zero for labor cost, permit fee, and APR", () => {
    const errors = validateProposalSettingsForm({
      ...validForm,
      defaultLaborCost: "0",
      defaultFinancingApr: "0",
      permitFeeDefault: "0",
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});
