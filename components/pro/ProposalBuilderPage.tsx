"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildDefaultTierFormsFromSettings,
  type BuilderTierForm,
} from "@/lib/sales/proposals/builder-defaults";
import {
  DEFAULT_PROPOSAL_PRICING_SETTINGS,
  type ProposalPricingSettings,
} from "@/lib/sales/proposals/settings-shared";

type CompanyOption = {
  companyId: string;
  companyName: string;
};

type RankedCompanyLead = CompanyOption;

type Opportunity = {
  id: string;
  title: string;
  stage: string;
  company: { id: string; name: string };
};

type InternalProposal = {
  id: string;
  opportunityId: string;
  publicToken: string;
  publicUrl: string;
  title: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  opportunity: { id: string; title: string };
  company: { id: string; name: string; slug: string };
  contact: { id: string; fullName: string | null; email: string | null } | null;
  selectedOption: { id: string; tier: "GOOD" | "BETTER" | "BEST"; title: string } | null;
  selectedOptionSummary: {
    id: string;
    tier: "GOOD" | "BETTER" | "BEST";
    title: string;
    equipment: string | null;
    finalPrice: number;
    warranty: string | null;
    financingEstimate: number | null;
    financingApr: number | null;
    financingMonths: number | null;
  } | null;
  lastEmailSentAt: string | null;
  lastEmailEventType: "EMAIL_SENT" | "FOLLOW_UP_SENT" | null;
  emailSendCount: number;
  followUpSendCount: number;
  maxFollowUps: number;
  needsFollowUp: boolean;
  followUpReason: string | null;
  daysSinceLastTouch: number | null;
  viewCount: number;
  lastViewedEventAt: string | null;
  optionFocusCount: number;
  mostFocusedOption: {
    optionId: string | null;
    tier: "GOOD" | "BETTER" | "BEST" | null;
    title: string | null;
    count: number;
    lastFocusedAt: string;
  } | null;
  options: Array<{
    id: string;
    tier: "GOOD" | "BETTER" | "BEST";
    title: string;
    finalCustomerPrice: number;
    grossMarginPercent?: number;
  }>;
};

type AcceptedProposalDetail = {
  id: string;
  publicToken: string;
  publicUrl: string;
  title: string;
  notes: string | null;
  status: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED";
  acceptedAt: string | null;
  opportunity: { id: string; title: string };
  company: { id: string; name: string; slug: string };
  contact: { id: string; fullName: string | null; email: string | null; phone: string | null } | null;
  selectedOption: {
    id: string;
    tier: "GOOD" | "BETTER" | "BEST";
    title: string;
    summary: string | null;
    equipmentSnapshot: unknown;
    equipmentLabel: string | null;
    warrantyLabel: string | null;
    financingApr: number | null;
    financingMonths: number | null;
    monthlyPaymentEstimate: number | null;
    equipmentCost: number;
    laborCost: number;
    addonsTotal: number;
    discountsTotal: number;
    rebatesTotal: number;
    totalCost: number;
    grossMarginAmount: number;
    grossMarginPercent: number;
    finalCustomerPrice: number;
    addonLines: Array<{
      id: string;
      type: "ADDON" | "DISCOUNT" | "REBATE";
      label: string;
      amount: number;
    }>;
  } | null;
  timeline: Array<{
    id: string;
    eventType: string;
    occurredAt: string;
    metadata: unknown;
  }>;
};

type CatalogItem = {
  id: string;
  equipmentType: string;
  brand: string;
  modelNumber: string;
  sizeTonnage?: string | null;
  efficiencyRating?: string | null;
  cost: number;
  pricingMode: "FIXED_SELL_PRICE" | "COST_PLUS_MARGIN";
  sellPrice: number | null;
  marginPercent: number | null;
};

type ProposalTemplate = {
  id: string;
  name: string;
  jobType: string;
  description: string;
  isActive: boolean;
  isBuiltIn: boolean;
  tiers: Array<{
    tier: "GOOD" | "BETTER" | "BEST";
    title: string;
    laborCost: number;
    warrantyLabel: string;
    financingApr: number;
    financingMonths: number;
    defaultAddons: Array<{
      type: "ADDON" | "DISCOUNT" | "REBATE";
      label: string;
      amount: number;
    }>;
    pricingNotes: string;
  }>;
};

type CreatedProposalOption = {
  tier: "GOOD" | "BETTER" | "BEST";
  finalCustomerPrice: number;
};

type TemplateDraftAddon = {
  type: "ADDON" | "DISCOUNT" | "REBATE";
  amount: number;
};

type TemplateDraftTier = {
  tier: "GOOD" | "BETTER" | "BEST";
  title: string;
  laborCost?: number | null;
  warrantyLabel?: string | null;
  financingApr?: number | null;
  financingMonths?: number | null;
  defaultAddons?: TemplateDraftAddon[];
};

type CatalogImportSummary = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
};

type CatalogImportRowError = {
  rowNumber: number;
  message: string;
};

type TierForm = BuilderTierForm;

export default function ProposalsPage() {
  const [loading, setLoading] = useState(true);
  const [creatingOpportunity, setCreatingOpportunity] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [markingSentId, setMarkingSentId] = useState<string | null>(null);
  const [markingDeclinedId, setMarkingDeclinedId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailFeedbackByProposal, setEmailFeedbackByProposal] = useState<Record<string, string>>({});
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "ACCEPTED">("ALL");
  const [activeAcceptedProposalId, setActiveAcceptedProposalId] = useState<string | null>(null);
  const [acceptedDetail, setAcceptedDetail] = useState<AcceptedProposalDetail | null>(null);
  const [acceptedDetailLoading, setAcceptedDetailLoading] = useState(false);
  const [acceptedDetailError, setAcceptedDetailError] = useState<string | null>(null);

  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [proposals, setProposals] = useState<InternalProposal[]>([]);
  const [proposalSettings, setProposalSettings] = useState<ProposalPricingSettings>(
    DEFAULT_PROPOSAL_PRICING_SETTINGS,
  );
  const [tiersInitialized, setTiersInitialized] = useState(false);

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [opportunityTitle, setOpportunityTitle] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("");

  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDisclaimer, setProposalDisclaimer] = useState(
    DEFAULT_PROPOSAL_PRICING_SETTINGS.proposalDisclaimer,
  );
  const [companyProposalFooter, setCompanyProposalFooter] = useState(
    DEFAULT_PROPOSAL_PRICING_SETTINGS.companyProposalFooter,
  );
  const [tiers, setTiers] = useState<TierForm[]>(
    buildDefaultTierFormsFromSettings(DEFAULT_PROPOSAL_PRICING_SETTINGS),
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [tonnageFilter, setTonnageFilter] = useState("");
  const [efficiencyFilter, setEfficiencyFilter] = useState("");
  const [catalogCsvFile, setCatalogCsvFile] = useState<File | null>(null);
  const [catalogImporting, setCatalogImporting] = useState(false);
  const [catalogImportSummary, setCatalogImportSummary] = useState<CatalogImportSummary | null>(null);
  const [catalogImportErrors, setCatalogImportErrors] = useState<CatalogImportRowError[]>([]);
  const [catalogExportActiveOnly, setCatalogExportActiveOnly] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAll() {
    try {
      setLoading(true);
      const [companiesRes, opportunitiesRes, catalogRes, templatesRes, settingsRes] = await Promise.all([
        fetch("/api/sales-machine/leads/ranked?minScore=0&limit=200"),
        fetch("/api/sales-machine/opportunities?limit=200"),
        fetch("/api/sales-machine/catalog?activeOnly=true&limit=500"),
        fetch("/api/sales-machine/proposals/templates"),
        fetch("/api/sales-machine/proposals/settings"),
      ]);

      const companiesJson = await companiesRes.json();
      const opportunitiesJson = await opportunitiesRes.json();
      const catalogJson = await catalogRes.json();
      const templatesJson = await templatesRes.json();
      const settingsJson = await settingsRes.json();

      if (companiesRes.ok) {
        setCompanies(((companiesJson.leads || []) as RankedCompanyLead[]).map((lead) => ({
          companyId: lead.companyId,
          companyName: lead.companyName,
        })));
      }
      if (opportunitiesRes.ok) setOpportunities(opportunitiesJson.opportunities || []);
      if (catalogRes.ok) setCatalog(catalogJson.items || []);
      if (templatesRes.ok) setTemplates(templatesJson.templates || []);
      if (settingsRes.ok && settingsJson.settings) {
        const loadedSettings = settingsJson.settings as ProposalPricingSettings;
        setProposalSettings(loadedSettings);
        setProposalDisclaimer(loadedSettings.proposalDisclaimer);
        setCompanyProposalFooter(loadedSettings.companyProposalFooter);
        if (!tiersInitialized) {
          setTiers(buildDefaultTierFormsFromSettings(loadedSettings));
          setTiersInitialized(true);
        }
      }
      await fetchProposals();
    } finally {
      setLoading(false);
    }
  }

  async function fetchProposals() {
    const proposalsRes = await fetch("/api/sales-machine/proposals/drafts?limit=100");
    const proposalsJson = await proposalsRes.json();
    if (proposalsRes.ok) {
      setProposals(proposalsJson.proposals || []);
    }
  }

  async function createOpportunity() {
    if (!selectedCompanyId || !opportunityTitle.trim()) {
      setResultMessage("Select company and enter opportunity title.");
      return;
    }

    setCreatingOpportunity(true);
    setResultMessage(null);
    try {
      const res = await fetch("/api/sales-machine/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          title: opportunityTitle.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create opportunity");

      setOpportunities((prev) => [data.opportunity, ...prev]);
      setSelectedOpportunityId(data.opportunity.id);
      setOpportunityTitle("");
      setResultMessage("Opportunity created.");
    } catch (error) {
      setResultMessage(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setCreatingOpportunity(false);
    }
  }

  async function createDraft() {
    if (!selectedOpportunityId) {
      setResultMessage("Choose an opportunity first.");
      return;
    }

    setCreatingDraft(true);
    setResultMessage(null);
    try {
      const payload = {
        opportunityId: selectedOpportunityId,
        title: proposalTitle.trim() || undefined,
        proposalDisclaimer: proposalDisclaimer.trim() || undefined,
        companyProposalFooter: companyProposalFooter.trim() || undefined,
        options: tiers.map((t) => ({
          tier: t.tier,
          title: t.title,
          equipmentItemId: t.equipmentItemId || undefined,
          laborCost: Number(t.laborCost || 0),
          pricingMode: t.pricingMode,
          marginPercent: Number(t.marginPercent || 0),
          sellPrice: t.sellPrice ? Number(t.sellPrice) : undefined,
          financingApr: t.financingApr ? Number(t.financingApr) : undefined,
          financingMonths: t.financingMonths ? Number(t.financingMonths) : undefined,
          permitFee: Number(t.permitFee || 0),
          taxRatePercent: Number(t.taxRatePercent || 0),
          warrantyLabel: t.warrantyLabel || undefined,
          addonLines: [
            { type: "ADDON", label: "Add-ons", amount: Number(t.addon || 0) },
            { type: "DISCOUNT", label: "Discount", amount: Number(t.discount || 0) },
            { type: "REBATE", label: "Rebate", amount: Number(t.rebate || 0) },
          ],
        })),
      };

      const res = await fetch("/api/sales-machine/proposals/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create draft proposal");

      const prices = data.proposal.options
        .map((o: CreatedProposalOption) => `${o.tier}: $${o.finalCustomerPrice.toLocaleString()}`)
        .join(" | ");
      setResultMessage(`Draft proposal created (${data.proposal.id}). ${prices}`);
      await fetchProposals();
    } catch (error) {
      setResultMessage(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setCreatingDraft(false);
    }
  }

  async function markSent(proposalId: string) {
    setMarkingSentId(proposalId);
    setResultMessage(null);
    try {
      const res = await fetch(`/api/sales-machine/proposals/${proposalId}/mark-sent`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark proposal sent");

      setResultMessage("Proposal marked sent.");
      await copyLink(data.publicUrl);
      await fetchProposals();
    } catch (error) {
      setResultMessage(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setMarkingSentId(null);
    }
  }

  async function markDeclined(proposalId: string) {
    setMarkingDeclinedId(proposalId);
    setResultMessage(null);
    try {
      const res = await fetch(`/api/sales-machine/proposals/${proposalId}/mark-declined`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark proposal declined");
      setResultMessage("Proposal marked declined.");
      await fetchProposals();
    } catch (error) {
      setResultMessage(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setMarkingDeclinedId(null);
    }
  }

  async function sendProposalEmail(proposalId: string) {
    setSendingEmailId(proposalId);
    setEmailFeedbackByProposal((prev) => ({ ...prev, [proposalId]: "" }));
    try {
      const res = await fetch(`/api/sales-machine/proposals/${proposalId}/send-email`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send proposal email");

      const label = data.eventType === "FOLLOW_UP_SENT" ? "Follow-up email sent" : "Email sent";
      setEmailFeedbackByProposal((prev) => ({
        ...prev,
        [proposalId]: `${label} to ${data.to}`,
      }));
    } catch (error) {
      setEmailFeedbackByProposal((prev) => ({
        ...prev,
        [proposalId]: error instanceof Error ? error.message : "Unexpected error",
      }));
    } finally {
      setSendingEmailId(null);
    }
  }

  async function copyLink(publicUrl: string) {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setResultMessage("Public proposal link copied.");
    } catch {
      setResultMessage(publicUrl);
    }
  }

  function toPrintUrl(publicUrl: string) {
    return `${publicUrl}?print=1`;
  }

  function openPrintView(publicUrl: string) {
    window.open(toPrintUrl(publicUrl), "_blank", "noopener,noreferrer");
  }

  async function openAcceptedDetail(proposalId: string) {
    setActiveAcceptedProposalId(proposalId);
    setAcceptedDetailLoading(true);
    setAcceptedDetailError(null);
    setAcceptedDetail(null);

    try {
      const res = await fetch(`/api/sales-machine/proposals/${proposalId}/accepted-summary`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load accepted proposal detail");
      }
      setAcceptedDetail(data.summary);
    } catch (error) {
      setAcceptedDetailError(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setAcceptedDetailLoading(false);
    }
  }

  function closeAcceptedDetail() {
    setActiveAcceptedProposalId(null);
    setAcceptedDetail(null);
    setAcceptedDetailError(null);
  }

  function buildWorkOrderSummary(detail: AcceptedProposalDetail) {
    const selected = detail.selectedOption;
    if (!selected) {
      return "Accepted proposal has no selected option summary available.";
    }

    return [
      `Customer: ${detail.contact?.fullName || detail.contact?.email || detail.company.name}`,
      `Company: ${detail.company.name}`,
      `Contact Email: ${detail.contact?.email || "N/A"}`,
      `Opportunity: ${detail.opportunity.title}`,
      `Selected Option: ${selected.tier} - ${selected.title}`,
      `Equipment: ${selected.equipmentLabel || "N/A"}`,
      `Final Price: $${selected.finalCustomerPrice.toLocaleString()}`,
      `Warranty: ${selected.warrantyLabel || "N/A"}`,
      `Notes: ${detail.notes || "None"}`,
      `Public Proposal Link: ${detail.publicUrl}`,
    ].join("\n");
  }

  async function copyWorkOrderSummary(detail: AcceptedProposalDetail) {
    const summary = buildWorkOrderSummary(detail);
    try {
      await navigator.clipboard.writeText(summary);
      setResultMessage("Work order summary copied.");
    } catch {
      setResultMessage(summary);
    }
  }

  async function applySelectedTemplate(templateId: string) {
    if (!templateId) {
      setTiers(buildDefaultTierFormsFromSettings(proposalSettings));
      return;
    }

    setTemplateLoading(true);
    setResultMessage(null);
    try {
      const res = await fetch(`/api/sales-machine/proposals/templates/${templateId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply template");

      const nextTiers: TierForm[] = ((data.draftDefaults?.tiers || []) as TemplateDraftTier[]).map((entry) => {
        const addonTotal = (entry.defaultAddons || [])
          .filter((line) => line.type === "ADDON")
          .reduce((sum, line) => sum + Number(line.amount || 0), 0);
        const discountTotal = (entry.defaultAddons || [])
          .filter((line) => line.type === "DISCOUNT")
          .reduce((sum, line) => sum + Number(line.amount || 0), 0);
        const rebateTotal = (entry.defaultAddons || [])
          .filter((line) => line.type === "REBATE")
          .reduce((sum, line) => sum + Number(line.amount || 0), 0);

        return {
          tier: entry.tier,
          title: entry.title,
          equipmentItemId: "",
          laborCost: String(entry.laborCost ?? 0),
          pricingMode: "COST_PLUS_MARGIN",
          marginPercent: "35",
          sellPrice: "",
          financingApr: String(entry.financingApr ?? ""),
          financingMonths: String(entry.financingMonths ?? ""),
          addon: String(addonTotal),
          discount: String(discountTotal),
          rebate: String(rebateTotal),
          permitFee: String(proposalSettings.permitFeeDefault),
          taxRatePercent: String(proposalSettings.taxRatePercent),
          warrantyLabel: entry.warrantyLabel || "",
        } as TierForm;
      });

      if (nextTiers.length === 3) {
        setTiers(nextTiers);
        setResultMessage(`Template applied: ${data.template?.name || "Custom template"}`);
      }
    } catch (error) {
      setResultMessage(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setTemplateLoading(false);
    }
  }

  async function runCatalogImport() {
    if (!catalogCsvFile) {
      setResultMessage("Choose a CSV file to import.");
      return;
    }

    setCatalogImporting(true);
    setCatalogImportSummary(null);
    setCatalogImportErrors([]);
    setResultMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", catalogCsvFile);

      const res = await fetch("/api/sales-machine/catalog/import-csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "CSV import failed");

      setCatalogImportSummary(data.summary || null);
      setCatalogImportErrors(data.rowErrors || []);
      setResultMessage("Catalog CSV import completed.");
      await fetchAll();
    } catch (error) {
      setResultMessage(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setCatalogImporting(false);
    }
  }

  function exportCatalogCsv(activeOnly = false) {
    const url = `/api/sales-machine/catalog/export-csv${activeOnly ? "?activeOnly=true" : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const opportunityChoices = useMemo(
    () => opportunities.map((opp) => ({
      id: opp.id,
      label: `${opp.company.name} — ${opp.title} (${opp.stage})`,
    })),
    [opportunities],
  );

  const equipmentTypeOptions = useMemo(
    () => Array.from(new Set(catalog.map((item) => item.equipmentType))).sort(),
    [catalog],
  );

  const brandOptions = useMemo(
    () => Array.from(new Set(catalog.map((item) => item.brand))).sort(),
    [catalog],
  );

  const tonnageOptions = useMemo(
    () =>
      Array.from(
        new Set(catalog.map((item) => item.sizeTonnage).filter((value): value is string => !!value)),
      ).sort(),
    [catalog],
  );

  const efficiencyOptions = useMemo(
    () =>
      Array.from(
        new Set(catalog.map((item) => item.efficiencyRating).filter((value): value is string => !!value)),
      ).sort(),
    [catalog],
  );

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return catalog.filter((item) => {
      if (equipmentTypeFilter && item.equipmentType !== equipmentTypeFilter) return false;
      if (brandFilter && item.brand !== brandFilter) return false;
      if (tonnageFilter && (item.sizeTonnage || "") !== tonnageFilter) return false;
      if (efficiencyFilter && (item.efficiencyRating || "") !== efficiencyFilter) return false;

      if (!q) return true;
      return [
        item.brand,
        item.modelNumber,
        item.equipmentType,
        item.sizeTonnage || "",
        item.efficiencyRating || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [catalog, catalogSearch, equipmentTypeFilter, brandFilter, tonnageFilter, efficiencyFilter]);

  const drafts = useMemo(
    () => proposals.filter((proposal) => proposal.status === "DRAFT"),
    [proposals],
  );

  const proposalHistory = useMemo(
    () => proposals.filter((proposal) => proposal.status !== "DRAFT"),
    [proposals],
  );

  const acceptedHistory = useMemo(
    () => proposalHistory.filter((proposal) => proposal.status === "ACCEPTED"),
    [proposalHistory],
  );

  const visibleHistory = useMemo(
    () => (historyFilter === "ACCEPTED" ? acceptedHistory : proposalHistory),
    [historyFilter, proposalHistory, acceptedHistory],
  );

  function formatDate(value: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  }

  function statusTone(status: InternalProposal["status"]) {
    if (status === "ACCEPTED") return "border-emerald-300 bg-emerald-50 text-emerald-800";
    if (status === "DECLINED") return "border-rose-300 bg-rose-50 text-rose-800";
    if (status === "VIEWED") return "border-blue-300 bg-blue-50 text-blue-800";
    if (status === "SENT") return "border-amber-300 bg-amber-50 text-amber-800";
    return "border-slate-300 bg-slate-50 text-slate-700";
  }

  function emailStatusLabel(proposal: InternalProposal) {
    if (!proposal.lastEmailSentAt || !proposal.lastEmailEventType) {
      return "Not emailed";
    }

    const when = formatDate(proposal.lastEmailSentAt);
    if (proposal.lastEmailEventType === "FOLLOW_UP_SENT") {
      return `Follow-up sent ${when}`;
    }

    return `Initial sent ${when}`;
  }

  function optionFocusLabel(proposal: InternalProposal) {
    const focused = proposal.mostFocusedOption;
    if (!focused) {
      return "No package focus yet";
    }

    const label = [focused.tier, focused.title].filter(Boolean).join(" - ");
    return `${label || "Package"} (${focused.count} focus${focused.count === 1 ? "" : "es"})`;
  }

  if (loading) {
    return <p className="text-[color:var(--muted)]">Loading proposal builder...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text)]">Proposal Builder</h1>
          <p className="mt-2 text-[color:var(--muted)]">
            Create Good / Better / Best HVAC replacement proposals.
          </p>
        </div>
        <Link
          href="/pro/proposals/settings"
          className="shrink-0 rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
        >
          ⚙️ Proposal Settings
        </Link>
      </div>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5 space-y-4">
        <h2 className="text-xl font-semibold">1) Create Opportunity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2"
          >
            <option value="">Select company</option>
            {companies.map((company) => (
              <option key={company.companyId} value={company.companyId}>
                {company.companyName}
              </option>
            ))}
          </select>

          <input
            value={opportunityTitle}
            onChange={(e) => setOpportunityTitle(e.target.value)}
            placeholder="e.g. 4-ton Heat Pump Replacement"
            className="rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2"
          />

          <button
            onClick={createOpportunity}
            disabled={creatingOpportunity}
            className="rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-4 py-2 font-semibold text-[#001] disabled:opacity-60"
          >
            {creatingOpportunity ? "Creating..." : "Create Opportunity"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5 space-y-4">
        <h2 className="text-xl font-semibold">2) Build Draft Proposal</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2"
          >
            <option value="">Select template (optional)</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => applySelectedTemplate(selectedTemplateId)}
            disabled={!selectedTemplateId || templateLoading}
            className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {templateLoading ? "Applying template..." : "Apply Template"}
          </button>

          <p className="text-sm text-[color:var(--muted)]">
            Templates preload Good/Better/Best defaults. You can edit every field before saving.
          </p>
        </div>

        {selectedTemplateId && (
          <div className="rounded-lg border border-[color:var(--border)] bg-white/5 p-3 text-sm text-[color:var(--muted)]">
            {(templates.find((template) => template.id === selectedTemplateId)?.tiers || []).map((tier) => (
              <p key={tier.tier}>
                {tier.tier} pricing notes: {tier.pricingNotes}
              </p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={selectedOpportunityId}
            onChange={(e) => setSelectedOpportunityId(e.target.value)}
            className="rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2"
          >
            <option value="">Select opportunity</option>
            {opportunityChoices.map((opp) => (
              <option key={opp.id} value={opp.id}>
                {opp.label}
              </option>
            ))}
          </select>

          <input
            value={proposalTitle}
            onChange={(e) => setProposalTitle(e.target.value)}
            placeholder="Optional proposal title"
            className="rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <textarea
            value={proposalDisclaimer}
            onChange={(e) => setProposalDisclaimer(e.target.value)}
            placeholder="Proposal disclaimer"
            rows={3}
            className="rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2"
          />
          <textarea
            value={companyProposalFooter}
            onChange={(e) => setCompanyProposalFooter(e.target.value)}
            placeholder="Company footer text"
            rows={3}
            className="rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2"
          />
        </div>

        <div className="rounded-lg border border-[color:var(--border)] bg-white/5 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[color:var(--text)]">
              Catalog filters
            </p>
            <Link
              href="/pro/catalog"
              className="text-sm font-semibold text-[color:var(--accent)] hover:opacity-90"
            >
              Manage Catalog
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Search model, brand, type"
              className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
            />
            <select
              value={equipmentTypeFilter}
              onChange={(e) => setEquipmentTypeFilter(e.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
            >
              <option value="">All types</option>
              {equipmentTypeOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
            >
              <option value="">All brands</option>
              {brandOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={tonnageFilter}
              onChange={(e) => setTonnageFilter(e.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
            >
              <option value="">All tonnage</option>
              {tonnageOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={efficiencyFilter}
              onChange={(e) => setEfficiencyFilter(e.target.value)}
              className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
            >
              <option value="">All efficiency</option>
              {efficiencyOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-[color:var(--muted)]">Showing {filteredCatalog.length} filtered catalog items.</p>
        </div>

        <div className="rounded-lg border border-[color:var(--border)] bg-white/5 p-3 space-y-3">
          <p className="text-sm font-semibold text-[color:var(--text)]">Catalog CSV Import / Export</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCatalogCsvFile(e.target.files?.[0] || null)}
              className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2 text-sm"
            />
            <button
              onClick={runCatalogImport}
              disabled={!catalogCsvFile || catalogImporting}
              className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {catalogImporting ? "Importing..." : "Import CSV"}
            </button>
            <button
              onClick={() => exportCatalogCsv(catalogExportActiveOnly)}
              className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold"
            >
              Export CSV
            </button>
            <a
              href="/samples/hvac-catalog-template.csv"
              download
              className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-center"
            >
              Download Template CSV
            </a>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-[color:var(--muted)]">
            <input
              type="checkbox"
              checked={catalogExportActiveOnly}
              onChange={(e) => setCatalogExportActiveOnly(e.target.checked)}
            />
            Export active items only
          </label>

          {catalogImportSummary && (
            <div className="rounded-lg border border-[color:var(--border)] bg-black/20 p-3 text-sm text-[color:var(--muted)]">
              <p>
                Import summary: created {catalogImportSummary.created}, updated {catalogImportSummary.updated},
                skipped {catalogImportSummary.skipped}, errors {catalogImportSummary.errors}
              </p>
            </div>
          )}

          {catalogImportErrors.length > 0 && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 space-y-1">
              <p className="font-semibold">Row errors</p>
              {catalogImportErrors.slice(0, 20).map((entry, idx) => (
                <p key={`${entry.rowNumber}-${idx}`}>
                  Row {entry.rowNumber}: {entry.message}
                </p>
              ))}
              {catalogImportErrors.length > 20 && (
                <p>+{catalogImportErrors.length - 20} more errors...</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {tiers.map((tier, index) => (
            <div
              key={tier.tier}
              className="rounded-xl border border-[color:var(--border)] bg-white/5 p-4 space-y-3"
            >
              <p className="font-semibold">{tier.tier} option</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  value={tier.title}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].title = e.target.value;
                    setTiers(next);
                  }}
                  placeholder="Option title"
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                />

                <select
                  value={tier.equipmentItemId}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].equipmentItemId = e.target.value;
                    setTiers(next);
                  }}
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                >
                  <option value="">Select equipment</option>
                  {filteredCatalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.brand} {item.modelNumber} ({item.equipmentType}
                      {item.sizeTonnage ? ` • ${item.sizeTonnage}` : ""}
                      {item.efficiencyRating ? ` • ${item.efficiencyRating}` : ""})
                    </option>
                  ))}
                </select>

                <input
                  value={tier.laborCost}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].laborCost = e.target.value;
                    setTiers(next);
                  }}
                  placeholder="Labor cost"
                  type="number"
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                />

                <select
                  value={tier.pricingMode}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].pricingMode = e.target.value as TierForm["pricingMode"];
                    setTiers(next);
                  }}
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                >
                  <option value="COST_PLUS_MARGIN">Cost + Margin</option>
                  <option value="FIXED_SELL_PRICE">Fixed Sell Price</option>
                </select>

                <input
                  value={tier.marginPercent}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].marginPercent = e.target.value;
                    setTiers(next);
                  }}
                  placeholder="Margin %"
                  type="number"
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                />

                <input
                  value={tier.sellPrice}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].sellPrice = e.target.value;
                    setTiers(next);
                  }}
                  placeholder="Fixed sell price"
                  type="number"
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                />

                <input
                  value={tier.addon}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].addon = e.target.value;
                    setTiers(next);
                  }}
                  placeholder="Add-ons"
                  type="number"
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                />

                <input
                  value={tier.discount}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].discount = e.target.value;
                    setTiers(next);
                  }}
                  placeholder="Discount"
                  type="number"
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                />

                <input
                  value={tier.rebate}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].rebate = e.target.value;
                    setTiers(next);
                  }}
                  placeholder="Rebate"
                  type="number"
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                />

                <input
                  value={tier.permitFee}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].permitFee = e.target.value;
                    setTiers(next);
                  }}
                  placeholder="Permit / fees"
                  type="number"
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                />

                <input
                  value={tier.taxRatePercent}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].taxRatePercent = e.target.value;
                    setTiers(next);
                  }}
                  placeholder="Tax %"
                  type="number"
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                />

                <input
                  value={tier.financingApr}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].financingApr = e.target.value;
                    setTiers(next);
                  }}
                  placeholder="APR"
                  type="number"
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                />

                <input
                  value={tier.financingMonths}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].financingMonths = e.target.value;
                    setTiers(next);
                  }}
                  placeholder="Financing months"
                  type="number"
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                />

                <input
                  value={tier.warrantyLabel}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[index].warrantyLabel = e.target.value;
                    setTiers(next);
                  }}
                  placeholder="Warranty"
                  className="rounded-lg border border-[color:var(--border)] bg-black/20 px-3 py-2"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={createDraft}
          disabled={creatingDraft}
          className="rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-5 py-2.5 font-semibold text-[#001] disabled:opacity-60"
        >
          {creatingDraft ? "Creating draft..." : "Create Draft Good/Better/Best Proposal"}
        </button>

        {resultMessage && (
          <p className="text-sm text-[color:var(--muted)]">{resultMessage}</p>
        )}
      </section>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">3) Share Draft Proposals</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Mark a draft as sent before sharing its public proposal link.
          </p>
        </div>

        {drafts.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No draft proposals are waiting to be shared.</p>
        ) : (
          <div className="space-y-3">
            {drafts.map((proposal) => (
              <div
                key={proposal.id}
                className="rounded-xl border border-[color:var(--border)] bg-white/5 p-4 md:flex md:items-center md:justify-between md:gap-4"
              >
                <div>
                  <p className="font-semibold text-[color:var(--text)]">{proposal.title}</p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">{proposal.company.name}</p>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    {proposal.options
                      .map((option) => `${option.tier}: $${option.finalCustomerPrice.toLocaleString()}`)
                      .join(" | ")}
                  </p>
                </div>

                <button
                  onClick={() => markSent(proposal.id)}
                  disabled={markingSentId === proposal.id}
                  className="mt-4 rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-4 py-2 font-semibold text-[#001] disabled:opacity-60 md:mt-0"
                >
                  {markingSentId === proposal.id ? "Marking sent..." : "Mark Sent"}
                </button>
              </div>
            ))}
          </div>
        )}

      </section>

      <section id="proposal-history" className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">4) Proposal History</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Shared proposals remain available here with status, timestamps, and public actions.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setHistoryFilter("ALL")}
              className={`rounded-lg border px-3 py-1 text-sm font-semibold ${
                historyFilter === "ALL"
                  ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                  : "border-[color:var(--border)] text-[color:var(--muted)]"
              }`}
            >
              All History ({proposalHistory.length})
            </button>
            <button
              onClick={() => setHistoryFilter("ACCEPTED")}
              className={`rounded-lg border px-3 py-1 text-sm font-semibold ${
                historyFilter === "ACCEPTED"
                  ? "border-emerald-400 text-emerald-500"
                  : "border-[color:var(--border)] text-[color:var(--muted)]"
              }`}
            >
              Accepted Proposals ({acceptedHistory.length})
            </button>
          </div>
        </div>

        {visibleHistory.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No sent or completed proposals yet.</p>
        ) : (
          <div className="space-y-4">
            {visibleHistory.map((proposal) => (
              <div
                key={proposal.id}
                className="rounded-xl border border-[color:var(--border)] bg-white/5 p-4 space-y-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-[color:var(--text)]">{proposal.company.name}</p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">Opportunity: {proposal.opportunity.title}</p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">Proposal: {proposal.title}</p>
                    {proposal.contact && (
                      <p className="mt-1 text-sm text-[color:var(--muted)]">
                        Customer: {proposal.contact.fullName || proposal.contact.email || "Linked contact"}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${statusTone(proposal.status)}`}>
                      {proposal.status}
                    </span>
                    {proposal.needsFollowUp && (
                      <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold tracking-wide text-amber-800">
                        Needs follow-up
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm text-[color:var(--muted)] md:grid-cols-4">
                  <p>Sent: {formatDate(proposal.sentAt)}</p>
                  <p>Viewed: {formatDate(proposal.viewedAt)}</p>
                  <p>Accepted: {formatDate(proposal.acceptedAt)}</p>
                  <p>Declined: {formatDate(proposal.declinedAt)}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm text-[color:var(--muted)] md:grid-cols-2">
                  <p>Email status: {emailStatusLabel(proposal)}</p>
                  <p>Total email sends: {proposal.emailSendCount}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm text-[color:var(--muted)] md:grid-cols-3">
                  <p>
                    Proposal views: {proposal.viewCount}
                    {proposal.lastViewedEventAt ? ` (last ${formatDate(proposal.lastViewedEventAt)})` : ""}
                  </p>
                  <p>Package focus: {optionFocusLabel(proposal)}</p>
                  <p>
                    Follow-ups sent: {proposal.followUpSendCount}/{proposal.maxFollowUps}
                  </p>
                </div>

                {proposal.followUpReason && (
                  <p className="text-sm text-[color:var(--muted)]">
                    Follow-up detail: {proposal.followUpReason}
                    {proposal.daysSinceLastTouch !== null && ` (${proposal.daysSinceLastTouch} days since last touch)`}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text)]">Selected Option</p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      {proposal.selectedOption
                        ? `${proposal.selectedOption.tier} - ${proposal.selectedOption.title}`
                        : "No accepted option selected yet"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text)]">Public Proposal Link</p>
                    <p className="mt-1 break-all text-sm text-[color:var(--muted)]">{proposal.publicUrl}</p>
                  </div>
                </div>

                {proposal.status === "ACCEPTED" && proposal.selectedOptionSummary && (
                  <div className="grid grid-cols-1 gap-3 text-sm text-[color:var(--muted)] md:grid-cols-3">
                    <p>Selected tier: {proposal.selectedOptionSummary.tier}</p>
                    <p>Equipment: {proposal.selectedOptionSummary.equipment || "-"}</p>
                    <p>Final price: ${proposal.selectedOptionSummary.finalPrice.toLocaleString()}</p>
                    <p>Warranty: {proposal.selectedOptionSummary.warranty || "-"}</p>
                    <p>
                      Financing estimate: {proposal.selectedOptionSummary.financingEstimate !== null
                        ? `$${proposal.selectedOptionSummary.financingEstimate.toLocaleString()}`
                        : "-"}
                    </p>
                    <p>Accepted at: {formatDate(proposal.acceptedAt)}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {(proposal.status === "SENT" || proposal.status === "VIEWED") && proposal.needsFollowUp && (
                    <button
                      onClick={() => sendProposalEmail(proposal.id)}
                      disabled={sendingEmailId === proposal.id}
                      className="rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-4 py-2 text-sm font-semibold text-[#001] disabled:opacity-60"
                    >
                      {sendingEmailId === proposal.id ? "Sending..." : "Send Follow-Up"}
                    </button>
                  )}
                  <button
                    onClick={() => copyLink(proposal.publicUrl)}
                    className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold"
                  >
                    Copy Public Link
                  </button>
                  <button
                    onClick={() => openPrintView(proposal.publicUrl)}
                    className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold"
                  >
                    Print Proposal
                  </button>
                  <button
                    onClick={() => copyLink(toPrintUrl(proposal.publicUrl))}
                    className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold"
                  >
                    Copy Print Link
                  </button>
                  <a
                    href={proposal.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold"
                  >
                    Open Proposal
                  </a>
                  {proposal.status === "ACCEPTED" && (
                    <button
                      onClick={() => openAcceptedDetail(proposal.id)}
                      disabled={acceptedDetailLoading && activeAcceptedProposalId === proposal.id}
                      className="rounded-lg border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-600 disabled:opacity-60"
                    >
                      {acceptedDetailLoading && activeAcceptedProposalId === proposal.id
                        ? "Loading handoff..."
                        : "View Handoff"}
                    </button>
                  )}
                  {proposal.status !== "ACCEPTED" && proposal.status !== "DECLINED" && (
                    <button
                      onClick={() => markDeclined(proposal.id)}
                      disabled={markingDeclinedId === proposal.id}
                      className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60"
                    >
                      {markingDeclinedId === proposal.id ? "Marking declined..." : "Mark Declined"}
                    </button>
                  )}
                </div>

                {emailFeedbackByProposal[proposal.id] && (
                  <p className="text-sm text-[color:var(--muted)]">{emailFeedbackByProposal[proposal.id]}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {activeAcceptedProposalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[color:var(--text)]">Accepted Proposal Handoff</h3>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Internal summary for operations handoff and work order prep.
                </p>
              </div>
              <button
                onClick={closeAcceptedDetail}
                className="rounded-lg border border-[color:var(--border)] px-3 py-1 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            {acceptedDetailLoading && (
              <p className="text-sm text-[color:var(--muted)]">Loading accepted proposal details...</p>
            )}

            {!acceptedDetailLoading && acceptedDetailError && (
              <p className="text-sm text-rose-600">{acceptedDetailError}</p>
            )}

            {!acceptedDetailLoading && acceptedDetail && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <p>Customer: {acceptedDetail.contact?.fullName || acceptedDetail.contact?.email || acceptedDetail.company.name}</p>
                  <p>Company: {acceptedDetail.company.name}</p>
                  <p>Contact email: {acceptedDetail.contact?.email || "-"}</p>
                  <p>Contact phone: {acceptedDetail.contact?.phone || "-"}</p>
                  <p>Opportunity: {acceptedDetail.opportunity.title}</p>
                  <p>Accepted at: {formatDate(acceptedDetail.acceptedAt)}</p>
                </div>

                {acceptedDetail.selectedOption ? (
                  <>
                    <div className="rounded-lg border border-[color:var(--border)] bg-white/5 p-4">
                      <p className="text-sm font-semibold text-[color:var(--text)]">Selected Option</p>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-[color:var(--muted)] md:grid-cols-2">
                        <p>Tier: {acceptedDetail.selectedOption.tier}</p>
                        <p>Title: {acceptedDetail.selectedOption.title}</p>
                        <p>Equipment: {acceptedDetail.selectedOption.equipmentLabel || "-"}</p>
                        <p>Warranty: {acceptedDetail.selectedOption.warrantyLabel || "-"}</p>
                        <p>
                          Financing estimate: {acceptedDetail.selectedOption.monthlyPaymentEstimate !== null
                            ? `$${acceptedDetail.selectedOption.monthlyPaymentEstimate.toLocaleString()}`
                            : "-"}
                        </p>
                        <p>
                          Financing terms: {acceptedDetail.selectedOption.financingApr ?? "-"}% /
                          {" "}{acceptedDetail.selectedOption.financingMonths ?? "-"} months
                        </p>
                        <p>Final customer price: ${acceptedDetail.selectedOption.finalCustomerPrice.toLocaleString()}</p>
                        <p>Total cost: ${acceptedDetail.selectedOption.totalCost.toLocaleString()}</p>
                        <p>Equipment cost: ${acceptedDetail.selectedOption.equipmentCost.toLocaleString()}</p>
                        <p>Labor cost: ${acceptedDetail.selectedOption.laborCost.toLocaleString()}</p>
                        <p>Add-ons total: ${acceptedDetail.selectedOption.addonsTotal.toLocaleString()}</p>
                        <p>Discounts total: ${acceptedDetail.selectedOption.discountsTotal.toLocaleString()}</p>
                        <p>Rebates total: ${acceptedDetail.selectedOption.rebatesTotal.toLocaleString()}</p>
                        <p>Gross margin: ${acceptedDetail.selectedOption.grossMarginAmount.toLocaleString()} ({acceptedDetail.selectedOption.grossMarginPercent.toFixed(1)}%)</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[color:var(--border)] bg-white/5 p-4">
                      <p className="text-sm font-semibold text-[color:var(--text)]">Add-ons / Discounts / Rebates</p>
                      {acceptedDetail.selectedOption.addonLines.length === 0 ? (
                        <p className="mt-2 text-sm text-[color:var(--muted)]">No adjustment lines.</p>
                      ) : (
                        <div className="mt-2 space-y-1 text-sm text-[color:var(--muted)]">
                          {acceptedDetail.selectedOption.addonLines.map((line) => (
                            <p key={line.id}>
                              {line.type}: {line.label} (${line.amount.toLocaleString()})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[color:var(--muted)]">No selected option is linked to this accepted proposal.</p>
                )}

                <div className="rounded-lg border border-[color:var(--border)] bg-white/5 p-4">
                  <p className="text-sm font-semibold text-[color:var(--text)]">Proposal Event Timeline</p>
                  {acceptedDetail.timeline.length === 0 ? (
                    <p className="mt-2 text-sm text-[color:var(--muted)]">No recorded events.</p>
                  ) : (
                    <div className="mt-2 space-y-1 text-sm text-[color:var(--muted)]">
                      {acceptedDetail.timeline.map((event) => (
                        <p key={event.id}>{formatDate(event.occurredAt)} - {event.eventType}</p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => copyWorkOrderSummary(acceptedDetail)}
                    className="rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-4 py-2 text-sm font-semibold text-[#001]"
                  >
                    Copy Work Order Summary
                  </button>
                  <button
                    onClick={() => copyLink(acceptedDetail.publicUrl)}
                    className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold"
                  >
                    Copy Public Link
                  </button>
                  <a
                    href={acceptedDetail.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold"
                  >
                    Open Public Proposal
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
