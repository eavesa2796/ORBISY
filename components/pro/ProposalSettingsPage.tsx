"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_PROPOSAL_PRICING_SETTINGS,
  type ProposalPricingSettings,
} from "@/lib/sales/proposals/settings-shared";

type FormState = {
  defaultLaborCost: string;
  defaultFinancingApr: string;
  defaultFinancingMonths: string;
  defaultWarrantyGood: string;
  defaultWarrantyBetter: string;
  defaultWarrantyBest: string;
  permitFeeDefault: string;
  taxRatePercent: string;
  companyProposalFooter: string;
  proposalDisclaimer: string;
};

type ValidationErrors = Partial<Record<keyof FormState, string>>;

function settingsToForm(settings: ProposalPricingSettings): FormState {
  return {
    defaultLaborCost: String(settings.defaultLaborCost),
    defaultFinancingApr: String(settings.defaultFinancingApr),
    defaultFinancingMonths: String(settings.defaultFinancingMonths),
    defaultWarrantyGood: settings.defaultWarrantyGood,
    defaultWarrantyBetter: settings.defaultWarrantyBetter,
    defaultWarrantyBest: settings.defaultWarrantyBest,
    permitFeeDefault: String(settings.permitFeeDefault),
    taxRatePercent: String(settings.taxRatePercent),
    companyProposalFooter: settings.companyProposalFooter,
    proposalDisclaimer: settings.proposalDisclaimer,
  };
}

export function validateProposalSettingsForm(
  form: FormState,
): ValidationErrors {
  const errors: ValidationErrors = {};

  const laborCost = Number(form.defaultLaborCost);
  if (
    !form.defaultLaborCost.trim() ||
    !Number.isFinite(laborCost) ||
    laborCost < 0
  ) {
    errors.defaultLaborCost = "Must be a non-negative number";
  }

  const apr = Number(form.defaultFinancingApr);
  if (!form.defaultFinancingApr.trim() || !Number.isFinite(apr) || apr < 0) {
    errors.defaultFinancingApr = "Must be a non-negative number";
  }

  const months = Math.round(Number(form.defaultFinancingMonths));
  if (
    !form.defaultFinancingMonths.trim() ||
    !Number.isFinite(months) ||
    months <= 0
  ) {
    errors.defaultFinancingMonths = "Must be a positive integer";
  }

  const permit = Number(form.permitFeeDefault);
  if (!form.permitFeeDefault.trim() || !Number.isFinite(permit) || permit < 0) {
    errors.permitFeeDefault = "Must be a non-negative number";
  }

  const tax = Number(form.taxRatePercent);
  if (
    !form.taxRatePercent.trim() ||
    !Number.isFinite(tax) ||
    tax < 0 ||
    tax > 20
  ) {
    errors.taxRatePercent = "Must be between 0 and 20";
  }

  if (!form.defaultWarrantyGood.trim()) {
    errors.defaultWarrantyGood = "Required";
  }
  if (!form.defaultWarrantyBetter.trim()) {
    errors.defaultWarrantyBetter = "Required";
  }
  if (!form.defaultWarrantyBest.trim()) {
    errors.defaultWarrantyBest = "Required";
  }

  return errors;
}

export default function ProposalSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [form, setForm] = useState<FormState>(
    settingsToForm(DEFAULT_PROPOSAL_PRICING_SETTINGS),
  );
  const [savedSnapshot, setSavedSnapshot] = useState<FormState>(
    settingsToForm(DEFAULT_PROPOSAL_PRICING_SETTINGS),
  );
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/sales-machine/proposals/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load settings");
      const loaded = settingsToForm(data.settings as ProposalPricingSettings);
      setForm(loaded);
      setSavedSnapshot(loaded);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setSaveMessage(null);
  }

  async function handleSave() {
    const errors = validateProposalSettingsForm(form);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    try {
      const payload: Partial<ProposalPricingSettings> = {
        defaultLaborCost: Number(form.defaultLaborCost),
        defaultFinancingApr: Number(form.defaultFinancingApr),
        defaultFinancingMonths: Math.round(Number(form.defaultFinancingMonths)),
        defaultWarrantyGood: form.defaultWarrantyGood.trim(),
        defaultWarrantyBetter: form.defaultWarrantyBetter.trim(),
        defaultWarrantyBest: form.defaultWarrantyBest.trim(),
        permitFeeDefault: Number(form.permitFeeDefault),
        taxRatePercent: Number(form.taxRatePercent),
        companyProposalFooter: form.companyProposalFooter.trim(),
        proposalDisclaimer: form.proposalDisclaimer.trim(),
      };

      const res = await fetch("/api/sales-machine/proposals/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      const saved = settingsToForm(data.settings as ProposalPricingSettings);
      setForm(saved);
      setSavedSnapshot(saved);
      setSaveMessage({ type: "success", text: "Settings saved." });
    } catch (error) {
      setSaveMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm(savedSnapshot);
    setValidationErrors({});
    setSaveMessage(null);
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedSnapshot);

  if (loading) {
    return (
      <p className="text-[color:var(--muted)]">Loading proposal settings...</p>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="text-rose-500">{loadError}</p>
        <button
          onClick={loadSettings}
          className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[color:var(--muted)]">
            <Link
              href="/pro/proposals"
              className="hover:underline text-[color:var(--muted)]"
            >
              Proposals
            </Link>
            {" / "}
            <span>Settings</span>
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[color:var(--text)]">
            Proposal Settings
          </h1>
          <p className="mt-2 text-[color:var(--muted)]">
            Default values applied when creating new proposal options. Each
            field can still be overridden per-proposal.
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5 space-y-5">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">
          Labor &amp; Financing Defaults
        </h2>

        <Field
          label="Default Labor Cost ($)"
          error={validationErrors.defaultLaborCost}
        >
          <input
            type="number"
            min={0}
            step="any"
            value={form.defaultLaborCost}
            onChange={(e) => setField("defaultLaborCost", e.target.value)}
            disabled={saving}
            className={inputCls(!!validationErrors.defaultLaborCost)}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Default Financing APR (%)"
            error={validationErrors.defaultFinancingApr}
          >
            <input
              type="number"
              min={0}
              step="any"
              value={form.defaultFinancingApr}
              onChange={(e) => setField("defaultFinancingApr", e.target.value)}
              disabled={saving}
              className={inputCls(!!validationErrors.defaultFinancingApr)}
            />
          </Field>

          <Field
            label="Default Financing Months"
            error={validationErrors.defaultFinancingMonths}
          >
            <input
              type="number"
              min={1}
              step={1}
              value={form.defaultFinancingMonths}
              onChange={(e) =>
                setField("defaultFinancingMonths", e.target.value)
              }
              disabled={saving}
              className={inputCls(!!validationErrors.defaultFinancingMonths)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5 space-y-5">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">
          Warranty Defaults
        </h2>

        <Field
          label="Good Warranty Label"
          error={validationErrors.defaultWarrantyGood}
        >
          <input
            type="text"
            value={form.defaultWarrantyGood}
            onChange={(e) => setField("defaultWarrantyGood", e.target.value)}
            disabled={saving}
            placeholder="e.g. 10-year parts"
            className={inputCls(!!validationErrors.defaultWarrantyGood)}
          />
        </Field>

        <Field
          label="Better Warranty Label"
          error={validationErrors.defaultWarrantyBetter}
        >
          <input
            type="text"
            value={form.defaultWarrantyBetter}
            onChange={(e) => setField("defaultWarrantyBetter", e.target.value)}
            disabled={saving}
            placeholder="e.g. 10-year parts + 2-year labor"
            className={inputCls(!!validationErrors.defaultWarrantyBetter)}
          />
        </Field>

        <Field
          label="Best Warranty Label"
          error={validationErrors.defaultWarrantyBest}
        >
          <input
            type="text"
            value={form.defaultWarrantyBest}
            onChange={(e) => setField("defaultWarrantyBest", e.target.value)}
            disabled={saving}
            placeholder="e.g. 10-year parts + 10-year labor"
            className={inputCls(!!validationErrors.defaultWarrantyBest)}
          />
        </Field>
      </section>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5 space-y-5">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">
          Fees &amp; Tax Defaults
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Default Permit Fee ($)"
            error={validationErrors.permitFeeDefault}
          >
            <input
              type="number"
              min={0}
              step="any"
              value={form.permitFeeDefault}
              onChange={(e) => setField("permitFeeDefault", e.target.value)}
              disabled={saving}
              className={inputCls(!!validationErrors.permitFeeDefault)}
            />
          </Field>

          <Field
            label="Default Tax Rate (%, 0–20)"
            error={validationErrors.taxRatePercent}
          >
            <input
              type="number"
              min={0}
              max={20}
              step="any"
              value={form.taxRatePercent}
              onChange={(e) => setField("taxRatePercent", e.target.value)}
              disabled={saving}
              className={inputCls(!!validationErrors.taxRatePercent)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5 space-y-5">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">
          Proposal Text Defaults
        </h2>

        <Field
          label="Company Proposal Footer"
          error={validationErrors.companyProposalFooter}
        >
          <textarea
            rows={3}
            value={form.companyProposalFooter}
            onChange={(e) => setField("companyProposalFooter", e.target.value)}
            disabled={saving}
            placeholder="Footer text shown on every customer proposal"
            className={inputCls(!!validationErrors.companyProposalFooter)}
          />
        </Field>

        <Field
          label="Proposal Disclaimer"
          error={validationErrors.proposalDisclaimer}
        >
          <textarea
            rows={4}
            value={form.proposalDisclaimer}
            onChange={(e) => setField("proposalDisclaimer", e.target.value)}
            disabled={saving}
            placeholder="Disclaimer text shown on every customer proposal"
            className={inputCls(!!validationErrors.proposalDisclaimer)}
          />
        </Field>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-5 py-2.5 font-semibold text-[#001] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>

        {isDirty && !saving && (
          <button
            onClick={handleReset}
            className="rounded-lg border border-[color:var(--border)] px-4 py-2.5 text-sm font-semibold text-[color:var(--muted)]"
          >
            Reset Changes
          </button>
        )}

        {saveMessage && (
          <p
            className={`text-sm font-medium ${
              saveMessage.type === "success"
                ? "text-emerald-500"
                : "text-rose-500"
            }`}
          >
            {saveMessage.text}
          </p>
        )}
      </div>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3 py-2 bg-white/5 text-[color:var(--text)]",
    hasError
      ? "border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
      : "border-[color:var(--border)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]",
  ].join(" ");
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[color:var(--text)]">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
