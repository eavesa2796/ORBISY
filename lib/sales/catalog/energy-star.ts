export const ENERGY_STAR_HEAT_PUMP_DATASET_ID = "83eb-xbyy";
export const ENERGY_STAR_HEAT_PUMP_RESOURCE_URL =
  "https://data.energystar.gov/resource/83eb-xbyy.json";

export type EnergyStarHeatPumpRow = {
  pd_id?: string;
  manufacturer_type?: string;
  energy_star_partner?: string;
  series_name?: string;
  icm_outdoor_unit_manufacturer?: string;
  outdoor_unit_brand_name?: string;
  model_number?: string;
  indoor_unit_brand_name?: string;
  indoor_unit_model_number?: string;
  furnace_model_number?: string;
  additional_model_information?: string;
  upc?: string;
  product_type?: string;
  cold_climate?: string;
  meets_peak_cooling_requirements?: string;
  seer2_btu_wh?: string;
  eer2_btu_wh?: string;
  hspf2_btu_wh?: string;
  cooling_capacity_btu_h?: string;
  heating_capacity_at_47_f_btu_h?: string;
  heating_capacity_at_17_f_btu_h?: string;
  heating_capacity_at_5_f_btu_h?: string;
  cop_at_5_f?: string;
  controls_verification_procedure_cvp_test?: string;
  installation_capabilities?: string;
  compressor_staging?: string;
  refrigerant_type?: string;
  refrigerant_with_gwp?: string;
  connected_capability?: string;
  date_available_on_market?: string;
  date_certified?: string;
  markets?: string;
  energy_star_model_identifier?: string;
  ahri_reference_number?: string;
  tax_credit_eligible?: string;
  meets_most_efficient_criteria?: string;
  tax_credit_eligible_heat_pumps?: string;
};

export type EnergyStarHeatPumpCatalogResult = {
  sourceProvider: "ENERGY_STAR";
  sourceProductId: string;
  sourceDatasetId: string;
  equipmentType: "HEAT_PUMP";
  brand: string;
  modelNumber: string;
  sizeTonnage: string | null;
  efficiencyRating: string | null;
  description: string | null;
  energyStarCertified: true;
  ahriReferenceNumber: string | null;
  productType: string | null;
  coldClimate: boolean | null;
  taxCreditEligible: boolean | null;
  seer2: number | null;
  eer2: number | null;
  hspf2: number | null;
  coolingCapacityBtu: number | null;
  heatingCapacityBtu47: number | null;
  heatingCapacityBtu17: number | null;
  heatingCapacityBtu5: number | null;
  copAt5: number | null;
  refrigerantType: string | null;
  seriesName: string | null;
  sourceMetadata: Record<string, string | null>;
};

type FetchLike = typeof fetch;

export async function searchEnergyStarHeatPumps(
  query: string,
  limit = 20,
  fetchImpl: FetchLike = fetch,
) {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Search query is required");
  }

  const url = buildEnergyStarUrl({
    "$q": trimmed,
    "$limit": String(Math.min(Math.max(limit, 1), 50)),
    "$order": "date_certified DESC",
  });

  const rows = await fetchEnergyStarRows(url, fetchImpl);
  return rows
    .map(mapEnergyStarHeatPumpRow)
    .filter((item): item is EnergyStarHeatPumpCatalogResult => item !== null);
}

export async function getEnergyStarHeatPumpByProductId(
  sourceProductId: string,
  fetchImpl: FetchLike = fetch,
) {
  const id = sourceProductId.trim();
  if (!id) {
    throw new Error("sourceProductId is required");
  }

  const url = buildEnergyStarUrl({
    pd_id: id,
    "$limit": "1",
  });

  const rows = await fetchEnergyStarRows(url, fetchImpl);
  return rows.length > 0 ? mapEnergyStarHeatPumpRow(rows[0]) : null;
}

export function mapEnergyStarHeatPumpRow(
  row: EnergyStarHeatPumpRow,
): EnergyStarHeatPumpCatalogResult | null {
  const sourceProductId = clean(row.pd_id);
  const brand = firstClean(
    row.outdoor_unit_brand_name,
    row.icm_outdoor_unit_manufacturer,
    row.energy_star_partner,
    row.indoor_unit_brand_name,
  );
  const modelNumber = clean(row.model_number);

  if (!sourceProductId || !brand || !modelNumber) {
    return null;
  }

  const seer2 = parseNumber(row.seer2_btu_wh);
  const eer2 = parseNumber(row.eer2_btu_wh);
  const hspf2 = parseNumber(row.hspf2_btu_wh);
  const coolingCapacityBtu = parseInteger(row.cooling_capacity_btu_h);
  const heatingCapacityBtu47 = parseInteger(row.heating_capacity_at_47_f_btu_h);
  const heatingCapacityBtu17 = parseInteger(row.heating_capacity_at_17_f_btu_h);
  const heatingCapacityBtu5 = parseInteger(row.heating_capacity_at_5_f_btu_h);
  const copAt5 = parseNumber(row.cop_at_5_f);
  const coldClimate = parseBoolean(row.cold_climate);
  const taxCreditEligible =
    parseBoolean(row.tax_credit_eligible_heat_pumps) ??
    parseBoolean(row.tax_credit_eligible);
  const productType = clean(row.product_type);
  const seriesName = clean(row.series_name);
  const ahriReferenceNumber = clean(row.ahri_reference_number);
  const refrigerantType = firstClean(
    row.refrigerant_type,
    row.refrigerant_with_gwp,
  );

  return {
    sourceProvider: "ENERGY_STAR",
    sourceProductId,
    sourceDatasetId: ENERGY_STAR_HEAT_PUMP_DATASET_ID,
    equipmentType: "HEAT_PUMP",
    brand,
    modelNumber,
    sizeTonnage: formatTonnage(coolingCapacityBtu),
    efficiencyRating: formatEfficiency({ seer2, eer2, hspf2 }),
    description: formatDescription({
      productType,
      seriesName,
      coldClimate,
      taxCreditEligible,
      ahriReferenceNumber,
    }),
    energyStarCertified: true,
    ahriReferenceNumber,
    productType,
    coldClimate,
    taxCreditEligible,
    seer2,
    eer2,
    hspf2,
    coolingCapacityBtu,
    heatingCapacityBtu47,
    heatingCapacityBtu17,
    heatingCapacityBtu5,
    copAt5,
    refrigerantType,
    seriesName,
    sourceMetadata: {
      manufacturerType: clean(row.manufacturer_type),
      energyStarPartner: clean(row.energy_star_partner),
      indoorUnitBrandName: clean(row.indoor_unit_brand_name),
      indoorUnitModelNumber: clean(row.indoor_unit_model_number),
      furnaceModelNumber: clean(row.furnace_model_number),
      additionalModelInformation: clean(row.additional_model_information),
      upc: clean(row.upc),
      meetsPeakCoolingRequirements: clean(row.meets_peak_cooling_requirements),
      installationCapabilities: clean(row.installation_capabilities),
      compressorStaging: clean(row.compressor_staging),
      connectedCapability: clean(row.connected_capability),
      dateAvailableOnMarket: clean(row.date_available_on_market),
      dateCertified: clean(row.date_certified),
      markets: clean(row.markets),
      energyStarModelIdentifier: clean(row.energy_star_model_identifier),
      meetsMostEfficientCriteria: clean(row.meets_most_efficient_criteria),
    },
  };
}

function buildEnergyStarUrl(params: Record<string, string>) {
  const url = new URL(ENERGY_STAR_HEAT_PUMP_RESOURCE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function fetchEnergyStarRows(url: URL, fetchImpl: FetchLike) {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`ENERGY STAR request failed with ${response.status}`);
  }

  return (await response.json()) as EnergyStarHeatPumpRow[];
}

function clean(value: string | null | undefined) {
  const trimmed = (value || "").trim();
  return trimmed && trimmed.toLowerCase() !== "n/a" ? trimmed : null;
}

function firstClean(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return null;
}

function parseNumber(value: string | null | undefined) {
  const cleaned = clean(value);
  if (!cleaned) return null;
  const parsed = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string | null | undefined) {
  const parsed = parseNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

function parseBoolean(value: string | null | undefined) {
  const cleaned = clean(value)?.toLowerCase();
  if (!cleaned) return null;
  if (["yes", "true", "1", "y"].includes(cleaned)) return true;
  if (["no", "false", "0", "n"].includes(cleaned)) return false;
  return cleaned.includes("yes") ? true : null;
}

function formatTonnage(coolingCapacityBtu: number | null) {
  if (!coolingCapacityBtu) return null;
  const tons = coolingCapacityBtu / 12000;
  const rounded = Math.round(tons * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} ton`;
}

function formatEfficiency(values: {
  seer2: number | null;
  eer2: number | null;
  hspf2: number | null;
}) {
  const parts = [
    values.seer2 === null ? null : `SEER2 ${formatNumber(values.seer2)}`,
    values.eer2 === null ? null : `EER2 ${formatNumber(values.eer2)}`,
    values.hspf2 === null ? null : `HSPF2 ${formatNumber(values.hspf2)}`,
  ].filter((value): value is string => Boolean(value));

  return parts.length ? parts.join(" / ") : null;
}

function formatDescription(values: {
  productType: string | null;
  seriesName: string | null;
  coldClimate: boolean | null;
  taxCreditEligible: boolean | null;
  ahriReferenceNumber: string | null;
}) {
  const parts = [
    values.productType,
    values.seriesName ? `Series: ${values.seriesName}` : null,
    values.coldClimate ? "Cold climate certified" : null,
    values.taxCreditEligible ? "Tax credit eligible" : null,
    values.ahriReferenceNumber ? `AHRI: ${values.ahriReferenceNumber}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.length ? parts.join(". ") : null;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : String(value);
}
