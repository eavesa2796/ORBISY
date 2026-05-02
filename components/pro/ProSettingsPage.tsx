"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import ProposalSettingsPage from "@/components/pro/ProposalSettingsPage";

type CompanySettings = {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string;
  logoUrl: string | null;
  brandColor: string | null;
};

type CompanyForm = {
  name: string;
  website: string;
  phone: string;
  city: string;
  state: string;
  logoUrl: string;
  brandColor: string;
};

type ProSettingsPageProps = {
  followUpDays: number;
  maxFollowUps: number;
};

const emptyCompanyForm: CompanyForm = {
  name: "",
  website: "",
  phone: "",
  city: "",
  state: "",
  logoUrl: "",
  brandColor: "#14B8A6",
};

function companyToForm(company: CompanySettings): CompanyForm {
  return {
    name: company.name,
    website: company.website || "",
    phone: company.phone || "",
    city: company.city || "",
    state: company.state || "",
    logoUrl: company.logoUrl || "",
    brandColor: company.brandColor || "#14B8A6",
  };
}

export default function ProSettingsPage({
  followUpDays,
  maxFollowUps,
}: ProSettingsPageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyCompanyForm);
  const [savedForm, setSavedForm] = useState<CompanyForm>(emptyCompanyForm);

  useEffect(() => {
    loadCompany();
  }, []);

  async function loadCompany() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pro/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load workspace settings");
      const loadedCompany = data.company as CompanySettings;
      const nextForm = companyToForm(loadedCompany);
      setCompany(loadedCompany);
      setForm(nextForm);
      setSavedForm(nextForm);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  }

  async function saveCompany() {
    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Company name is required." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pro/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          website: form.website.trim() || null,
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          logoUrl: form.logoUrl.trim() || null,
          brandColor: form.brandColor.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save workspace settings");

      const savedCompany = data.company as CompanySettings;
      const nextForm = companyToForm(savedCompany);
      setCompany(savedCompany);
      setForm(nextForm);
      setSavedForm(nextForm);
      setMessage({ type: "success", text: "Workspace settings saved." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setSaving(false);
    }
  }

  function resetCompany() {
    setForm(savedForm);
    setMessage(null);
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
          Workspace Settings
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[color:var(--text)]">
          Company setup
        </h1>
        <p className="mt-2 max-w-3xl text-[color:var(--muted)]">
          Manage the HVAC company profile, proposal defaults, and follow-up behavior.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text)]">
              Company Profile
            </h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              {company ? `Workspace ID: ${company.id}` : "Loading workspace"}
            </p>
          </div>
          {form.logoUrl && (
            <Image
              src={form.logoUrl}
              alt={`${form.name || "Company"} logo`}
              width={160}
              height={48}
              unoptimized
              className="h-12 max-w-40 rounded-md object-contain"
            />
          )}
        </div>

        {loading ? (
          <p className="mt-5 text-[color:var(--muted)]">Loading company profile...</p>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Company Name">
                <input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  className={inputCls}
                  disabled={saving}
                />
              </Field>
              <Field label="Website">
                <input
                  value={form.website}
                  onChange={(e) => updateForm("website", e.target.value)}
                  className={inputCls}
                  disabled={saving}
                  placeholder="https://example.com"
                />
              </Field>
              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  className={inputCls}
                  disabled={saving}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="City">
                  <input
                    value={form.city}
                    onChange={(e) => updateForm("city", e.target.value)}
                    className={inputCls}
                    disabled={saving}
                  />
                </Field>
                <Field label="State">
                  <input
                    value={form.state}
                    onChange={(e) => updateForm("state", e.target.value)}
                    className={inputCls}
                    disabled={saving}
                  />
                </Field>
              </div>
              <Field label="Logo URL">
                <input
                  value={form.logoUrl}
                  onChange={(e) => updateForm("logoUrl", e.target.value)}
                  className={inputCls}
                  disabled={saving}
                  placeholder="https://example.com/logo.png"
                />
              </Field>
              <Field label="Brand Color">
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={form.brandColor || "#14B8A6"}
                    onChange={(e) => updateForm("brandColor", e.target.value)}
                    className="h-10 w-12 rounded border border-[color:var(--border)] bg-white/5"
                    disabled={saving}
                  />
                  <input
                    value={form.brandColor}
                    onChange={(e) => updateForm("brandColor", e.target.value)}
                    className={inputCls}
                    disabled={saving}
                    placeholder="#14B8A6"
                  />
                </div>
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveCompany}
                disabled={saving || !isDirty}
                className="rounded-lg bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] px-5 py-2.5 font-semibold text-[#001] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Company Profile"}
              </button>
              {isDirty && !saving && (
                <button
                  type="button"
                  onClick={resetCompany}
                  className="rounded-lg border border-[color:var(--border)] px-4 py-2.5 text-sm font-semibold text-[color:var(--muted)]"
                >
                  Reset Changes
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">
          Follow-Up Automation
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ReadOnlyMetric label="Follow-up threshold" value={`${followUpDays} day${followUpDays === 1 ? "" : "s"}`} />
          <ReadOnlyMetric label="Maximum follow-ups" value={String(maxFollowUps)} />
        </div>
      </section>

      <ProposalSettingsPage
        heading="Proposal Defaults"
        description="Default pricing, warranty, financing, tax, and proposal text used when new proposals are created."
        showBreadcrumb={false}
        maxWidthClass="max-w-none"
      />
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[color:var(--border)] bg-white/5 px-3 py-2 text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)] disabled:opacity-60";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-[color:var(--text)]">{label}</span>
      {children}
    </label>
  );
}

function ReadOnlyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-white/5 p-4">
      <p className="text-sm text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[color:var(--text)]">{value}</p>
    </div>
  );
}
