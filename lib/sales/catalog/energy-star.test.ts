import { describe, expect, it } from "vitest";
import { mapEnergyStarHeatPumpRow } from "./energy-star";

describe("ENERGY STAR heat pump mapping", () => {
  it("normalizes product finder rows into catalog-ready items", () => {
    const item = mapEnergyStarHeatPumpRow({
      pd_id: "12345",
      outdoor_unit_brand_name: "Carrier",
      model_number: "25VNA4",
      product_type: "Split System",
      series_name: "Infinity",
      cold_climate: "Yes",
      seer2_btu_wh: "18.5",
      eer2_btu_wh: "12",
      hspf2_btu_wh: "9.2",
      cooling_capacity_btu_h: "36000",
      heating_capacity_at_47_f_btu_h: "38000",
      heating_capacity_at_17_f_btu_h: "25000",
      heating_capacity_at_5_f_btu_h: "22000",
      cop_at_5_f: "1.9",
      ahri_reference_number: "9876543",
      tax_credit_eligible_heat_pumps: "Yes",
      refrigerant_type: "R-454B",
    });

    expect(item).toMatchObject({
      sourceProvider: "ENERGY_STAR",
      sourceProductId: "12345",
      equipmentType: "HEAT_PUMP",
      brand: "Carrier",
      modelNumber: "25VNA4",
      sizeTonnage: "3 ton",
      efficiencyRating: "SEER2 18.5 / EER2 12 / HSPF2 9.2",
      energyStarCertified: true,
      coldClimate: true,
      taxCreditEligible: true,
      coolingCapacityBtu: 36000,
      heatingCapacityBtu47: 38000,
      heatingCapacityBtu17: 25000,
      heatingCapacityBtu5: 22000,
      copAt5: 1.9,
      refrigerantType: "R-454B",
    });
  });

  it("skips incomplete rows", () => {
    expect(mapEnergyStarHeatPumpRow({ pd_id: "123" })).toBeNull();
  });
});
