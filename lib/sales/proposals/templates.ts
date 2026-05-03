import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export type TemplateAddonType = "ADDON" | "DISCOUNT" | "REBATE";

export type ProposalTemplateAddonDefault = {
  type: TemplateAddonType;
  label: string;
  amount: number;
};

export type ProposalTemplateTierDefault = {
  tier: "GOOD" | "BETTER" | "BEST";
  title: string;
  laborCost: number;
  pricingMode?: "FIXED_SELL_PRICE" | "COST_PLUS_MARGIN";
  marginPercent?: number;
  sellPrice?: number | null;
  permitFee?: number;
  taxRatePercent?: number;
  warrantyLabel: string;
  financingApr: number;
  financingMonths: number;
  defaultAddons: ProposalTemplateAddonDefault[];
  pricingNotes: string;
};

export type ProposalTemplate = {
  id: string;
  name: string;
  jobType:
    | "AC_REPLACEMENT"
    | "FURNACE_REPLACEMENT"
    | "HEAT_PUMP_REPLACEMENT"
    | "FULL_SYSTEM_REPLACEMENT"
    | "CUSTOM";
  description: string;
  isActive: boolean;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
  tiers: ProposalTemplateTierDefault[];
};

export type TemplateTierOverride = Partial<
  Omit<ProposalTemplateTierDefault, "tier" | "defaultAddons"> & {
    defaultAddons: ProposalTemplateAddonDefault[];
  }
> & {
  tier: "GOOD" | "BETTER" | "BEST";
};

const nowIso = () => new Date().toISOString();

function defaultsFor(tier: "GOOD" | "BETTER" | "BEST") {
  if (tier === "GOOD") {
    return {
      laborCost: 1200,
      marginPercent: 35,
      financingApr: 8.99,
      financingMonths: 120,
      warrantyLabel: "10-year parts",
    };
  }
  if (tier === "BETTER") {
    return {
      laborCost: 1500,
      marginPercent: 40,
      financingApr: 8.49,
      financingMonths: 120,
      warrantyLabel: "10-year parts + 2-year labor",
    };
  }
  return {
    laborCost: 1800,
    marginPercent: 45,
    financingApr: 7.49,
    financingMonths: 144,
    warrantyLabel: "10-year parts + 10-year labor",
  };
}

function buildTier(
  tier: "GOOD" | "BETTER" | "BEST",
  title: string,
  notes: string,
  defaultAddons: ProposalTemplateAddonDefault[] = [],
): ProposalTemplateTierDefault {
  const shared = defaultsFor(tier);
  return {
    tier,
    title,
    laborCost: shared.laborCost,
    pricingMode: "COST_PLUS_MARGIN",
    marginPercent: shared.marginPercent,
    sellPrice: null,
    warrantyLabel: shared.warrantyLabel,
    financingApr: shared.financingApr,
    financingMonths: shared.financingMonths,
    defaultAddons,
    pricingNotes: notes,
  };
}

const BUILT_IN_TEMPLATES: ProposalTemplate[] = [
  {
    id: "tpl_ac_replacement",
    name: "AC Replacement",
    jobType: "AC_REPLACEMENT",
    description: "Straight AC condenser and evaporator replacement package.",
    isActive: true,
    isBuiltIn: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    tiers: [
      buildTier("GOOD", "Good AC Replacement", "Entry efficiency condenser with standard install"),
      buildTier(
        "BETTER",
        "Better AC Replacement",
        "Higher efficiency condenser with upgraded controls",
        [{ type: "ADDON", label: "Smart thermostat", amount: 350 }],
      ),
      buildTier("BEST", "Best AC Replacement", "Top efficiency inverter condenser with premium setup"),
    ],
  },
  {
    id: "tpl_furnace_replacement",
    name: "Furnace Replacement",
    jobType: "FURNACE_REPLACEMENT",
    description: "Gas furnace replacement with comfort and efficiency tiers.",
    isActive: true,
    isBuiltIn: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    tiers: [
      buildTier("GOOD", "Good Furnace Replacement", "Single-stage furnace replacement"),
      buildTier("BETTER", "Better Furnace Replacement", "Two-stage furnace with quieter airflow"),
      buildTier(
        "BEST",
        "Best Furnace Replacement",
        "Modulating furnace with premium filtration",
        [{ type: "ADDON", label: "MERV-13 media cabinet", amount: 290 }],
      ),
    ],
  },
  {
    id: "tpl_heat_pump_replacement",
    name: "Heat Pump Replacement",
    jobType: "HEAT_PUMP_REPLACEMENT",
    description: "Heat pump changeout tiers for efficiency and comfort.",
    isActive: true,
    isBuiltIn: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    tiers: [
      buildTier("GOOD", "Good Heat Pump Replacement", "Baseline SEER2 heat pump replacement"),
      buildTier("BETTER", "Better Heat Pump Replacement", "Mid-tier variable speed heat pump"),
      buildTier(
        "BEST",
        "Best Heat Pump Replacement",
        "Cold-climate inverter heat pump with premium commissioning",
        [{ type: "ADDON", label: "Surge protector", amount: 180 }],
      ),
    ],
  },
  {
    id: "tpl_full_system_replacement",
    name: "Full System Replacement",
    jobType: "FULL_SYSTEM_REPLACEMENT",
    description: "Complete equipment replacement: outdoor + indoor + controls.",
    isActive: true,
    isBuiltIn: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    tiers: [
      buildTier("GOOD", "Good Full System", "Matched entry system replacement"),
      buildTier(
        "BETTER",
        "Better Full System",
        "Matched two-stage system with improved comfort",
        [{ type: "ADDON", label: "UV air treatment", amount: 450 }],
      ),
      buildTier(
        "BEST",
        "Best Full System",
        "Top-tier variable system with comfort package",
        [{ type: "ADDON", label: "Whole-home dehumidifier prep", amount: 600 }],
      ),
    ],
  },
];

const TIER_ORDER: Array<"GOOD" | "BETTER" | "BEST"> = ["GOOD", "BETTER", "BEST"];
const DATA_PATH = path.join(process.cwd(), "data", "proposal-templates.json");

async function ensureDataDir() {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
}

async function readCustomTemplates(): Promise<ProposalTemplate[]> {
  try {
    const file = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(file) as ProposalTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCustomTemplates(templates: ProposalTemplate[]) {
  await ensureDataDir();
  await fs.writeFile(DATA_PATH, JSON.stringify(templates, null, 2), "utf8");
}

export function listActiveTemplatesFromCollection(templates: ProposalTemplate[]) {
  return templates.filter((template) => template.isActive);
}

function mergeTemplates(custom: ProposalTemplate[]) {
  const map = new Map<string, ProposalTemplate>();
  for (const template of BUILT_IN_TEMPLATES) {
    map.set(template.id, template);
  }
  for (const template of custom) {
    map.set(template.id, template);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listProposalTemplates(options?: { includeInactive?: boolean }) {
  const custom = await readCustomTemplates();
  const all = mergeTemplates(custom);
  return options?.includeInactive ? all : listActiveTemplatesFromCollection(all);
}

export async function getProposalTemplateById(id: string) {
  const templates = await listProposalTemplates({ includeInactive: true });
  return templates.find((template) => template.id === id) || null;
}

function normalizeTiers(tiers: ProposalTemplateTierDefault[]) {
  return [...tiers].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
  );
}

export async function createProposalTemplate(
  input: Omit<ProposalTemplate, "id" | "isBuiltIn" | "createdAt" | "updatedAt">,
) {
  const custom = await readCustomTemplates();
  const now = nowIso();
  const created: ProposalTemplate = {
    id: `tpl_custom_${randomUUID()}`,
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
    ...input,
    tiers: normalizeTiers(input.tiers),
  };
  custom.push(created);
  await writeCustomTemplates(custom);
  return created;
}

export async function updateProposalTemplate(
  id: string,
  patch: Partial<Omit<ProposalTemplate, "id" | "isBuiltIn" | "createdAt">>,
) {
  const custom = await readCustomTemplates();
  const index = custom.findIndex((template) => template.id === id);
  if (index < 0) {
    return null;
  }

  const updated: ProposalTemplate = {
    ...custom[index],
    ...patch,
    updatedAt: nowIso(),
    tiers: patch.tiers ? normalizeTiers(patch.tiers) : custom[index].tiers,
  };
  custom[index] = updated;
  await writeCustomTemplates(custom);
  return updated;
}

export async function deleteProposalTemplate(id: string) {
  const custom = await readCustomTemplates();
  const next = custom.filter((template) => template.id !== id);
  if (next.length === custom.length) {
    return false;
  }
  await writeCustomTemplates(next);
  return true;
}

export function applyTemplateToTierDefaults(
  template: ProposalTemplate,
  overrides?: TemplateTierOverride[],
) {
  const overrideMap = new Map((overrides || []).map((entry) => [entry.tier, entry]));

  return TIER_ORDER.map((tier) => {
    const base = template.tiers.find((entry) => entry.tier === tier);
    if (!base) {
      throw new Error(`Template ${template.id} is missing tier ${tier}`);
    }
    const override = overrideMap.get(tier);
    const addons = override?.defaultAddons ?? base.defaultAddons;

    return {
      tier,
      title: override?.title ?? base.title,
      laborCost: override?.laborCost ?? base.laborCost,
      pricingMode: override?.pricingMode ?? base.pricingMode,
      marginPercent: override?.marginPercent ?? base.marginPercent,
      sellPrice: override?.sellPrice ?? base.sellPrice,
      permitFee: override?.permitFee ?? base.permitFee,
      taxRatePercent: override?.taxRatePercent ?? base.taxRatePercent,
      warrantyLabel: override?.warrantyLabel ?? base.warrantyLabel,
      financingApr: override?.financingApr ?? base.financingApr,
      financingMonths: override?.financingMonths ?? base.financingMonths,
      pricingNotes: override?.pricingNotes ?? base.pricingNotes,
      defaultAddons: addons,
    };
  });
}
